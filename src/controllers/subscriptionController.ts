import { Request, Response } from 'express';
import Subscription from '../models/Subscription';

export const getMySubscription = async (req: any, res: Response) => {
  try {
    const subscription = await Subscription.findOne({ studentId: req.user._id });
    res.json(subscription || null);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSubscriptions = async (_req: Request, res: Response) => {
  try {
    const subscriptions = await Subscription.find({}).populate('studentId', 'name email');
    res.json(subscriptions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const activateSubscription = async (req: Request, res: Response) => {
  try {
    const { studentId, plan } = req.body;
    if (!studentId || !plan) {
      res.status(400).json({ message: 'Missing subscription details' });
      return;
    }

    const subscription = await Subscription.findOne({ studentId });
    if (subscription) {
      subscription.plan = plan;
      subscription.status = 'Active';
      subscription.startDate = new Date();
      subscription.endDate = undefined;
      await subscription.save();
      res.json(subscription);
      return;
    }

    const created = await Subscription.create({
      studentId,
      plan,
      status: 'Active',
      startDate: new Date(),
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      res.status(400).json({ message: 'Missing student id' });
      return;
    }

    const subscription = await Subscription.findOne({ studentId });
    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    subscription.status = 'Cancelled';
    subscription.endDate = new Date();
    await subscription.save();

    res.json(subscription);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
