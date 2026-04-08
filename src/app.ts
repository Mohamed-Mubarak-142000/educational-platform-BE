import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { notFound, errorHandler } from './middlewares/errorMiddleware';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('API is running...');
});

import userRoutes from './routes/userRoutes';
import uploadRoutes from './routes/uploadRoutes';
import courseRoutes from './routes/courseRoutes';
import lessonRoutes from './routes/lessonRoutes';
import quizRoutes from './routes/quizRoutes';
import discussionRoutes from './routes/discussionRoutes';
import paymentRoutes from './routes/paymentRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import stageRoutes from './routes/stageRoutes';
import subjectRoutes from './routes/subjectRoutes';
import unitRoutes from './routes/unitRoutes';
import teacherApplicationRoutes from './routes/teacherApplicationRoutes';
import teacherScheduleRoutes from './routes/teacherScheduleRoutes';

// Use Routes here
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/teacher-applications', teacherApplicationRoutes);
app.use('/api/teacher-schedules', teacherScheduleRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
