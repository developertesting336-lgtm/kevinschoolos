import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587/STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "SchoolOS <no-reply@schoolos.app>",
    to,
    subject: "Reset your SchoolOS password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px;">
        <h2 style="color: #333333; margin-bottom: 16px;">Reset your SchoolOS password</h2>
        <p style="color: #555555; font-size: 15px; line-height: 1.5;">We received a request to reset your password for your SchoolOS account.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Click here to reset your password</a>
        </p>
        <p style="color: #777777; font-size: 13px;">This link will expire in 30 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;" />
        <p style="color: #999999; font-size: 12px;">If you didn't request this password reset, you can safely ignore this email.</p>
      </div>
    `,
  });
}
