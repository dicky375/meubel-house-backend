import { cloudinary } from '../../config/cloudinary';
import { BadRequestError } from '../../utils/errors';

export class UploadService {
  static async uploadImage(
    file: Express.Multer.File,
    folder = 'meubel-house/products'
  ): Promise<{ url: string; publicId: string }> {
    if (!file) throw new BadRequestError('No file provided');

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            return reject(new BadRequestError(error?.message || 'Upload failed'));
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(file.buffer);
    });
  }

  static async uploadMultiple(
    files: Express.Multer.File[],
    folder?: string
  ): Promise<string[]> {
    const results = await Promise.all(files.map((f) => this.uploadImage(f, folder)));
    return results.map((r) => r.url);
  }

  static async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
