# Multi-Factor Authentication (MFA) Setup Guide

This document explains how the Email-based MFA is configured in the BigOutsource EIMS system, both for local development and for production.

## 1. Local Development (Testing)

For local development, we use **Mailpit**, a fake local SMTP server included in the Docker setup. This allows you to test the MFA email flow without needing a real email account or password.

### Configuration
Your `backend/.env` file should have the following settings:
```env
# Local Mailpit SMTP Settings
SMTP_HOST=mailpit
SMTP_PORT=1025
```

### How to Test
1. Make sure your docker containers are running (`docker compose up -d`).
2. Trigger the MFA setup or login process in the frontend.
3. Open your browser and go to the Mailpit web interface: [http://localhost:8025](http://localhost:8025)
4. You will instantly see the intercepted email containing your 6-digit OTP code!

---

## 2. Production Setup (Using Outlook)

When you are ready to send real emails to real users, you need to configure the backend to use an actual SMTP server (like Microsoft Outlook/Office 365).

### Step 1: Generate an App Password
Microsoft disables basic login for scripts by default. You must use an App Password:
1. Log into your [Microsoft Account Security settings](https://account.microsoft.com/security).
2. Enable **Two-step verification**.
3. Under the **App passwords** section, generate a new app password. 

### Step 2: Update the Environment Variables
Update your `backend/.env` file with your real credentials:
```env
# Outlook SMTP Settings
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.ph  # Your real email
SMTP_PASS=your-16-char-app-password # The generated App Password
```

### Step 3: Update `email.service.js`
In `backend/src/services/email.service.js`, update the transporter to support TLS and authenticate with Microsoft:

```javascript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // Must be false for port 587 (uses STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: 'SSLv3', // Required by Office365
    rejectUnauthorized: false
  }
});
```

*Note: The `from` field in your `transporter.sendMail()` call MUST match the `SMTP_USER` exactly, otherwise Microsoft will block the email to prevent spoofing.*
