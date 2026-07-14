import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import { extname } from 'path';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const url = await this.uploadsService.uploadFile(file, 'images');
    return {
      url,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  @Post('audio')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        const allowedExtensions = [
          '.mp3',
          '.wav',
          '.ogg',
          '.m4a',
          '.webm',
          '.caf',
          '.mp4',
          '.aac',
        ];
        const hasAudioMime = file.mimetype.startsWith('audio/');
        const ext = extname(file.originalname).toLowerCase();
        const hasAllowedExt = allowedExtensions.includes(ext);

        if (!hasAudioMime && !hasAllowedExt) {
          return callback(
            new BadRequestException('Only audio files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const url = await this.uploadsService.uploadFile(file, 'audio');
    return {
      url,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }
}
