// Shared 6-digit OTP generator — used by registration, resend, and admin
// login 2FA, so all three stay in lockstep with a single format.
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
