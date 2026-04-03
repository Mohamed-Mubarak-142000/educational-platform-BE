import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

const generateToken = (id: Types.ObjectId | string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

export default generateToken;
