import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from './authMiddleware';
import TeacherAssignment from '../models/TeacherAssignment';
import Subject from '../models/Subject';
import Unit from '../models/Unit';
import Lesson from '../models/Lesson';
import Grade from '../models/Grade';

/**
 * RBAC Middleware — Role-Based Access Control
 * Enforces permissions based on user role and scope
 */

// ──────────────────────────────────────────────────────────────────────────
// Role Checkers
// ──────────────────────────────────────────────────────────────────────────

/**
 * Require specific role(s)
 * @param roles - Array of allowed roles
 */
export const requireRole = (...roles: Array<'Admin' | 'Teacher' | 'Student'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      });
      return;
    }

    next();
  };
};

/**
 * Allow Admin OR Teacher (but teacher scope will be checked separately)
 */
export const adminOrTeacher = requireRole('Admin', 'Teacher');

/**
 * Teacher ONLY — Admin is explicitly blocked from unit/lesson write routes.
 * Content hierarchy: Subject → Admin | Unit/Lesson → Teacher only.
 */
export const teacherOnly = requireRole('Teacher');

// ──────────────────────────────────────────────────────────────────────────
// Teacher Scope Validation
// ──────────────────────────────────────────────────────────────────────────

/**
 * Get teacher's assigned subjects and grades
 * Returns empty arrays for admins (they have access to everything)
 */
export const getTeacherAssignments = async (userId: string) => {
  const assignments = await TeacherAssignment.find({ 
    teacherId: new mongoose.Types.ObjectId(userId) 
  });
  
  return {
    subjectIds: assignments.map(a => a.subjectId.toString()),
    gradeIds: assignments.map(a => a.gradeId.toString()),
    assignments, // Full assignment objects for detailed checks
  };
};

/**
 * Check if teacher has access to a specific subject
 */
export const checkTeacherSubjectAccess = async (
  teacherId: string, 
  subjectId: string, 
  gradeId?: string
): Promise<boolean> => {
  const query: any = { 
    teacherId: new mongoose.Types.ObjectId(teacherId),
    subjectId: new mongoose.Types.ObjectId(subjectId),
  };
  
  if (gradeId) {
    query.gradeId = new mongoose.Types.ObjectId(gradeId);
  }
  
  const assignment = await TeacherAssignment.findOne(query);
  return !!assignment;
};

/**
 * Middleware: Validate teacher can access subject (from route params)
 * For routes like: /api/subjects/:subjectId/...
 */
export const validateSubjectAccess = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }

  // Admin has full access
  if (req.user.role === 'Admin') {
    next();
    return;
  }

  // Teacher scope check
  if (req.user.role === 'Teacher') {
    const subjectId = req.params.subjectId || req.body.subjectId;
    const gradeId = req.params.gradeId || req.body.gradeId;

    if (!subjectId) {
      res.status(400).json({ message: 'Subject ID required' });
      return;
    }

    const hasAccess = await checkTeacherSubjectAccess(
      req.user._id.toString(), 
      subjectId, 
      gradeId
    );

    if (!hasAccess) {
      res.status(403).json({ 
        message: 'Access denied. You are not assigned to this subject/grade.' 
      });
      return;
    }

    next();
    return;
  }

  res.status(403).json({ message: 'Access denied' });
};

/**
 * Middleware: Validate teacher can access unit (checks via unit's subject/grade)
 */
export const validateUnitAccess = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }

  // Admin has full access
  if (req.user.role === 'Admin') {
    next();
    return;
  }

  // Teacher scope check
  if (req.user.role === 'Teacher') {
    const unitId = req.params.unitId || req.params.id;

    if (!unitId) {
      res.status(400).json({ message: 'Unit ID required' });
      return;
    }

    const unit = await Unit.findById(unitId);
    if (!unit) {
      res.status(404).json({ message: 'Unit not found' });
      return;
    }

    const hasAccess = await checkTeacherSubjectAccess(
      req.user._id.toString(),
      unit.subjectId.toString(),
      unit.gradeId.toString()
    );

    if (!hasAccess) {
      res.status(403).json({ 
        message: 'Access denied. You are not assigned to this unit\'s subject/grade.' 
      });
      return;
    }

    next();
    return;
  }

  res.status(403).json({ message: 'Access denied' });
};

/**
 * Middleware: Validate teacher can access lesson (checks via lesson's unit)
 */
