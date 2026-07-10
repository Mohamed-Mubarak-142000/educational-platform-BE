import mongoose from 'mongoose';
import Unit from '../models/Unit';

export const PLAN_CONFIG: Record<'Monthly' | 'Quarterly' | 'Yearly', { days: number; factor: number }> = {
  Monthly: { days: 30, factor: 1.0 },
  Quarterly: { days: 90, factor: 2.4 },
  Yearly: { days: 365, factor: 8.0 },
};

export type SubscriptionPlanName = keyof typeof PLAN_CONFIG;

// Shared by the Paymob checkout, the manual-payment quote, and manual-payment
// request creation — one place computes "how much does this cost", so the
// three paths can never quietly drift apart.
export async function getSubjectOrUnitBasePriceEGP(params: {
  subscriptionType: 'subject' | 'unit';
  unitId?: string;
  subjectId: string;
  gradeId: string;
  assignmentId: mongoose.Types.ObjectId | string;
}): Promise<number> {
  if (params.subscriptionType === 'unit') {
    const unit = await Unit.findById(params.unitId).select('price subjectId gradeId');
    if (!unit) {
      throw new Error('Unit not found');
    }
    if (
      String(unit.subjectId) !== String(params.subjectId) ||
      String(unit.gradeId) !== String(params.gradeId)
    ) {
      throw new Error('Unit does not belong to this subject/grade');
    }
    return Number(unit.price) || 50; // fallback 50 EGP
  }

  const units = await Unit.find({
    assignmentId: params.assignmentId,
    isPublished: true,
  }).select('price');
  const total = units.reduce((sum, u) => sum + (Number(u.price) || 0), 0);
  return total > 0 ? total : 300; // fallback 300 EGP
}

export function computeAmountCents(
  basePriceEGP: number,
  plan: SubscriptionPlanName
): { amountCents: number; planDays: number } {
  const { days, factor } = PLAN_CONFIG[plan];
  return { amountCents: Math.round(basePriceEGP * factor * 100), planDays: days };
}
