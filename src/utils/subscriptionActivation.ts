import mongoose from 'mongoose';
import Payment, { IPayment } from '../models/Payment';
import Subscription, { LIFETIME_EXPIRY } from '../models/Subscription';
import TeacherSchedule from '../models/TeacherSchedule';

// Shared by the manual-payment approval flow — turns a successful Payment
// into a lifetime Subscription (+ auto-enrollment into the teacher's
// schedule) exactly once.
export async function activateSubjectOrUnitSubscription(
  session: mongoose.ClientSession,
  payment: IPayment
): Promise<void> {
  const filter = {
    studentId: payment.studentId,
    teacherId: payment.teacherId,
    subjectId: payment.subjectId,
    gradeId: payment.gradeId,
    unitId: payment.subscriptionType === 'unit' ? payment.unitId : undefined,
    type: payment.subscriptionType,
  };

  const existingSub = await Subscription.findOne(filter).session(session);
  let subscriptionId: mongoose.Types.ObjectId;

  if (existingSub) {
    // Already owns this content for life (e.g. re-purchase after a refund) —
    // just reactivate it and point it at this payment.
    await Subscription.findByIdAndUpdate(
      existingSub._id,
      {
        status: 'active',
        paymentId: payment._id,
        expiresAt: LIFETIME_EXPIRY,
        revokedBy: undefined,
        revokedAt: undefined,
        revokedReason: undefined,
      },
      { session }
    );
    subscriptionId = existingSub._id as mongoose.Types.ObjectId;
  } else {
    const [newSub] = await Subscription.create(
      [
        {
          studentId: payment.studentId,
          teacherId: payment.teacherId,
          subjectId: payment.subjectId,
          gradeId: payment.gradeId,
          unitId: payment.subscriptionType === 'unit' ? payment.unitId : undefined,
          type: payment.subscriptionType,
          status: 'active',
          paymentId: payment._id,
          startsAt: new Date(),
          expiresAt: LIFETIME_EXPIRY,
        },
      ],
      { session }
    );
    subscriptionId = newSub._id as mongoose.Types.ObjectId;
  }

  // AUTO-ENROLL: add the student to the teacher's schedules for this subject
  // (idempotent — safe to run again on reactivation too).
  const schedules = await TeacherSchedule.find({
    teacherId: payment.teacherId,
    subjectId: payment.subjectId,
    isActive: true,
  }).session(session);

  for (const schedule of schedules) {
    if (!schedule.enrolledStudents.includes(payment.studentId)) {
      if (schedule.enrolledStudents.length < schedule.maxStudents) {
        schedule.enrolledStudents.push(payment.studentId);
        await schedule.save({ session });
      }
    }
  }

  await Payment.findByIdAndUpdate(payment._id, { subscriptionId }, { session });
}
