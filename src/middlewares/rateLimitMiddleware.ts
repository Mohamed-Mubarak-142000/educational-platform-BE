import rateLimit from "express-rate-limit";

// General ceiling for the whole API — generous enough for normal usage,
// just enough to blunt scripted abuse.
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

// Tighter limiter for sensitive, unauthenticated auth endpoints
// (login/register/OTP/forgot-password) — these are the ones brute-force and
// enumeration attacks actually target.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

// The teacher-application file upload has no authentication to lean on
// (applicants don't have accounts yet) — cap it hard per IP so it can't be
// abused as free/anonymous file storage.
export const applicationUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many uploads. Please try again later." },
});
