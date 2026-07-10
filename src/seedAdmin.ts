/**
 * Super Admin Seeder
 *
 * Creates a Super Admin account if one does not already exist.
 * Safe to re-run: uses upsert so no duplicate users are ever created.
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='...' npm run seed:admin
 *
 * There is no built-in default email/password — both must be supplied via
 * environment variables so a fixed, publicly-known credential can never end
 * up live on a real deployment.
 */

import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db';
import User from './models/User';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Super Admin';

const seed = async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      '\n✖  Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD environment variables before running this seeder.\n'
    );
    process.exit(1);
  }

  if (ADMIN_PASSWORD.length < 12) {
    console.error('\n✖  SEED_ADMIN_PASSWORD must be at least 12 characters.\n');
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: ADMIN_EMAIL });

  if (existing) {
    console.log(`\n✔  Super Admin already exists (${ADMIN_EMAIL}). Nothing was changed.\n`);
    process.exit(0);
  }

  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'Admin',
    status: 'Active',
    isVerified: true,
    mustChangePassword: true,
  });

  console.log(`\n✔  Super Admin created successfully for ${ADMIN_EMAIL}.`);
  console.log(`   They will be required to change their password on first login.\n`);
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seeder error:', err);
  process.exit(1);
});
