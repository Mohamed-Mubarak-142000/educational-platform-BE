import express from 'express';
import upload from '../middlewares/uploadMiddleware';
import { protect, teacher } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', protect, teacher, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const uploadedFile = req.file as Express.Multer.File & { path?: string; filename?: string; secure_url?: string };
    const isDocument = uploadedFile.mimetype === 'application/pdf'
      || uploadedFile.originalname.toLowerCase().endsWith('.pdf')
      || uploadedFile.originalname.toLowerCase().endsWith('.doc')
      || uploadedFile.originalname.toLowerCase().endsWith('.docx');
    const rawResourceType = uploadedFile.mimetype?.startsWith('video/') || uploadedFile.mimetype?.startsWith('audio/')
      ? 'video'
      : uploadedFile.mimetype?.startsWith('image/')
      ? 'image'
      : 'raw';
    const baseUrl = uploadedFile.path || uploadedFile.secure_url || '';
    const fileUrl = isDocument
      ? baseUrl.replace('/image/upload/', '/raw/upload/').replace('/video/upload/', '/raw/upload/')
      : baseUrl;

    res.json({
      url: fileUrl,
      public_id: uploadedFile.filename,
      format: uploadedFile.mimetype,
      resource_type: rawResourceType,
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: error.message || 'Error uploading file' });
  }
});

export default router;
