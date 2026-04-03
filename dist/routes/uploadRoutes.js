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
        res.json({
            url: uploadedFile.path,
            public_id: uploadedFile.filename,
            format: uploadedFile.mimetype,
            resource_type: uploadedFile.mimetype?.startsWith('video/') ? 'video' : 'image',
        });
    }
    catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: error.message || 'Error uploading file' });
    }
});
exports.default = router;
