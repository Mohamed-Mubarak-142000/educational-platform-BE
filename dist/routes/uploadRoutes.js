"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uploadMiddleware_1 = __importDefault(require("../middlewares/uploadMiddleware"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.post('/', authMiddleware_1.protect, authMiddleware_1.teacher, uploadMiddleware_1.default.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }
        const uploadedFile = req.file;
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
    }
    catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: error.message || 'Error uploading file' });
    }
});
exports.default = router;
