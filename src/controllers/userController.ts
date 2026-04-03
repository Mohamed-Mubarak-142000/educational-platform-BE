import { Request, Response } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import generateToken from '../utils/generateToken';
import sendEmail from '../utils/sendEmail';
import { otpTemplate, resetPasswordTemplate, teacherInviteTemplate, studentInviteTemplate } from '../utils/emailTemplates';

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      name,
      email,
      password,
      role: 'Student',
      otp,
      otpExpires,
      otpLastSent: new Date(),
    });

    if (user) {
      const template = otpTemplate(user.name, otp);
      try {
        await sendEmail({
          email: user.email,
          subject: template.subject,
          message: template.text,
          html: template.html,
        });
      } catch (error) {
        console.error('Email could not be sent', error);
      }

      res.status(201).json({
        message: 'User registered. Please check email for OTP.',
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resend OTP
// @route   POST /api/users/resend-otp
// @access  Public
export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ message: 'User already verified' });
      return;
    }

    const cooldownMs = 60 * 1000;
    if (user.otpLastSent && Date.now() - user.otpLastSent.getTime() < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - (Date.now() - user.otpLastSent.getTime())) / 1000);
      res.status(429).json({ message: `Please wait ${remaining} seconds before requesting a new OTP.`, retryAfterSeconds: remaining });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.otpLastSent = new Date();
    await user.save();

    const template = otpTemplate(user.name, otp);
    try {
      await sendEmail({
        email: user.email,
        subject: template.subject,
        message: template.text,
        html: template.html,
      });
    } catch (error) {
      console.error('Email could not be sent', error);
    }

    res.json({ message: 'OTP resent. Please check your email.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP
// @route   POST /api/users/verify
// @access  Public
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ message: 'User already verified' });
      return;
    }

    if (user.otp !== otp || (user.otpExpires && user.otpExpires < new Date())) {
      res.status(400).json({ message: 'Invalid or expired OTP' });
      return;
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      token: generateToken(String(user._id)),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      if (!user.isVerified) {
        res.status(401).json({ message: 'Please verify your email first' });
        return;
      }
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        token: generateToken(String(user._id)),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin creates a teacher account
// @route   POST /api/users/teachers
// @access  Private/Admin
export const createTeacher = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, subject, status } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const tempPassword = crypto.randomBytes(8).toString('hex');

    const teacher = await User.create({
      name,
      email,
      password: tempPassword,
      role: 'Teacher',
      isVerified: true,
      mustChangePassword: true,
      phone,
      subject,
      status: status || 'Active',
    });

    const template = teacherInviteTemplate(teacher.name, teacher.email, tempPassword);
    try {
      await sendEmail({
        email: teacher.email,
        subject: template.subject,
        message: template.text,
        html: template.html,
      });
    } catch (error) {
      console.error('Email could not be sent', error);
    }

    res.status(201).json({
      _id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
      phone: teacher.phone,
      subject: teacher.subject,
      status: teacher.status,
      mustChangePassword: teacher.mustChangePassword,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin creates a student account
// @route   POST /api/users/students
// @access  Private/Admin
export const createStudent = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, status } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const tempPassword = crypto.randomBytes(8).toString('hex');

    const student = await User.create({
      name,
      email,
      password: tempPassword,
      role: 'Student',
      isVerified: true,
      mustChangePassword: true,
      phone,
      status: status || 'Active',
    });

    const template = studentInviteTemplate(student.name, student.email, tempPassword);
    try {
      await sendEmail({
        email: student.email,
        subject: template.subject,
        message: template.text,
        html: template.html,
      });
    } catch (error) {
      console.error('Email could not be sent', error);
    }

    res.status(201).json({
      _id: student._id,
      name: student.name,
      email: student.email,
      role: student.role,
      phone: student.phone,
      status: student.status,
      mustChangePassword: student.mustChangePassword,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

const applyUserUpdates = (user: any, updates: any) => {
  if (updates.name !== undefined) user.name = updates.name;
  if (updates.email !== undefined) user.email = updates.email;
  if (updates.phone !== undefined) user.phone = updates.phone;
  if (updates.subject !== undefined) user.subject = updates.subject;
  if (updates.status !== undefined) user.status = updates.status;
};

// @desc    Get teachers
// @route   GET /api/users/teachers
// @access  Private/Admin
export const getTeachers = async (_req: Request, res: Response) => {
  try {
    const teachers = await User.find({ role: 'Teacher' }).select('-password');
    res.json(teachers);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get teacher by id
// @route   GET /api/users/teachers/:id
// @access  Private/Admin
export const getTeacherById = async (req: Request, res: Response) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'Teacher' }).select('-password');
    if (!teacher) {
      res.status(404).json({ message: 'Teacher not found' });
      return;
    }
    res.json(teacher);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update teacher
// @route   PUT /api/users/teachers/:id
// @access  Private/Admin
export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'Teacher' });
    if (!teacher) {
      res.status(404).json({ message: 'Teacher not found' });
      return;
    }

    applyUserUpdates(teacher, req.body);
    const updated = await teacher.save();
    res.json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      phone: updated.phone,
      subject: updated.subject,
      status: updated.status,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete teacher
// @route   DELETE /api/users/teachers/:id
// @access  Private/Admin
export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'Teacher' });
    if (!teacher) {
      res.status(404).json({ message: 'Teacher not found' });
      return;
    }
    await teacher.deleteOne();
    res.json({ message: 'Teacher removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get students
// @route   GET /api/users/students
// @access  Private/Admin
export const getStudents = async (_req: Request, res: Response) => {
  try {
    const students = await User.find({ role: 'Student' }).select('-password');
    res.json(students);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student by id
// @route   GET /api/users/students/:id
// @access  Private/Admin
export const getStudentById = async (req: Request, res: Response) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'Student' }).select('-password');
    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }
    res.json(student);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update student
// @route   PUT /api/users/students/:id
// @access  Private/Admin
export const updateStudent = async (req: Request, res: Response) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'Student' });
    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    applyUserUpdates(student, req.body);
    const updated = await student.save();
    res.json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      phone: updated.phone,
      status: updated.status,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete student
// @route   DELETE /api/users/students/:id
// @access  Private/Admin
export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'Student' });
    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }
    await student.deleteOne();
    res.json({ message: 'Student removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout (client clears token)
// @route   POST /api/users/logout
// @access  Public
export const logoutUser = async (_req: Request, res: Response) => {
  res.json({ message: 'Logged out' });
};

// @desc    Request password reset
// @route   POST /api/users/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.json({ message: 'If the email exists, a reset link was sent.' });
      return;
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    const template = resetPasswordTemplate(user.name, resetUrl);

    try {
      await sendEmail({
        email: user.email,
        subject: template.subject,
        message: template.text,
        html: template.html,
      });
    } catch (error) {
      console.error('Email could not be sent', error);
    }

    res.json({ message: 'If the email exists, a reset link was sent.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password
// @route   POST /api/users/reset-password
// @access  Public
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email,
      resetPasswordToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change password (for first login or user initiated change)
// @route   POST /api/users/change-password
// @access  Private
export const changePassword = async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user || !user.password) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      res.status(401).json({ message: 'Current password is incorrect' });
      return;
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
