import { Request, Response } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import Course from '../models/Course';
import Enrollment from '../models/Enrollment';
import Subject from '../models/Subject';
import Unit from '../models/Unit';
import UnitEnrollment from '../models/UnitEnrollment';
import TeacherSchedule from '../models/TeacherSchedule';
import TeacherApplication from '../models/TeacherApplication';
import generateToken from '../utils/generateToken';
import sendEmail from '../utils/sendEmail';
import { otpTemplate, resetPasswordTemplate, teacherInviteTemplate, studentInviteTemplate } from '../utils/emailTemplates';

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, parentEmail, stageId, subscribeLiveLessons } = req.body;

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
      ...(phone && { phone }),
      ...(parentEmail && { parentEmail }),
      ...(stageId && { stageId }),
      subscribeLiveLessons: subscribeLiveLessons === true || subscribeLiveLessons === 'true',
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
    const user = await User.findById(req.user._id).select('-password -otp -otpExpires -otpLastSent -resetPasswordToken -resetPasswordExpires');

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        subject: user.subject,
        stageId: user.stageId,
        subscribeLiveLessons: user.subscribeLiveLessons,
        parentEmail: user.parentEmail,
        profileImage: user.profileImage,
        status: user.status,
        isVerified: user.isVerified,
        mustChangePassword: user.mustChangePassword,      stageIds: (user as any).stageIds,
      subjectIds: (user as any).subjectIds,      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update own profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const { name, phone, stageId, profileImage } = req.body;
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (stageId !== undefined) user.stageId = stageId || undefined;
    if (profileImage !== undefined) user.profileImage = profileImage;
    const updated = await user.save();
    res.json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      phone: updated.phone,
      stageId: updated.stageId,
      profileImage: updated.profileImage,
      status: updated.status,
      mustChangePassword: updated.mustChangePassword,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin creates a teacher account
// @route   POST /api/users/teachers
// @access  Private/Admin
export const createTeacher = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, subject, stageId, stageIds, subjectIds, status, profileImage, cvUrl, availableDays, availableHours } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const tempPassword = 'Academix123456';

    const teacher = await User.create({
      name,
      email,
      password: tempPassword,
      role: 'Teacher',
      isVerified: true,
      mustChangePassword: true,
      phone,
      subject,
      stageId: stageId || undefined,
      stageIds: Array.isArray(stageIds) ? stageIds : (stageId ? [stageId] : []),
      subjectIds: Array.isArray(subjectIds) ? subjectIds : [],
      status: status || 'Active',
      profileImage: profileImage || undefined,
      cvUrl: cvUrl || undefined,
      availableDays: Array.isArray(availableDays) ? availableDays : [],
      availableHours: availableHours || {},
    });

    const template = teacherInviteTemplate(teacher.name, teacher.email, tempPassword, teacher.subject);
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
      stageId: teacher.stageId,
      stageIds: teacher.stageIds,
      subjectIds: teacher.subjectIds,
      status: teacher.status,
      profileImage: teacher.profileImage,
      cvUrl: teacher.cvUrl,
      availableDays: teacher.availableDays,
      availableHours: teacher.toObject({ flattenMaps: true }).availableHours,
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
    const { name, email, phone, status, stageId, subscribeLiveLessons, parentEmail, profileImage } = req.body;

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
      stageId: stageId || undefined,
      subscribeLiveLessons: subscribeLiveLessons === 'true' || subscribeLiveLessons === true,
      parentEmail: parentEmail || undefined,
      profileImage: profileImage || undefined,
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
      stageId: student.stageId,
      subscribeLiveLessons: student.subscribeLiveLessons,
      parentEmail: student.parentEmail,
      profileImage: student.profileImage,
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
  if (updates.profileImage !== undefined) user.profileImage = updates.profileImage;
  if (updates.cvUrl !== undefined) user.cvUrl = updates.cvUrl;
  if (updates.bio !== undefined) user.bio = updates.bio;
  if (updates.availableDays !== undefined) user.availableDays = updates.availableDays;
  if (updates.availableHours !== undefined) user.availableHours = updates.availableHours;
  // Teacher assignment fields
  if (updates.stageIds !== undefined) user.stageIds = Array.isArray(updates.stageIds) ? updates.stageIds : [];
  if (updates.subjectIds !== undefined) user.subjectIds = Array.isArray(updates.subjectIds) ? updates.subjectIds : [];
  // Student-specific fields
  if (updates.stageId !== undefined) user.stageId = updates.stageId || undefined;
  if (updates.subscribeLiveLessons !== undefined) {
    user.subscribeLiveLessons = updates.subscribeLiveLessons === 'true' || updates.subscribeLiveLessons === true;
  }
  if (updates.parentEmail !== undefined) user.parentEmail = updates.parentEmail || undefined;
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

// @desc    Get teachers directory (student-facing)
// @route   GET /api/users/teachers-directory
// @access  Private
export const getTeachersDirectory = async (_req: Request, res: Response) => {
  try {
    const teachers = await User.find({ role: 'Teacher', status: 'Active' })
      .select('_id name subject stageId stageIds subjectIds profileImage')
      .populate('stageId', 'name')
      .populate('stageIds', 'name')
      .populate('subjectIds', 'name');
    res.json(teachers);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get teacher profile (student-facing)
// @route   GET /api/users/teachers-directory/:id
// @access  Private
export const getTeacherDirectoryById = async (req: Request, res: Response) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'Teacher', status: 'Active' })
      .select('_id name subject stageId stageIds subjectIds profileImage')
      .populate('stageId', 'name')
      .populate('stageIds', 'name')
      .populate('subjectIds', 'name');

    if (!teacher) {
      res.status(404).json({ message: 'Teacher not found' });
      return;
    }

    res.json(teacher);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get students enrolled in the logged-in teacher's courses
