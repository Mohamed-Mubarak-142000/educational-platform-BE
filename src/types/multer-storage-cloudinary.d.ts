declare module 'multer-storage-cloudinary' {
  import type { Request } from 'express';
  import type { StorageEngine } from 'multer';

  export class CloudinaryStorage implements StorageEngine {
    constructor(options: any);
    _handleFile(
      req: Request,
      file: Express.Multer.File,
      cb: (error?: unknown, info?: Partial<Express.Multer.File>) => void
    ): void;
    _removeFile(
      req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null) => void
    ): void;
  }
}
