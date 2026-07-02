import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/apiResponse.js';
import { RoleService } from '../services/role.service.js';
import { publicUserPayload } from '../utils/publicUser.js';
import { EmailService } from './email.service.js';

function generateRandomCode(length = 6) {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function publicUser(profile) {
  const capabilities = Array.isArray(profile.capabilities)
    ? profile.capabilities
    : await RoleService.resolveUserCapabilities(profile);

  return publicUserPayload(profile, capabilities);
}

async function assertActiveProfile(userId) {
  const profile = await prisma.userProfile.findUnique({ where: { id: userId } });

  if (!profile) {
    throw new AppError('Account profile not found. Please contact the Super Admin.', 403);
  }

  if (profile.status === 'pending') {
    throw new AppError('Your account is pending Super Admin approval.', 403);
  }

  if (profile.status === 'disabled') {
    throw new AppError('Your account has been disabled. Please contact the Super Admin.', 403);
  }

  return profile;
}

export const AuthService = {
  async register({ email, password, fullName, department = 'Unassigned', site = 'HQ' }) {
    const normalizedEmail = normalizeEmail(email);
    const existingProfile = await prisma.userProfile.findUnique({ where: { email: normalizedEmail } });
    if (existingProfile) throw new AppError('An account with this email already exists', 409);

    const passwordHash = await bcrypt.hash(password, 10);

    const profile = await prisma.userProfile.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName,
        role: 'viewer',
        status: 'pending',
        department,
        site,
      },
    });

    return {
      user: await publicUser(profile),
      message: 'Account created and pending Super Admin approval.',
    };
  },

  async login({ email, password, trustedDeviceToken }) {
    const normalizedEmail = normalizeEmail(email);
    const profile = await prisma.userProfile.findUnique({ where: { email: normalizedEmail } });
    if (!profile) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, profile.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    await assertActiveProfile(profile.id);

    if (profile.mfaEnabled) {
      if (trustedDeviceToken) {
        try {
          const decoded = jwt.verify(trustedDeviceToken, process.env.JWT_SECRET);
          if (decoded.id === profile.id && decoded.mfaTrusted) {
            const token = jwt.sign({ id: profile.id, email: profile.email }, process.env.JWT_SECRET, {
              expiresIn: '30m',
            });
            return { token, user: await publicUser(profile) };
          }
        } catch (err) {
          // Ignore invalid/expired trusted token
        }
      }

      const code = generateRandomCode();
      const codeHash = await bcrypt.hash(code, 10);
      
      await EmailService.sendMfaOtpEmail(profile.email, code);

      const mfaToken = jwt.sign({ id: profile.id, email: profile.email, mfaPending: true, codeHash }, process.env.JWT_SECRET, {
        expiresIn: '5m',
      });
      return { requiresMfa: true, mfaToken };
    }

    const token = jwt.sign({ id: profile.id, email: profile.email }, process.env.JWT_SECRET, {
      expiresIn: '30m',
    });

    return {
      token,
      user: await publicUser(profile),
    };
  },

  async loginMfa({ mfaToken, code }) {
    let decoded;
    try {
      decoded = jwt.verify(mfaToken, process.env.JWT_SECRET);
    } catch (err) {
      throw new AppError('Invalid or expired MFA token', 401);
    }

    if (!decoded.mfaPending) {
      throw new AppError('Invalid MFA token', 401);
    }

    const profile = await assertActiveProfile(decoded.id);

    if (!profile.mfaEnabled) {
      throw new AppError('MFA is not enabled for this account', 400);
    }

    if (!decoded.codeHash) {
      throw new AppError('Invalid MFA token format', 400);
    }

    const isMatch = await bcrypt.compare(code, decoded.codeHash);
    if (!isMatch) {
      throw new AppError('Invalid MFA code', 401);
    }

    const token = jwt.sign({ id: profile.id, email: profile.email }, process.env.JWT_SECRET, {
      expiresIn: '30m',
    });

    const trustedDeviceToken = jwt.sign({ id: profile.id, mfaTrusted: true }, process.env.JWT_SECRET, {
      expiresIn: '30m',
    });

    return {
      token,
      trustedDeviceToken,
      user: await publicUser(profile),
    };
  },

  async me(user) {
    return publicUser(user);
  },

  async changePassword(user, { currentPassword, newPassword }) {
    const profile = await prisma.userProfile.findUnique({ where: { id: user.id } });
    if (!profile) throw new AppError('User not found', 404);

    const isMatch = await bcrypt.compare(currentPassword, profile.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 401);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.userProfile.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    return { changed: true };
  },

  async setupMfa(user) {
    const profile = await prisma.userProfile.findUnique({ where: { id: user.id } });
    if (profile.mfaEnabled) {
      throw new AppError('MFA is already enabled', 400);
    }

    const code = generateRandomCode();
    const codeHash = await bcrypt.hash(code, 10);

    await EmailService.sendMfaOtpEmail(profile.email, code);

    const setupToken = jwt.sign({ id: profile.id, codeHash, mfaSetup: true }, process.env.JWT_SECRET, {
      expiresIn: '5m',
    });

    return { setupToken };
  },

  async verifyMfa(user, { setupToken, code }) {
    let decoded;
    try {
      decoded = jwt.verify(setupToken, process.env.JWT_SECRET);
    } catch (err) {
      throw new AppError('Invalid or expired setup token', 401);
    }

    if (!decoded.mfaSetup || decoded.id !== user.id) {
      throw new AppError('Invalid setup token', 401);
    }

    const isMatch = await bcrypt.compare(code, decoded.codeHash);
    if (!isMatch) {
      throw new AppError('Invalid verification code', 400);
    }

    await prisma.userProfile.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
      },
    });

    return { success: true, message: 'MFA enabled successfully' };
  },

  async requestDisableMfa(user) {
    const profile = await prisma.userProfile.findUnique({ where: { id: user.id } });
    if (!profile.mfaEnabled) {
      throw new AppError('MFA is not enabled', 400);
    }

    const code = generateRandomCode();
    const codeHash = await bcrypt.hash(code, 10);

    await EmailService.sendMfaOtpEmail(profile.email, code);

    const disableToken = jwt.sign({ id: profile.id, codeHash, mfaDisable: true }, process.env.JWT_SECRET, {
      expiresIn: '5m',
    });

    return { disableToken };
  },

  async disableMfa(user, { disableToken, code }) {
    const profile = await prisma.userProfile.findUnique({ where: { id: user.id } });
    if (!profile.mfaEnabled) {
      throw new AppError('MFA is not enabled', 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(disableToken, process.env.JWT_SECRET);
    } catch (err) {
      throw new AppError('Invalid or expired disable token', 401);
    }

    if (!decoded.mfaDisable || decoded.id !== user.id) {
      throw new AppError('Invalid disable token', 401);
    }

    const isMatch = await bcrypt.compare(code, decoded.codeHash);
    if (!isMatch) {
      throw new AppError('Invalid verification code', 400);
    }

    await prisma.userProfile.update({
      where: { id: user.id },
      data: {
        mfaSecret: null,
        mfaEnabled: false,
      },
    });

    return { success: true, message: 'MFA disabled successfully' };
  },

  async bootstrapSuperAdmin() {
    const email = normalizeEmail(env.seedSuperAdmin.email);
    const password = env.seedSuperAdmin.password;

    if (!email || !password) return;

    let profile = await prisma.userProfile.findUnique({ where: { email } });
    
    const passwordHash = await bcrypt.hash(password, 10);

    if (profile) {
      if (profile.role !== 'super_admin' || profile.status !== 'active') {
        await prisma.userProfile.update({
          where: { id: profile.id },
          data: {
            role: 'super_admin',
            status: 'active',
            passwordHash,
            approvedAt: profile.approvedAt || new Date(),
          },
        });
      } else {
        await prisma.userProfile.update({
          where: { id: profile.id },
          data: { passwordHash },
        });
      }
      return;
    }

    await prisma.userProfile.create({
      data: {
        email,
        passwordHash,
        fullName: env.seedSuperAdmin.fullName,
        role: 'super_admin',
        status: 'active',
        department: env.seedSuperAdmin.department,
        site: env.seedSuperAdmin.site,
        approvedAt: new Date(),
      },
    });
  },
};
