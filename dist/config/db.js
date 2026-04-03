"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const globalCache = global.mongoose ?? { conn: null, promise: null };
global.mongoose = globalCache;
const buildMongoUri = (uri) => {
    try {
        const url = new URL(uri);
        url.pathname = '/EducationalPlatformBiology';
        return url.toString();
    }
    catch {
        return uri;
    }
};
const connectDB = async () => {
    if (globalCache.conn) {
        return globalCache.conn;
    }
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI environment variable is not defined');
    }
    if (!globalCache.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };
        const mongoUri = buildMongoUri(process.env.MONGO_URI);
        globalCache.promise = mongoose_1.default.connect(mongoUri, opts).then((mongooseInstance) => {
            console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
            return mongooseInstance;
        });
    }
    try {
        globalCache.conn = await globalCache.promise;
    }
    catch (error) {
        globalCache.promise = null;
        console.error(`MongoDB connection error: ${error.message}`);
        throw error;
    }
    return globalCache.conn;
};
exports.default = connectDB;
