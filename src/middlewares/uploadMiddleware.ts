import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { Request } from 'express';
import cloudinary from '../utils/cloudinary';

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    const filenameBase = file.originalname.split('.').slice(0, -1).join('.') || file.originalname;
    return {
      folder: 'logistiq/products',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'm4a', 'pdf', 'glb', 'gltf', 'obj', 'fbx'],
      public_id: `${Date.now()}-${filenameBase}`,
      resource_type: 'auto',
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
