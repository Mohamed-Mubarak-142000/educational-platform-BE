"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
const resolveFolder = (file) => {
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
const resolveResourceType = (file) => {
    const mime = file.mimetype || '';
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (mime.startsWith('image/'))
        return 'image';
    if (mime.startsWith('video/') || mime.startsWith('audio/'))
        return 'video';
    if (mime === 'application/pdf' || ext === 'pdf' || ext === 'doc' || ext === 'docx')
        return 'raw';
    return 'raw';
};
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.default,
    params: async (_req, file) => {
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
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024,
    },
});
exports.default = upload;
