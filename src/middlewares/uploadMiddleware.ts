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

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    const filenameBase = file.originalname.split('.').slice(0, -1).join('.') || file.originalname;
    return {
      folder: resolveFolder(file),
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'm4a', 'pdf', 'doc', 'docx', 'glb', 'gltf', 'obj', 'fbx'],
      public_id: `${Date.now()}-${filenameBase}`,
      resource_type: resolveResourceType(file),
      access_mode: 'public',
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
