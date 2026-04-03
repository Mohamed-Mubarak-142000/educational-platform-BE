import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

type CachedConnection = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongoose: CachedConnection | undefined;
}

const globalCache: CachedConnection = global.mongoose ?? { conn: null, promise: null };
global.mongoose = globalCache;

const buildMongoUri = (uri: string) => {
  try {
    const url = new URL(uri);
    url.pathname = '/educational-platform';
    return url.toString();
  } catch {
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
    globalCache.promise = mongoose.connect(mongoUri, opts).then((mongooseInstance) => {
      console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    });
  }

  try {
    globalCache.conn = await globalCache.promise;
  } catch (error: any) {
    globalCache.promise = null;
    console.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }

  return globalCache.conn;
};

export default connectDB;
