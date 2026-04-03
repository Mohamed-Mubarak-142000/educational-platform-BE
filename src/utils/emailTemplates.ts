type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

const wrapHtml = (title: string, body: string) => {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f8fafc;color:#0f172a;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
        ${body}
      </div>
      <p style="font-size:12px;color:#64748b;margin-top:16px;">Academix • This email was sent automatically. Please do not reply.</p>
    </div>
  </body>
</html>`;
};

export const otpTemplate = (name: string, otp: string): EmailTemplate => {
  const subject = 'Confirm your account - Academix';
  const text = `Hello ${name},\n\nYour confirmation code is ${otp}. It will expire in 10 minutes.\n\nIf you did not request this, you can ignore this email.`;
  const html = wrapHtml(
    subject,
    `<h2 style="margin:0 0 12px;">Confirm your account</h2>
     <p style="margin:0 0 16px;">Hello ${name},</p>
     <p style="margin:0 0 12px;">Use the code below to verify your account. It expires in 10 minutes.</p>
     <div style="font-size:24px;font-weight:700;letter-spacing:4px;margin:16px 0;color:#2563eb;">${otp}</div>
     <p style="margin:0;">If you did not request this, you can ignore this email.</p>`
  );
  return { subject, text, html };
};

export const teacherInviteTemplate = (name: string, email: string, tempPassword: string): EmailTemplate => {
  const subject = 'Your teacher account is ready - Academix';
  const text = `Hello ${name},\n\nAn admin created your teacher account.\n\nLogin email: ${email}\nTemporary password: ${tempPassword}\n\nPlease log in and change your password immediately.`;
  const html = wrapHtml(
    subject,
    `<h2 style="margin:0 0 12px;">Your teacher account is ready</h2>
     <p style="margin:0 0 12px;">Hello ${name},</p>
     <p style="margin:0 0 12px;">An admin created your teacher account.</p>
     <div style="background:#f1f5f9;border-radius:10px;padding:12px 16px;margin:12px 0;">
       <p style="margin:0 0 6px;"><strong>Login email:</strong> ${email}</p>
       <p style="margin:0;"><strong>Temporary password:</strong> ${tempPassword}</p>
     </div>
     <p style="margin:0;">Please log in and change your password immediately.</p>`
  );
  return { subject, text, html };
};

export const studentInviteTemplate = (name: string, email: string, tempPassword: string): EmailTemplate => {
  const subject = 'Your student account is ready - Academix';
  const text = `Hello ${name},\n\nAn admin created your student account.\n\nLogin email: ${email}\nTemporary password: ${tempPassword}\n\nPlease log in and change your password immediately.`;
  const html = wrapHtml(
    subject,
    `<h2 style="margin:0 0 12px;">Your student account is ready</h2>
     <p style="margin:0 0 12px;">Hello ${name},</p>
     <p style="margin:0 0 12px;">An admin created your student account.</p>
     <div style="background:#f1f5f9;border-radius:10px;padding:12px 16px;margin:12px 0;">
       <p style="margin:0 0 6px;"><strong>Login email:</strong> ${email}</p>
       <p style="margin:0;"><strong>Temporary password:</strong> ${tempPassword}</p>
     </div>
     <p style="margin:0;">Please log in and change your password immediately.</p>`
  );
  return { subject, text, html };
};

export const resetPasswordTemplate = (name: string, resetUrl: string): EmailTemplate => {
  const subject = 'Reset your password - Academix';
  const text = `Hello ${name},\n\nYou requested a password reset. Use the link below to set a new password:\n${resetUrl}\n\nThis link expires in 10 minutes. If you did not request this, you can ignore this email.`;
  const html = wrapHtml(
    subject,
    `<h2 style="margin:0 0 12px;">Reset your password</h2>
     <p style="margin:0 0 12px;">Hello ${name},</p>
     <p style="margin:0 0 16px;">You requested a password reset. Click the button below to set a new password. This link expires in 10 minutes.</p>
     <p style="margin:0 0 16px;"><a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;">Reset password</a></p>
     <p style="margin:0;">If you did not request this, you can ignore this email.</p>`
  );
  return { subject, text, html };
};