// @route   GET /api/users/my-students
// @access  Private/Teacher
export const getMyStudents = async (req: any, res: Response) => {
  try {
    const courses = await Course.find({ teacherId: req.user._id }).select('_id');
    const courseIds = courses.map((c: any) => c._id);

    const enrollments = await Enrollment.find({ courseId: { $in: courseIds } })
      .populate('studentId', '_id name email phone profileImage stageId status createdAt')
      .lean();

    const uniqueStudentsMap = new Map<string, any>();
    for (const enrollment of enrollments) {
      const student = enrollment.studentId as any;
      if (student && student._id) {
        const key = String(student._id);
        if (!uniqueStudentsMap.has(key)) {
          uniqueStudentsMap.set(key, student);
        }
      }
    }

    res.json(Array.from(uniqueStudentsMap.values()));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get teacher by id
// @route   GET /api/users/teachers/:id
// @access  Private/Admin
export const getTeacherById = async (req: Request, res: Response) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'Teacher' })
      .select('-password')
      .populate('stageIds', 'name nameAr icon color')
      .populate('subjectIds', 'name nameAr icon color description');
    if (!teacher) {
      res.status(404).json({ message: 'Teacher not found' });
      return;
    }
    const subjects = await Subject.find({ teacherId: teacher._id }).sort({ createdAt: 1 });
    const subjectDetails = await Promise.all(
      subjects.map(async (subject) => {
        const units = await Unit.find({ subjectId: subject._id }).select('_id');
        const unitIds = units.map((unit) => unit._id);
        const studentIds = unitIds.length > 0
          ? await UnitEnrollment.distinct('studentId', { unitId: { $in: unitIds } })
          : [];
        return {
          ...subject.toObject(),
          studentCount: studentIds.length,
        };
      })
    );

    const allUnitIds = subjectDetails.length > 0
      ? await Unit.find({ subjectId: { $in: subjectDetails.map((s) => s._id) } }).distinct('_id')
      : [];
    const totalStudentCount = allUnitIds.length > 0
      ? (await UnitEnrollment.distinct('studentId', { unitId: { $in: allUnitIds } })).length
      : 0;

    const schedules = await TeacherSchedule.find({ teacherId: teacher._id })
      .populate('subjectId', 'name')
      .sort({ day: 1, startTime: 1 });

    const application = await TeacherApplication.findOne({ email: teacher.email }).sort({ createdAt: -1 });

    const teacherObj = teacher.toObject({ flattenMaps: true });

    // After flattenMaps, availableHours is a plain object at runtime (not a Map)
    const availableHoursRaw = teacherObj.availableHours as unknown as Record<string, { start?: string; end?: string }> | undefined;

    // Fallback: if teacher user record has empty availableHours/availableDays, use application data
    const resolvedAvailableHours: Record<string, { start?: string; end?: string }> =
      availableHoursRaw && Object.keys(availableHoursRaw).length > 0
        ? availableHoursRaw
        : application?.availableHours != null
          ? (application.availableHours instanceof Map
              ? Object.fromEntries(application.availableHours)
              : (application.availableHours as unknown as Record<string, { start?: string; end?: string }>))
          : {};

    const resolvedAvailableDays: string[] =
      Array.isArray(teacherObj.availableDays) && teacherObj.availableDays.length > 0
        ? teacherObj.availableDays
        : Array.isArray(application?.availableDays) && application.availableDays.length > 0
          ? application.availableDays
          : [];

    res.json({
      ...teacherObj,
      availableHours: resolvedAvailableHours,
      availableDays: resolvedAvailableDays,
      subjects: subjectDetails,
      totalStudentCount,
      schedules,
      application,
      cvUrl: teacherObj.cvUrl || application?.cvUrl || null,
    });
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
    const updatedObj = updated.toObject({ flattenMaps: true });
    res.json({
      _id: updatedObj._id,
      name: updatedObj.name,
      email: updatedObj.email,
      role: updatedObj.role,
      phone: updatedObj.phone,
      subject: updatedObj.subject,
      stageId: updatedObj.stageId,
      stageIds: updatedObj.stageIds,
      subjectIds: updatedObj.subjectIds,
      bio: updatedObj.bio,
      status: updatedObj.status,
      profileImage: updatedObj.profileImage,
      cvUrl: updatedObj.cvUrl,
      availableDays: updatedObj.availableDays,
      availableHours: updatedObj.availableHours,
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
    const enrollments = await UnitEnrollment.find({ studentId: student._id }).select('unitId');
    const unitIds = enrollments.map((enrollment) => enrollment.unitId);
    const units = unitIds.length > 0
      ? await Unit.find({ _id: { $in: unitIds } }).select('subjectId')
      : [];
    const subjectIds = Array.from(
      new Set(units.map((unit) => String(unit.subjectId)))
    );
    const subscribedSubjects = subjectIds.length > 0
      ? await Subject.find({ _id: { $in: subjectIds } })
        .populate('teacherId', 'name')
        .sort({ createdAt: 1 })
      : [];

    res.json({
      ...student.toObject(),
      subscribedSubjects,
    });
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
      stageId: updated.stageId,
      subscribeLiveLessons: updated.subscribeLiveLessons,
      parentEmail: updated.parentEmail,
      profileImage: updated.profileImage,
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
