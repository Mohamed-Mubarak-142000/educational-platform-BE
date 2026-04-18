import { Request, Response } from 'express';
import Payment from '../models/Payment';

export const submitPayment = async (req: any, res: Response) => {
  try {
    if (req.user.role !== 'Student') {
      res.status(403).json({ message: 'Only students can submit payments' });
      return;
    }

    const { plan, amount, method, screenshotUrl } = req.body;

    if (!plan || !method || !screenshotUrl) {
      res.status(400).json({ message: 'Missing payment details' });
      return;
    }

    const payment = await Payment.create({
      studentId: req.user._id,
      plan,
      amount: Number(amount) || 0,
      method,
      screenshotUrl,
      status: 'Pending',
    });

    res.status(201).json(payment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPayments = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const payments = await Payment.find(filter)
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyPayments = async (req: any, res: Response) => {
  try {
    const payments = await Payment.find({ studentId: req.user._id }).sort({ createdAt: -1 });
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const approvePayment = async (req: any, res: Response) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    payment.status = 'Approved';
    payment.reviewedBy = req.user._id;
    payment.reviewedAt = new Date();
    await payment.save();

    res.json({ message: 'Payment approved', payment });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectPayment = async (req: any, res: Response) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    payment.status = 'Rejected';
    payment.reviewedBy = req.user._id;
    payment.reviewedAt = new Date();
    await payment.save();

    res.json({ message: 'Payment rejected', payment });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
