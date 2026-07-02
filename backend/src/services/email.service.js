import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Setup transporter for local SMTP (e.g. Mailpit/Mailhog for snappymail)
// Adjust the default host/port if snappymail is configured differently
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailpit',
  port: parseInt(process.env.SMTP_PORT || '1025', 10),
  secure: false, // true for 465, false for other ports
  // auth: {
  //   user: process.env.SMTP_USER,
  //   pass: process.env.SMTP_PASS,
  // },
});

export const EmailService = {
  async sendMfaOtpEmail(toEmail, code) {
    try {
      const info = await transporter.sendMail({
        from: '"BigOutsource EIMS" <no-reply@bigoutsource.com>',
        to: toEmail,
        subject: 'Your MFA Verification Code',
        text: `Your MFA verification code is: ${code}\nThis code is valid for 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>MFA Verification</h2>
            <p>Your verification code is:</p>
            <h1 style="color: #4F46E5; letter-spacing: 2px;">${code}</h1>
            <p>This code is valid for 5 minutes.</p>
          </div>
        `,
      });
      console.log('MFA email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Failed to send MFA email:', error);
      throw new Error('Failed to send verification email');
    }
  },
};
