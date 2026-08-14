# Educational Platform - Backend API

Node.js/Express REST API for the Educational Platform with real-time features using Socket.IO.

## 🚀 Features

- User authentication & authorization (JWT)
- Role-based access control (Admin, Teacher, Student)
- Course & lesson management
- Quiz system with auto-grading
- Live classroom with video/chat
- Manual payments (InstaPay / Vodafone Cash / Fawry) with admin review
- One-time purchase = lifetime access to a subject/unit
- File upload to Cloudinary
- Email notifications
- Real-time features with Socket.IO
- Automated cron job for stale pending-payment cleanup

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## 🔧 Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/Mohamed-Mubarak-142000/educational-platform-BE.git
   cd educational-platform-BE
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Setup environment variables**:

   Copy `.env.example` to `.env` and fill in your values:

   ```bash
   cp .env.example .env
   ```

   Required environment variables:
   - `MONGO_URI` - MongoDB connection string
   - `JWT_SECRET` - Secret for JWT tokens
   - `CLOUDINARY_*` - Cloudinary credentials
   - `EMAIL_*` - Email service configuration
   - `FRONTEND_URL` - Frontend URL for CORS

4. **Start development server**:

   ```bash
   npm run dev
   ```

   Server will start on `http://localhost:5001`

## 🏗️ Project Structure

```
src/
├── config/          # Database & service configurations
├── controllers/     # Route controllers
├── jobs/            # Cron jobs (subscription checks)
├── middlewares/     # Auth, error handling, validation
├── models/          # MongoDB schemas
├── routes/          # API routes
├── services/        # Business logic & Socket.IO
├── types/           # TypeScript type definitions
├── utils/           # Helper functions
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## 📚 API Documentation

### Base URL

```
Development: http://localhost:5001/api
Production: https://your-domain.com/api
```

### Authentication

All protected routes require JWT token in header:

```
Authorization: Bearer <token>
```

### Main Endpoints

#### Users

- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/forgot-password` - Request password reset
- `POST /api/users/reset-password/:token` - Reset password

#### Lessons

- `GET /api/lessons` - Get all lessons (filtered by user)
- `GET /api/lessons/:id` - Get lesson by ID
- `POST /api/lessons` - Create lesson (Admin/Teacher)
- `PUT /api/lessons/:id` - Update lesson
- `DELETE /api/lessons/:id` - Delete lesson

#### Quizzes

- `GET /api/quizzes` - Get quizzes
- `POST /api/quizzes` - Create quiz
- `POST /api/quizzes/:id/submit` - Submit quiz answers

#### Subscriptions

- `GET /api/subscriptions/mine` - Get the student's active (lifetime) subscriptions

#### Payments

- `GET /api/payments/quote` - Price quote for a subject/unit purchase
- `GET /api/payments/my-history` - Student's own payment history
- `GET /api/payments/status/:id` - Check a payment's status
- `GET /api/payments/admin/analytics` - Admin revenue analytics
- `POST /api/payments/:id/refund` - Admin refund (internal bookkeeping only)

#### Manual Payments (InstaPay / Vodafone Cash / Fawry)

- `POST /api/manual-payments/upload` - Upload a payment proof screenshot
- `POST /api/manual-payments` - Submit a manual payment request
- `GET /api/manual-payments/mine` - Student's own manual payment requests
- `GET /api/manual-payments` - Admin review queue
- `POST /api/manual-payments/:id/approve` - Admin approves → grants lifetime access
- `POST /api/manual-payments/:id/reject` - Admin rejects

#### Live Classroom

- `POST /api/live-classroom/create` - Create session
- `GET /api/live-classroom/:id` - Get session details
- `POST /api/live-classroom/:id/join` - Join session
- WebSocket events for real-time interaction

## 🧪 Database Seeding

Populate database with initial data:

```bash
# Seed all data
npm run seed

# Seed specific data
npm run seed:admin      # Create admin user
npm run seed:stages     # Create education stages/grades
npm run seed:subjects   # Create subjects
```

## 🏭 Production Build

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

## 🔒 Security

- Passwords hashed with bcrypt
- JWT for stateless authentication
- CORS configured for specific origins
- Input validation on all endpoints
- Rate limiting recommended (add express-rate-limit)
- Environment variables for sensitive data

## 🚀 Deployment

See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

**Quick Deploy to Render:**

1. Push code to GitHub
2. Connect repo to Render
3. Set environment variables
4. Deploy!

## 📊 Monitoring

- View logs on hosting platform dashboard
- Monitor MongoDB Atlas metrics
- Track API response times
- Set up error tracking (Sentry recommended)

## 🧹 Code Quality

```bash
# Lint code (if ESLint configured)
npm run lint

# Format code (if Prettier configured)
npm run format

# Type check
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 Environment Variables Reference

| Variable                | Description           | Example                       |
| ----------------------- | --------------------- | ----------------------------- |
| `PORT`                  | Server port           | `5001`                        |
| `NODE_ENV`              | Environment           | `development` or `production` |
| `MONGO_URI`             | MongoDB connection    | `mongodb+srv://...`           |
| `JWT_SECRET`            | JWT signing key       | `your_secret_key`             |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your_cloud`                  |
| `CLOUDINARY_API_KEY`    | Cloudinary API key    | `123456789`                   |
| `CLOUDINARY_API_SECRET` | Cloudinary secret     | `secret123`                   |
| `EMAIL_HOST`            | SMTP host             | `smtp.gmail.com`              |
| `EMAIL_PORT`            | SMTP port             | `587`                         |
| `EMAIL_USER`            | Email address         | `your@email.com`              |
| `EMAIL_PASSWORD`        | Email app password    | `app_password`                |
| `FRONTEND_URL`          | Frontend URL for CORS | `http://localhost:5173`       |

## 📞 Support

For issues or questions:

- Open a GitHub issue
- Contact: eleviodev@gmail.com

## 📄 License

MIT License

---

**Built with** ❤️ **by the Educational Platform Team**
