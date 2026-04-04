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
  <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f0f4ff;color:#0f172a;">
    <div style="max-width:580px;margin:0 auto;padding:32px 20px;">
      <!-- Header / Branding -->
      <div style="background:linear-gradient(135deg,#2563eb 0%,#4f46e5 100%);border-radius:12px 12px 0 0;padding:24px 28px;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;background:#ffffff33;border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#fff"/>
            </svg>
          </div>
          <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Academix</span>
        </div>
      </div>
      <!-- Body -->
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px;">
        ${body}
      </div>
      <p style="font-size:12px;color:#64748b;margin-top:16px;text-align:center;">© Academix · This email was sent automatically. Please do not reply.</p>
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

export const teacherInviteTemplate = (name: string, email: string, tempPassword: string, subject?: string): EmailTemplate => {
  const subject_ = 'Your teacher account is ready - Academix';
  const text = `Hello ${name},\n\nWelcome to Academix! An admin has created your teacher account.\n\nLogin email: ${email}\nPassword: ${tempPassword}${subject ? `\nAssigned subject: ${subject}` : ''}\n\nFor your security, please log in and update your password from your profile page.\n\nBest regards,\nThe Academix Team`;
  const html = wrapHtml(
    subject_,
    `<h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Welcome to Academix, ${name}! 🎓</h2>
     <p style="margin:0 0 16px;color:#475569;line-height:1.6;">Your teacher account has been created by an administrator. You can now log in using the credentials below.</p>
     <div style="background:#f8faff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin:16px 0;">
       <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Account Details</p>
       <table style="width:100%;border-collapse:collapse;">
         <tr><td style="padding:5px 0;color:#64748b;font-size:14px;width:120px;">Name</td><td style="padding:5px 0;color:#1e293b;font-size:14px;font-weight:600;">${name}</td></tr>
         <tr><td style="padding:5px 0;color:#64748b;font-size:14px;">Email</td><td style="padding:5px 0;color:#1e293b;font-size:14px;font-weight:600;">${email}</td></tr>
         <tr><td style="padding:5px 0;color:#64748b;font-size:14px;">Password</td><td style="padding:5px 0;color:#1e293b;font-size:14px;font-weight:600;letter-spacing:1px;">${tempPassword}</td></tr>
         ${subject ? `<tr><td style="padding:5px 0;color:#64748b;font-size:14px;">Subject</td><td style="padding:5px 0;color:#1e293b;font-size:14px;font-weight:600;">${subject}</td></tr>` : ''}
       </table>
     </div>
     <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin:16px 0;display:flex;align-items:flex-start;gap:8px;">
       <span style="font-size:18px;">🔒</span>
       <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;"><strong>Security reminder:</strong> For your account's security, please log in and update your password from your profile page as soon as possible.</p>
     </div>
     <p style="margin:0;font-size:13px;color:#64748b;">If you have any questions, please contact your administrator.</p>`
  );
  return { subject: subject_, text, html };
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
