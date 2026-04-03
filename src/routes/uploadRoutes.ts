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

    const uploadedFile = req.file as Express.Multer.File & { path?: string; filename?: string };

    res.json({
      url: uploadedFile.path,
      public_id: uploadedFile.filename,
      format: uploadedFile.mimetype,
      resource_type: uploadedFile.mimetype?.startsWith('video/') ? 'video' : 'image',
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: error.message || 'Error uploading file' });
  }
});

export default router;
