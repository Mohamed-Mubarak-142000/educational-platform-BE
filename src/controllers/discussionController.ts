import { Request, Response } from 'express';
import Comment from '../models/Comment';

export const addComment = async (req: any, res: Response) => {
  try {
    const { lessonId, text, parentId } = req.body;
    const comment = await Comment.create({
      lessonId,
      userId: req.user._id,
      text,
      parentId,
      likes: []
    });
    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getComments = async (req: Request, res: Response) => {
  try {
    const comments = await Comment.find({ lessonId: req.params.lessonId })
      .populate('userId', 'name role')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const likeComment = async (req: any, res: Response) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }
    
    const userId = req.user._id;
    if (comment.likes.includes(userId)) {
      comment.likes = comment.likes.filter((id) => String(id) !== String(userId));
    } else {
      comment.likes.push(userId);
    }
    
    await comment.save();
    res.json(comment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
