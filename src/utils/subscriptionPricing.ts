import mongoose from 'mongoose';
import Unit from '../models/Unit';

// Shared by the manual-payment quote and manual-payment request creation —
// one place computes "how much does this cost", so the two paths can never
// quietly drift apart.
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

// One-time purchase price, in cents — no plan/duration multiplier.
export function computeAmountCents(basePriceEGP: number): number {
  return Math.round(basePriceEGP * 100);
}
