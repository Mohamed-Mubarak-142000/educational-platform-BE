"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.teacher = exports.admin = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
            const user = await User_1.default.findById(decoded.id).select('-password');
            if (user) {
                req.user = user;
                next();
            }
            else {
                res.status(401);
                throw new Error('Not authorized, user not found');
            }
        }
        catch (error) {
            res.status(401);
            next(new Error('Not authorized, token failed'));
        }
    }
    else {
        res.status(401);
        next(new Error('Not authorized, no token'));
    }
};
exports.protect = protect;
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    }
    else {
        res.status(401);
        next(new Error('Not authorized as an admin'));
    }
};
exports.admin = admin;
const teacher = (req, res, next) => {
    if (req.user && (req.user.role === 'Teacher' || req.user.role === 'Admin')) {
        next();
    }
    else {
        res.status(401);
        next(new Error('Not authorized as a teacher'));
    }
};
exports.teacher = teacher;
