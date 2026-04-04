/**
 * Super Admin Seeder
 *
 * Creates a Super Admin account if one does not already exist.
 * Safe to re-run: uses upsert so no duplicate users are ever created.
 *
 * Usage:
 *   npm run seed:admin
 *
 * Default credentials:
 *   Email   : admin@academix.com
 *   Password: Admin@123456
 */

import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db';
import User from './models/User';

const ADMIN_EMAIL = 'admin@academix.com';
const ADMIN_PASSWORD = 'Admin@123456';
const ADMIN_NAME = 'Super Admin';

const seed = async () => {
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
    mustChangePassword: false,
  });

  console.log(`\n✔  Super Admin created successfully!`);
  console.log(`   Email   : ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}\n`);
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seeder error:', err);
  process.exit(1);
});
