import express from 'express';
import { protect, admin } from '../middlewares/authMiddleware';
import upload from '../middlewares/uploadMiddleware';
import { approvePayment, getMyPayments, getPayments, rejectPayment, submitPayment } from '../controllers/paymentController';

const router = express.Router();

router.post('/', protect, submitPayment);
router.post('/upload', protect, upload.single('file'), async (req, res) => {
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
		res.status(500).json({ message: error.message || 'Error uploading file' });
	}
});
router.get('/my', protect, getMyPayments);
router.get('/', protect, admin, getPayments);
router.post('/:id/approve', protect, admin, approvePayment);
router.post('/:id/reject', protect, admin, rejectPayment);

export default router;
