"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const discussionController_1 = require("../controllers/discussionController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.route('/').post(authMiddleware_1.protect, discussionController_1.addComment);
router.route('/:lessonId').get(authMiddleware_1.protect, discussionController_1.getComments);
router.route('/:commentId/like').put(authMiddleware_1.protect, discussionController_1.likeComment);
exports.default = router;
