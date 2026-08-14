import { Request, Response } from "express";
import crypto from "crypto";
import User from "../models/User";
import Subject from "../models/Subject";
import Unit from "../models/Unit";
import Subscription from "../models/Subscription";
import SubjectProgress from "../models/SubjectProgress";
import TeacherSchedule from "../models/TeacherSchedule";
import TeacherAssignment from "../models/TeacherAssignment";
import Stage from "../models/Stage";
import Grade from "../models/Grade";
import { getActiveStudentIdsForTeacher } from "../utils/subscriptionAccess";
import sendEmail from "../utils/sendEmail";
import generateToken from "../utils/generateToken";
import { generateOtp } from "../utils/otp";
import {
  otpTemplate,
  resetPasswordTemplate,
  teacherInviteTemplate,
  studentInviteTemplate,
} from "../utils/emailTemplates";

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      parentEmail,
      stageId,
      subscribeLiveLessons,
    } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      name,
      email,
      password,
      role: "Student",
      ...(phone && { phone }),
      ...(parentEmail && { parentEmail }),
      ...(stageId && { stageId }),
      subscribeLiveLessons:
        subscribeLiveLessons === true || subscribeLiveLessons === "true",
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
        console.error("Email could not be sent", error);
      }

      res.status(201).json({
        message: "User registered. Please check email for OTP.",
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
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
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ message: "User already verified" });
      return;
    }

    const cooldownMs = 60 * 1000;
    if (
      user.otpLastSent &&
      Date.now() - user.otpLastSent.getTime() < cooldownMs
    ) {
      const remaining = Math.ceil(
        (cooldownMs - (Date.now() - user.otpLastSent.getTime())) / 1000,
      );
      res
        .status(429)
        .json({
          message: `Please wait ${remaining} seconds before requesting a new OTP.`,
          retryAfterSeconds: remaining,
        });
      return;
    }

    const otp = generateOtp();
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
      console.error("Email could not be sent", error);
    }

    res.json({ message: "OTP resent. Please check your email." });
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
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ message: "User already verified" });
      return;
    }

    if (user.otp !== otp || (user.otpExpires && user.otpExpires < new Date())) {
      res.status(400).json({ message: "Invalid or expired OTP" });
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

// @desc    Auth user & get token (Admins get an extra OTP step — see verifyLoginOtp)
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      if (!user.isVerified) {
        res.status(401).json({ message: "Please verify your email first" });
        return;
      }

      if (user.role === "Admin") {
        const otp = generateOtp();
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
          console.error("Email could not be sent", error);
        }

        res.json({ requiresOtp: true, userId: user._id });
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
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify the OTP sent to an Admin at login and issue the JWT
// @route   POST /api/users/login/verify-otp
// @access  Public
export const verifyLoginOtp = async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body as { userId?: string; otp?: string };
    if (!userId || !otp) {
      res.status(400).json({ message: "userId and otp are required" });
      return;
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "Admin") {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.otp !== otp || (user.otpExpires && user.otpExpires < new Date())) {
      res.status(400).json({ message: "Invalid or expired code" });
      return;
    }

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

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -otp -otpExpires -otpLastSent -resetPasswordToken -resetPasswordExpires",
    );

    if (user) {
      const obj = user.toObject({ flattenMaps: true }) as any;
      res.json({
        _id: obj._id,
        name: obj.name,
        email: obj.email,
        role: obj.role,
        phone: obj.phone,
        subject: obj.subject,
        stageId: obj.stageId,
        gradeId: obj.gradeId,
        subscribeLiveLessons: obj.subscribeLiveLessons,
        parentEmail: obj.parentEmail,
        profileImage: obj.profileImage,
        status: obj.status,
        isVerified: obj.isVerified,
        mustChangePassword: obj.mustChangePassword,
        bio: obj.bio,
        availableDays: obj.availableDays,
        availableHours: obj.availableHours,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get subscribed subjects for logged-in student (with progress if available)
// @route   GET /api/users/subscribed-subjects
// @access  Private (Student)
export const getMySubscribedSubjects = async (req: any, res: Response) => {
  try {
    const studentId = req.user._id;

    // Active Subscriptions are the real record of what a student has paid
    // for — not the disconnected UnitEnrollment collection, which nothing
    // in the payment/approval flow ever writes to.
    const subjectIds = await Subscription.distinct("subjectId", {
      studentId,
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    if (subjectIds.length === 0) {
      res.json([]);
      return;
    }

    const subjects = await Subject.find({ _id: { $in: subjectIds } })
      .sort({ name: 1 })
      .lean();

    const progressDocs = await SubjectProgress.find({
      studentId,
      subjectId: { $in: subjectIds },
    })
      .select("subjectId percentage")
      .lean();

    const progressMap = new Map<string, number>();
    for (const doc of progressDocs as any[]) {
      const key = String(doc.subjectId);
      const existing = progressMap.get(key);
      if (existing === undefined || doc.percentage > existing) {
        progressMap.set(key, doc.percentage);
      }
    }

    const payload = subjects.map((subject: any) => ({
      ...subject,
      progressPercentage: progressMap.has(String(subject._id))
        ? progressMap.get(String(subject._id))
        : null,
    }));

    res.json(payload);
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
      res.status(404).json({ message: "User not found" });
      return;
    }

    // When sent as multipart/form-data, arrays and objects arrive as JSON strings
    const parseField = (v: any) => {
      if (typeof v === "string") {
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      }
      return v;
    };

    const { name, phone, stageId, profileImage, bio } = req.body;
    const availableDays = parseField(req.body.availableDays);
    const availableHours = parseField(req.body.availableHours);

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (stageId !== undefined) user.stageId = stageId || undefined;
    if (bio !== undefined) user.bio = bio;
    if (availableDays !== undefined)
      user.availableDays = Array.isArray(availableDays) ? availableDays : [];
    if (availableHours !== undefined) user.availableHours = availableHours;

    // Profile image: prefer uploaded file, fall back to URL from body
    if (req.file) {
      const uploaded = req.file as any;
      user.profileImage =
        uploaded.path || uploaded.secure_url || uploaded.url || "";
    } else if (profileImage !== undefined) {
      user.profileImage = profileImage;
    }

    const updated = await user.save();
    const obj = updated.toObject({ flattenMaps: true }) as any;
    res.json({
      _id: obj._id,
      name: obj.name,
      email: obj.email,
      role: obj.role,
      phone: obj.phone,
      stageId: obj.stageId,
      profileImage: obj.profileImage,
      status: obj.status,
      bio: obj.bio,
      availableDays: obj.availableDays,
      availableHours: obj.availableHours,
      mustChangePassword: obj.mustChangePassword,
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
    const {
      name,
      email,
      phone,
      subject,
      stageId,
      status,
      profileImage,
      cvUrl,
      availableDays,
      availableHours,
    } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const tempPassword = "Academix123456";

    const teacher = await User.create({
      name,
      email,
      password: tempPassword,
      role: "Teacher",
      isVerified: true,
      mustChangePassword: true,
      phone,
      subject,
      stageId: stageId || undefined,
      status: status || "Active",
      profileImage: profileImage || undefined,
      cvUrl: cvUrl || undefined,
      availableDays: Array.isArray(availableDays) ? availableDays : [],
      availableHours: availableHours || {},
    });

    const template = teacherInviteTemplate(
      teacher.name,
      teacher.email,
      tempPassword,
      teacher.subject,
    );
    try {
      await sendEmail({
        email: teacher.email,
        subject: template.subject,
        message: template.text,
        html: template.html,
      });
    } catch (error) {
      console.error("Email could not be sent", error);
    }

    res.status(201).json({
      _id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
      phone: teacher.phone,
      subject: teacher.subject,
      stageId: teacher.stageId,
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
    const {
      name,
      email,
      phone,
      status,
      stageId,
      subscribeLiveLessons,
      parentEmail,
      profileImage,
    } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const tempPassword = crypto.randomBytes(8).toString("hex");

    const student = await User.create({
      name,
      email,
      password: tempPassword,
      role: "Student",
      isVerified: true,
      mustChangePassword: true,
      phone,
      status: status || "Active",
      stageId: stageId || undefined,
      subscribeLiveLessons:
        subscribeLiveLessons === "true" || subscribeLiveLessons === true,
      parentEmail: parentEmail || undefined,
      profileImage: profileImage || undefined,
    });

    const template = studentInviteTemplate(
      student.name,
      student.email,
      tempPassword,
    );
    try {
      await sendEmail({
        email: student.email,
        subject: template.subject,
        message: template.text,
        html: template.html,
      });
    } catch (error) {
      console.error("Email could not be sent", error);
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
  if (updates.profileImage !== undefined)
    user.profileImage = updates.profileImage;
  if (updates.cvUrl !== undefined) user.cvUrl = updates.cvUrl;
  if (updates.bio !== undefined) user.bio = updates.bio;
  if (updates.availableDays !== undefined)
    user.availableDays = updates.availableDays;
  if (updates.availableHours !== undefined)
    user.availableHours = updates.availableHours;
  // Student-specific fields
  if (updates.stageId !== undefined)
    user.stageId = updates.stageId || undefined;
  if (updates.subscribeLiveLessons !== undefined) {
    user.subscribeLiveLessons =
      updates.subscribeLiveLessons === "true" ||
      updates.subscribeLiveLessons === true;
  }
  if (updates.parentEmail !== undefined)
    user.parentEmail = updates.parentEmail || undefined;
};

// @desc    Get teachers
// @route   GET /api/users/teachers
// @access  Private/Admin
export const getTeachers = async (req: Request, res: Response) => {
  try {
    const {
      search,
      status,
      subjectIds,
      stageIds,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query as {
      search?: string;
      status?: string;
      subjectIds?: string;
      stageIds?: string;
      sortBy?: string;
      sortOrder?: string;
    };

    const filter: Record<string, unknown> = { role: "Teacher" };
    if (status) filter.status = status;
    if (search) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const teachers = await User.find(filter).select("-password").lean();
    const teacherIds = teachers.map((teacher) => teacher._id);

    const assignments = await TeacherAssignment.find({
      teacherId: { $in: teacherIds },
    })
      .select("teacherId subjectId gradeId")
      .populate("subjectId", "name nameAr icon color")
      .populate({
        path: "gradeId",
        select: "name nameAr stageId",
        populate: { path: "stageId", select: "name nameAr icon color" },
      })
      .lean();

    const subjectsByTeacher = new Map<string, any[]>();
    const stagesByTeacher = new Map<string, any[]>();
    for (const assignment of assignments) {
      const key = String(assignment.teacherId);

      const subject = assignment.subjectId as any;
      if (subject && subject._id) {
        const subjectList = subjectsByTeacher.get(key) ?? [];
        if (!subjectList.some((s) => String(s._id) === String(subject._id))) {
          subjectList.push(subject);
        }
        subjectsByTeacher.set(key, subjectList);
      }

      const grade = assignment.gradeId as any;
      const stage = grade?.stageId;
      if (stage && stage._id) {
        const stageList = stagesByTeacher.get(key) ?? [];
        if (!stageList.some((s) => String(s._id) === String(stage._id))) {
          stageList.push(stage);
        }
        stagesByTeacher.set(key, stageList);
      }
    }

    const requestedSubjectIds = subjectIds
      ? subjectIds.split(",").filter(Boolean)
      : [];
    const requestedStageIds = stageIds ? stageIds.split(",").filter(Boolean) : [];

    let result = teachers.map((teacher) => ({
      ...teacher,
      assignmentSubjects: subjectsByTeacher.get(String(teacher._id)) ?? [],
      assignmentStages: stagesByTeacher.get(String(teacher._id)) ?? [],
    }));

    if (requestedSubjectIds.length > 0) {
      result = result.filter((teacher) =>
        teacher.assignmentSubjects.some((s: any) =>
          requestedSubjectIds.includes(String(s._id)),
        ),
      );
    }
    if (requestedStageIds.length > 0) {
      result = result.filter((teacher) =>
        teacher.assignmentStages.some((s: any) =>
          requestedStageIds.includes(String(s._id)),
        ),
      );
    }

    const sortDir = sortOrder === "desc" ? -1 : 1;
    result.sort((a: any, b: any) => {
      const aVal = String(a[sortBy] ?? "").toLowerCase();
      const bVal = String(b[sortBy] ?? "").toLowerCase();
      return aVal < bVal ? -sortDir : aVal > bVal ? sortDir : 0;
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get students enrolled in the logged-in teacher's courses
// @route   GET /api/users/my-students
// @access  Private/Teacher
export const getMyStudents = async (req: any, res: Response) => {
  try {
    const {
      search,
      status,
      stageIds,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query as {
      search?: string;
      status?: string;
      stageIds?: string;
      sortBy?: string;
      sortOrder?: string;
    };

    const studentIds = await getActiveStudentIdsForTeacher(
      String(req.user._id),
    );
    let result = studentIds.length
      ? await User.find({ _id: { $in: studentIds } })
          .select("_id name email phone profileImage stageId status createdAt")
          .lean()
      : [];

    if (status) result = result.filter((s: any) => s.status === status);

    if (stageIds) {
      const ids = stageIds.split(",").filter(Boolean);
      if (ids.length > 0) {
        result = result.filter((s: any) => s.stageId && ids.includes(String(s.stageId)));
      }
    }

    if (search) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      result = result.filter(
        (s: any) => regex.test(s.name ?? "") || regex.test(s.email ?? "") || regex.test(s.phone ?? ""),
      );
    }

    const sortDir = sortOrder === "desc" ? -1 : 1;
    result.sort((a: any, b: any) => {
      const aVal = String(a[sortBy] ?? "").toLowerCase();
      const bVal = String(b[sortBy] ?? "").toLowerCase();
      return aVal < bVal ? -sortDir : aVal > bVal ? sortDir : 0;
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get teacher by id
// @route   GET /api/users/teachers/:id
// @access  Private/Admin
export const getTeacherById = async (req: Request, res: Response) => {
  try {
    const teacher = await User.findOne({
      _id: req.params.id,
      role: "Teacher",
    }).select("-password");
    if (!teacher) {
      res.status(404).json({ message: "Teacher not found" });
      return;
    }

    // ── Derive academic data from TeacherAssignments (authoritative source) ──
    const assignments = await TeacherAssignment.find({ teacherId: teacher._id })
      .populate("subjectId", "name nameAr icon color description")
      .populate({
        path: "gradeId",
        select: "name nameAr order stageId",
        populate: { path: "stageId", select: "name nameAr icon color" },
      })
      .lean();

    // Deduplicate grades and stages
    const gradeMap = new Map<string, any>();
    const stageMap = new Map<string, any>();
    const subjectMap = new Map<string, any>();
    for (const a of assignments) {
      const grade = a.gradeId as any;
      const subject = a.subjectId as any;
      if (grade && grade._id) gradeMap.set(String(grade._id), grade);
      if (grade?.stageId && grade.stageId._id)
        stageMap.set(String(grade.stageId._id), grade.stageId);
      if (subject && subject._id) subjectMap.set(String(subject._id), subject);
    }
    const assignmentGrades = Array.from(gradeMap.values());
    const assignmentStages = Array.from(stageMap.values());
    const assignmentSubjects = Array.from(subjectMap.values());

    // Student counts come from active Subscriptions (the real source of
    // access), not the disconnected UnitEnrollment collection.
    const subjectDetails = await Promise.all(
      assignmentSubjects.map(async (subject: any) => {
        const studentIds = await getActiveStudentIdsForTeacher(
          String(teacher._id),
          String(subject._id),
        );
        return {
          ...subject,
          studentCount: studentIds.length,
        };
      }),
    );

    const totalStudentCount = (
      await getActiveStudentIdsForTeacher(String(teacher._id))
    ).length;

    const schedules = await TeacherSchedule.find({ teacherId: teacher._id })
      .populate("subjectId", "name")
      .sort({ day: 1, startTime: 1 });

    const teacherObj = teacher.toObject({ flattenMaps: true });

    const availableHoursRaw = teacherObj.availableHours as unknown as
      | Record<string, { start?: string; end?: string }>
      | undefined;
    const resolvedAvailableHours: Record<
      string,
      { start?: string; end?: string }
    > =
      availableHoursRaw && Object.keys(availableHoursRaw).length > 0
        ? availableHoursRaw
        : {};
    const resolvedAvailableDays: string[] = Array.isArray(
      teacherObj.availableDays,
    )
      ? teacherObj.availableDays
      : [];

    res.json({
      ...teacherObj,
      availableHours: resolvedAvailableHours,
      availableDays: resolvedAvailableDays,
      subjects: subjectDetails,
      totalStudentCount,
      schedules,
      cvUrl: teacherObj.cvUrl ?? null,
      // Enriched academic relations derived from TeacherAssignments
      assignmentStages,
      assignmentGrades,
      assignmentSubjects,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a teacher's public profile (name, bio, subjects taught,
//          availability, scheduled live lessons) — no contact/account info
// @route   GET /api/users/teachers/:id/public-profile
// @access  Public
export const getPublicTeacherProfile = async (req: Request, res: Response) => {
  try {
    const teacher = await User.findOne({
      _id: req.params.id,
      role: "Teacher",
    }).select(
      "name bio profileImage availableDays availableHours isAvailableForInstantLessons instantLessonPricePerHour createdAt",
    );
    if (!teacher) {
      res.status(404).json({ message: "Teacher not found" });
      return;
    }

    const assignments = await TeacherAssignment.find({ teacherId: teacher._id })
      .populate("subjectId", "name nameAr icon color description")
      .populate({
        path: "gradeId",
        select: "name nameAr order stageId",
        populate: { path: "stageId", select: "name nameAr icon color" },
      })
      .lean();

    const gradeMap = new Map<string, any>();
    const stageMap = new Map<string, any>();
    const subjectMap = new Map<string, any>();
    for (const a of assignments) {
      const grade = a.gradeId as any;
      const subject = a.subjectId as any;
      if (grade && grade._id) gradeMap.set(String(grade._id), grade);
      if (grade?.stageId && grade.stageId._id)
        stageMap.set(String(grade.stageId._id), grade.stageId);
      if (subject && subject._id) subjectMap.set(String(subject._id), subject);
    }
    const assignmentGrades = Array.from(gradeMap.values());
    const assignmentStages = Array.from(stageMap.values());
    const assignmentSubjects = Array.from(subjectMap.values());

    const subjectDetails = await Promise.all(
      assignmentSubjects.map(async (subject: any) => {
        const studentIds = await getActiveStudentIdsForTeacher(
          String(teacher._id),
          String(subject._id),
        );
        return {
          ...subject,
          studentCount: studentIds.length,
        };
      }),
    );

    const totalStudentCount = (
      await getActiveStudentIdsForTeacher(String(teacher._id))
    ).length;

    const schedules = await TeacherSchedule.find({ teacherId: teacher._id, isActive: true })
      .select("day startTime endTime subjectId")
      .populate("subjectId", "name nameAr")
      .sort({ day: 1, startTime: 1 });

    const teacherObj = teacher.toObject({ flattenMaps: true });

    const availableHoursRaw = teacherObj.availableHours as unknown as
      | Record<string, { start?: string; end?: string }>
      | undefined;
    const resolvedAvailableHours: Record<
      string,
      { start?: string; end?: string }
    > =
      availableHoursRaw && Object.keys(availableHoursRaw).length > 0
        ? availableHoursRaw
        : {};
    const resolvedAvailableDays: string[] = Array.isArray(
      teacherObj.availableDays,
    )
      ? teacherObj.availableDays
      : [];

    res.json({
      _id: teacherObj._id,
      name: teacherObj.name,
      bio: teacherObj.bio,
      profileImage: teacherObj.profileImage,
      isAvailableForInstantLessons: teacherObj.isAvailableForInstantLessons,
      instantLessonPricePerHour: teacherObj.instantLessonPricePerHour,
      createdAt: (teacherObj as any).createdAt,
      availableDays: resolvedAvailableDays,
      availableHours: resolvedAvailableHours,
      subjects: subjectDetails,
      totalStudentCount,
      schedules,
      assignmentStages,
      assignmentGrades,
      assignmentSubjects,
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
    const teacher = await User.findOne({ _id: req.params.id, role: "Teacher" });
    if (!teacher) {
      res.status(404).json({ message: "Teacher not found" });
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
    const teacher = await User.findOne({ _id: req.params.id, role: "Teacher" });
    if (!teacher) {
      res.status(404).json({ message: "Teacher not found" });
      return;
    }
    await teacher.deleteOne();
    res.json({ message: "Teacher removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get students
// @route   GET /api/users/students
// @access  Private/Admin
export const getStudents = async (req: Request, res: Response) => {
  try {
    const {
      search,
      status,
      stageIds,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query as {
      search?: string;
      status?: string;
      stageIds?: string;
      sortBy?: string;
      sortOrder?: string;
    };

    const filter: Record<string, unknown> = { role: "Student" };
    if (status) filter.status = status;
    if (stageIds) {
      const ids = stageIds.split(",").filter(Boolean);
      if (ids.length > 0) filter.stageId = { $in: ids };
    }
    if (search) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const sortDir = sortOrder === "desc" ? -1 : 1;
    const students = await User.find(filter)
      .select("-password")
      .sort({ [sortBy]: sortDir });
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
    const student = await User.findOne({
      _id: req.params.id,
      role: "Student",
    }).select("-password");
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }
    const subjectIds = await Subscription.distinct("subjectId", {
      studentId: student._id,
      status: "active",
      expiresAt: { $gt: new Date() },
    });
    const subscribedSubjects =
      subjectIds.length > 0
        ? await Subject.find({ _id: { $in: subjectIds } })
            .populate("teacherId", "name")
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
    const student = await User.findOne({ _id: req.params.id, role: "Student" });
    if (!student) {
      res.status(404).json({ message: "Student not found" });
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
    const student = await User.findOne({ _id: req.params.id, role: "Student" });
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }
    await student.deleteOne();
    res.json({ message: "Student removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout (client clears token)
// @route   POST /api/users/logout
// @access  Public
export const logoutUser = async (_req: Request, res: Response) => {
  res.json({ message: "Logged out" });
};

// @desc    Request password reset
// @route   POST /api/users/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.json({ message: "If the email exists, a reset link was sent." });
      return;
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
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
      console.error("Email could not be sent", error);
    }

    res.json({ message: "If the email exists, a reset link was sent." });
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

    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({ message: "Invalid or expired reset token" });
      return;
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: "Password reset successful" });
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
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      res.status(401).json({ message: "Current password is incorrect" });
      return;
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get students enrolled in teacher's units (with payment info)
// @route   GET /api/users/my-unit-students
// @access  Private/Teacher
export const getMyUnitStudents = async (req: any, res: Response) => {
  try {
    const teacherId = req.user._id;

    // Active subscriptions to this teacher are the real source of "who is
    // enrolled" — not the disconnected UnitEnrollment collection, which
    // nothing in the payment/approval flow ever writes to.
    const subscriptions = await Subscription.find({
      teacherId,
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .populate("studentId", "_id name email phone profileImage status createdAt")
      .populate("unitId", "_id title")
      .lean();

    if (subscriptions.length === 0) {
      res.json({ totalStudents: 0, students: [] });
      return;
    }

    const studentIds = [
      ...new Set(
        subscriptions
          .map((s: any) => String((s.studentId as any)?._id))
          .filter(Boolean),
      ),
    ];

    // A subject-wide subscription grants every unit under that subject/grade
    // for this teacher — resolve those units per subject so they can be
    // listed just like a direct unit purchase.
    const subjectSubs = (subscriptions as any[]).filter((s) => s.type === "subject");
    const subjectUnitsMap = new Map<string, Array<{ unitId: any; title: string }>>();
    if (subjectSubs.length > 0) {
      const assignments = await TeacherAssignment.find({
        $or: subjectSubs.map((s) => ({
          teacherId: s.teacherId,
          subjectId: s.subjectId,
          gradeId: s.gradeId,
        })),
      })
        .select("_id subjectId")
        .lean();
      const assignmentIds = assignments.map((a: any) => a._id);
      const units = assignmentIds.length
        ? await Unit.find({ assignmentId: { $in: assignmentIds } })
            .select("_id title assignmentId")
            .lean()
        : [];
      const assignmentToSubject = new Map(
        assignments.map((a: any) => [String(a._id), String(a.subjectId)]),
      );
      for (const unit of units as any[]) {
        const subjectId = assignmentToSubject.get(String(unit.assignmentId));
        if (!subjectId) continue;
        if (!subjectUnitsMap.has(subjectId)) subjectUnitsMap.set(subjectId, []);
        subjectUnitsMap.get(subjectId)!.push({ unitId: unit._id, title: unit.title });
      }
    }

    // Fetch last payment for each student
    const payments = await (
      await import("../models/Payment")
    ).default
      .find({ studentId: { $in: studentIds } })
      .sort({ createdAt: -1 })
      .lean();
    const payMap = new Map<string, any>();
    for (const p of payments as any[]) {
      const key = String(p.studentId);
      if (!payMap.has(key)) payMap.set(key, p); // first = newest
    }

    // Build result grouped by student, listing enrolled units
    const studentMap = new Map<string, any>();
    for (const sub of subscriptions as any[]) {
      const student = sub.studentId;
      if (!student?._id) continue;
      const key = String(student._id);
      if (!studentMap.has(key)) {
        const pay = payMap.get(key);
        studentMap.set(key, {
          student: {
            _id: student._id,
            name: student.name,
            email: student.email,
            phone: student.phone,
            profileImage: student.profileImage,
            status: student.status,
            joinedAt: student.createdAt,
          },
          payment: pay
            ? {
                amount: pay.amountCents / 100,
                currency: pay.currency,
                status: pay.status,
                submittedAt: pay.createdAt,
              }
            : null,
          enrolledUnits: [] as Array<{ unitId: any; title: string }>,
        });
      }
      const entry = studentMap.get(key)!;
      if (sub.type === "unit" && sub.unitId) {
        const unitDoc = sub.unitId as any;
        entry.enrolledUnits.push({ unitId: unitDoc._id, title: unitDoc.title });
      } else if (sub.type === "subject") {
        entry.enrolledUnits.push(...(subjectUnitsMap.get(String(sub.subjectId)) ?? []));
      }
    }

    const students = Array.from(studentMap.values());
    res.json({ totalStudents: students.length, students });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
