import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { Request } from 'express';
import cloudinary from '../utils/cloudinary';

const resolveFolder = (file: Express.Multer.File) => {
  const mime = file.mimetype || '';
  const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
  const field = file.fieldname.toLowerCase();

  if (field.includes('avatar') || field.includes('profile')) {
    return 'users/avatars';
  }

  if (mime.startsWith('video/')) {
    return 'products/videos';
  }

  if (mime.startsWith('image/')) {
    return 'products/images';
  }

  if (mime === 'application/pdf' || ext === 'pdf' || ext === 'doc' || ext === 'docx') {
    return 'documents';
  }

  return 'documents';
};

const resolveResourceType = (file: Express.Multer.File) => {
  const mime = file.mimetype || '';
  const ext = file.originalname.split('.').pop()?.toLowerCase() || '';

  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'video';
  if (mime === 'application/pdf' || ext === 'pdf' || ext === 'doc' || ext === 'docx') return 'raw';
  return 'raw';
};

// Avatars are meant to be publicly visible everywhere (public teacher
// profiles, comments...) so they stay open. Everything else through this
// uploader is paid lesson content or a payment-proof screenshot — neither
// should be a permanent, freely shareable public link, so it requires a
// signed URL (see utils/cloudinarySignedUrl.ts) to be delivered.
const resolveAccessMode = (file: Express.Multer.File): 'public' | 'authenticated' => {
  const field = file.fieldname.toLowerCase();
  if (field.includes('avatar') || field.includes('profile')) return 'public';
  return 'authenticated';
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    const filenameBase = file.originalname.split('.').slice(0, -1).join('.') || file.originalname;
    return {
      folder: resolveFolder(file),
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'm4a', 'pdf', 'doc', 'docx', 'glb', 'gltf', 'obj', 'fbx'],
      public_id: `${Date.now()}-${filenameBase}`,
      resource_type: resolveResourceType(file),
      access_mode: resolveAccessMode(file),
    };
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

export default upload;

// Dedicated, tighter uploader for the public teacher-application form: it has
// no auth to rely on (applicants don't have accounts yet), so it must not
// accept the same anything-up-to-100MB/any-format policy as the general
// uploader — only a CV/photo-sized document or image.
const applicationStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    const filenameBase = file.originalname.split('.').slice(0, -1).join('.') || file.originalname;
    return {
      folder: 'teacher-applications',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf', 'doc', 'docx'],
      public_id: `${Date.now()}-${filenameBase}`,
      resource_type: resolveResourceType(file),
      access_mode: 'public',
    };
  },
});

const applicationAllowedMimes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const uploadApplicationFile = multer({
  storage: applicationStorage,
  fileFilter: (_req, file, cb) => {
    if (applicationAllowedMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only images, PDF, and Word documents are allowed.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