export const validateLessonAccess = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }

  // Admin has full access
  if (req.user.role === 'Admin') {
    next();
    return;
  }

  // Teacher scope check
  if (req.user.role === 'Teacher') {
    const lessonId = req.params.lessonId || req.params.id;

    if (!lessonId) {
      res.status(400).json({ message: 'Lesson ID required' });
      return;
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }

    if (!lesson.unitId) {
      res.status(400).json({ message: 'Lesson has no associated unit' });
      return;
    }

    const unit = await Unit.findById(lesson.unitId);
    if (!unit) {
      res.status(404).json({ message: 'Associated unit not found' });
      return;
    }

    const hasAccess = await checkTeacherSubjectAccess(
      req.user._id.toString(),
      unit.subjectId.toString(),
      unit.gradeId.toString()
    );

    if (!hasAccess) {
      res.status(403).json({ 
        message: 'Access denied. You are not assigned to this lesson\'s subject/grade.' 
      });
      return;
    }

    next();
    return;
  }

  res.status(403).json({ message: 'Access denied' });
};

// ──────────────────────────────────────────────────────────────────────────
// Ownership Validation
// ──────────────────────────────────────────────────────────────────────────

/**
 * Check if user owns a resource (createdBy) or is Admin
 */
export const checkOwnership = (model: any) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    // Admin can modify anything
    if (req.user.role === 'Admin') {
      next();
      return;
    }

    // Teacher ownership check
    if (req.user.role === 'Teacher') {
      const resourceId = req.params.id;
      
      if (!resourceId) {
        res.status(400).json({ message: 'Resource ID required' });
        return;
      }

      const resource = await model.findById(resourceId);
      
      if (!resource) {
        res.status(404).json({ message: 'Resource not found' });
        return;
      }

      // Check createdBy or teacherId field
      const creatorId = resource.createdBy?.toString() || resource.teacherId?.toString();
      
      if (!creatorId) {
        // If no creator field, fall back to scope check (handled by other middleware)
        next();
        return;
      }

      if (creatorId !== req.user._id.toString()) {
        res.status(403).json({ 
          message: 'Access denied. You can only modify your own content.' 
        });
        return;
      }

      next();
      return;
    }

    res.status(403).json({ message: 'Access denied' });
  };
};

// ──────────────────────────────────────────────────────────────────────────
// Query Filtering Helpers (for GET requests)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Get base query filter for teacher scope
 * Returns empty object for Admin (no filtering)
 * Returns scope-based filter for Teacher
 */
export const getTeacherScopeFilter = async (req: AuthRequest) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  // Admin sees everything
  if (req.user.role === 'Admin') {
    return {};
  }

  // Teacher sees only assigned content
  if (req.user.role === 'Teacher') {
    const { subjectIds, gradeIds } = await getTeacherAssignments(
      req.user._id.toString()
    );

    return {
      subjectIds: subjectIds.map(id => new mongoose.Types.ObjectId(id)),
      gradeIds: gradeIds.map(id => new mongoose.Types.ObjectId(id)),
    };
  }

  // Students or other roles see nothing by default
  return { _id: null }; // Matches nothing
};

/**
 * Get subject filter for teacher
 * Returns query filter based on user role
 */
export const getSubjectFilter = async (req: AuthRequest) => {
  // Must be authenticated
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  // Admin sees ALL subjects (no filter)
  if (req.user.role === 'Admin') {
    return {};
  }

  // Teacher sees ONLY assigned subjects
  if (req.user.role === 'Teacher') {
    const { subjectIds } = await getTeacherAssignments(
      req.user._id.toString()
    );

    // If teacher has assignments, filter by them
    if (subjectIds && subjectIds.length > 0) {
      return { 
        _id: { $in: subjectIds.map(id => new mongoose.Types.ObjectId(id)) }
      };
    }

    // If teacher has NO assignments, return empty results
    return { _id: null };
  }

  // Students or other roles - show all subjects (adjust as needed)
  return {};
};

/**
 * Get unit filter for teacher
 */
export const getUnitFilter = async (req: AuthRequest) => {
  const scope = await getTeacherScopeFilter(req);
  
  if (req.user?.role === 'Admin') {
    return {};
  }

  if (scope.subjectIds && scope.gradeIds) {
    return {
      subjectId: { $in: scope.subjectIds },
      gradeId: { $in: scope.gradeIds },
    };
  }

  return { _id: null }; // No access
};

// ──────────────────────────────────────────────────────────────────────────
// Stage Protection (Teachers CANNOT manage stages)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Only Admin can manage stages
 */
export const adminOnly = requireRole('Admin');

// ──────────────────────────────────────────────────────────────────────────
// Export helper to attach createdBy on create
// ──────────────────────────────────────────────────────────────────────────

export const attachCreator = (req: AuthRequest, data: any) => {
  if (req.user) {
    data.createdBy = req.user._id;
  }
  return data;
};
