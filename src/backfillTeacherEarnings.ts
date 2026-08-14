/**
 * Teacher Earnings Backfill
 *
 * Creates a TeacherEarning record for every historical `Payment` with
 * status "success" that doesn't already have one — computed at TODAY'S
 * configured commission rate, since no commission concept existed before
 * this feature. Safe to re-run: skips payments that already have an
 * earning.
 *
 * Usage:
 *   npm run backfill:earnings
 */

import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db';
import Payment from './models/Payment';
import TeacherEarning from './models/TeacherEarning';
import { getOrCreateConfig } from './controllers/platformConfigController';

const backfill = async () => {
  await connectDB();

  const config = await getOrCreateConfig();
  const commissionRateBps = config.settings.commissionRateBps ?? 3000;
  const commissionRatePct = (commissionRateBps / 100).toFixed(1);

  console.log(`\n💰  Backfilling teacher earnings...`);
  console.log(
    `⚠️   Historical earnings are computed at TODAY'S commission rate (${commissionRatePct}%) — there was no rate before this feature existed, so this is the only honest baseline.\n`,
  );

  const existingPaymentIds = new Set(
    (await TeacherEarning.distinct('paymentId')).map((id) => String(id)),
  );

  const successfulPayments = await Payment.find({ status: 'success' }).lean();

  let created = 0;
  let skipped = 0;

  for (const payment of successfulPayments) {
    if (existingPaymentIds.has(String(payment._id))) {
      skipped++;
      continue;
    }

    const platformFeeCents = Math.round((payment.amountCents * commissionRateBps) / 10000);
    const netEarningCents = payment.amountCents - platformFeeCents;

    await TeacherEarning.create({
      paymentId: payment._id,
      teacherId: payment.teacherId,
      studentId: payment.studentId,
      subjectId: payment.subjectId,
      subscriptionType: payment.subscriptionType,
      grossAmountCents: payment.amountCents,
      commissionRateBps,
      platformFeeCents,
      netEarningCents,
      status: 'available',
    });
    created++;
  }

  console.log(`✅  Backfill complete!`);
  console.log(`   • Created: ${created}`);
  console.log(`   • Skipped (already had an earning): ${skipped}`);
  console.log(`   • Total successful payments scanned: ${successfulPayments.length}\n`);

  process.exit(0);
};

backfill().catch((error) => {
  console.error('❌  Backfill failed:', error);
  process.exit(1);
});
