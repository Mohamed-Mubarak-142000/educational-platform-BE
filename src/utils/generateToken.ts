import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import JWT_SECRET from './jwtSecret';

const generateToken = (id: Types.ObjectId | string) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

export default generateToken;
