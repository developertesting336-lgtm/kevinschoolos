# Email Setup - To Be Implemented Later

## Current Status
Email functionality has been **deferred for future implementation**.

**Removed:**
- ✅ `nodemailer` package from package.json
- ✅ `@types/nodemailer` package from package.json  
- ✅ SMTP credentials from `.env.local`

---

## When Ready to Implement Email:

### 1. Add SMTP Credentials to `.env.local`
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="SchoolOS <no-reply@schoolos.app>"
```

### 2. Install nodemailer
```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 3. Create Email Service (`lib/email.ts`)
```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
}
```

### 4. Email Use Cases to Implement
- [ ] Password Reset Emails
- [ ] Account Confirmation / Email Verification
- [ ] Payment Notifications & Receipts
- [ ] Admin Alerts & Notifications
- [ ] Parent Communications
- [ ] Enrollment Confirmations
- [ ] Invoice & Payment Reminders

---

## Security Notes
- Store SMTP credentials in `.env.local` (NEVER commit to Git)
- Use Gmail App Passwords (not personal password)
- Rotate credentials every 90 days
- Keep `.env.local` in `.gitignore`

---

**Last Updated:** 2026-09-07  
**Status:** Deferred - Will implement when ready
