import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IComment extends Document {
  lessonId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  parentId?: mongoose.Types.ObjectId; // For replies
  likes: mongoose.Types.ObjectId[];
}

const CommentSchema = new Schema<IComment>(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment' }, // If null, it's a top-level question/comment
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

const Comment: Model<IComment> = mongoose.model<IComment>('Comment', CommentSchema);
export default Comment;
