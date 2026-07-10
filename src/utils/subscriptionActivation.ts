import mongoose from 'mongoose';
import Payment, { IPayment } from '../models/Payment';
import Subscription from '../models/Subscription';
import TeacherSchedule from '../models/TeacherSchedule';

// Shared by the Paymob webhook and the manual-payment approval flow — both
// ultimately produce a "success" Payment for a subject/unit purchase, and
// this is the one place that turns that into an actual Subscription
// (+ auto-enrollment), so the two paths can't drift apart.
export async function activateSubjectOrUnitSubscription(
  session: mongoose.ClientSession,
  payment: IPayment
): Promise<void> {
  const planDays = payment.planDays!;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + planDays * 24 * 60 * 60 * 1000);

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
    const newExpiry =
      existingSub.expiresAt > now
        ? new Date(existingSub.expiresAt.getTime() + planDays * 24 * 60 * 60 * 1000)
        : expiresAt;

    await Subscription.findByIdAndUpdate(
      existingSub._id,
      {
        status: 'active',
        expiresAt: newExpiry,
        paymentId: payment._id,
        plan: payment.plan,
        planDays: payment.planDays,
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
          plan: payment.plan,
          planDays: payment.planDays,
          startsAt: now,
          expiresAt,
          autoRenew: false,
        },
      ],
      { session }
    );
    subscriptionId = newSub._id as mongoose.Types.ObjectId;

    // AUTO-ENROLL: Add student to teacher's schedules for this subject
    const schedules = await TeacherSchedule.find({
      teacherId: payment.teacherId,
      subjectId: payment.subjectId,
      isActive: true,
    });

    for (const schedule of schedules) {
      if (!schedule.enrolledStudents.includes(payment.studentId)) {
        if (schedule.enrolledStudents.length < schedule.maxStudents) {
          schedule.enrolledStudents.push(payment.studentId);
          await schedule.save({ session });
        }
      }
    }
  }

  await Payment.findByIdAndUpdate(payment._id, { subscriptionId }, { session });
}
