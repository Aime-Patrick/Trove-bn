import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(fileUri: string): Promise<any> {
    try {
      const result = await cloudinary.uploader.upload(fileUri, {
        folder: 'trove_avatars',
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  getUploadSignature() {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: 'trove_avatars',
      },
      this.configService.get('CLOUDINARY_API_SECRET') || '',
    );

    return {
      signature,
      timestamp,
      cloudName: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      apiKey: this.configService.get('CLOUDINARY_API_KEY'),
    };
  }
}
