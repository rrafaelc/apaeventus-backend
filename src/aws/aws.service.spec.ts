import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { InternalServerErrorException } from '@nestjs/common';
import { AWSService } from './aws.service';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-lambda');
jest.mock('@aws-sdk/client-s3');

describe('AWSService', () => {
  let service: AWSService;
  let mockLambdaSend: jest.Mock;
  let mockS3Send: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLambdaSend = jest.fn();
    mockS3Send = jest.fn();

    (LambdaClient as jest.Mock).mockImplementation(() => ({
      send: mockLambdaSend,
    }));

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockS3Send,
    }));

    service = new AWSService();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const sendEmailDto = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      };

      mockLambdaSend.mockResolvedValue({});

      await service.sendEmail(sendEmailDto);

      expect(mockLambdaSend).toHaveBeenCalledTimes(1);
      expect(mockLambdaSend).toHaveBeenCalledWith(expect.any(InvokeCommand));
    });

    it('should throw error when lambda invocation fails', async () => {
      const sendEmailDto = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      };

      const error = new Error('Lambda error');
      mockLambdaSend.mockRejectedValue(error);

      await expect(service.sendEmail(sendEmailDto)).rejects.toThrow(error);
      expect(mockLambdaSend).toHaveBeenCalledTimes(1);
    });

    it('should create InvokeCommand with correct payload', async () => {
      const sendEmailDto = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      };

      mockLambdaSend.mockResolvedValue({});

      await service.sendEmail(sendEmailDto);

      const callArg = mockLambdaSend.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(InvokeCommand);
    });
  });

  describe('sendEmailWithPdf', () => {
    it('should send email with PDF successfully', async () => {
      const sendEmailWithPdfDto = {
        to: 'test@example.com',
        subject: 'Test with PDF',
        text: 'Email body text',
        pdf: 'base64pdfstring',
      };

      mockLambdaSend.mockResolvedValue({});

      await service.sendEmailWithPdf(sendEmailWithPdfDto);

      expect(mockLambdaSend).toHaveBeenCalledTimes(1);
      expect(mockLambdaSend).toHaveBeenCalledWith(expect.any(InvokeCommand));
    });

    it('should throw error when lambda invocation fails', async () => {
      const sendEmailWithPdfDto = {
        to: 'test@example.com',
        subject: 'Test with PDF',
        text: 'Email body text',
        pdf: 'base64pdfstring',
      };

      const error = new Error('Lambda error');
      mockLambdaSend.mockRejectedValue(error);

      await expect(
        service.sendEmailWithPdf(sendEmailWithPdfDto),
      ).rejects.toThrow(error);
    });
  });

  describe('uploadFileToS3', () => {
    it('should upload file to S3 successfully', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      mockS3Send.mockResolvedValue({});

      const result = await service.uploadFileToS3(mockFile);

      expect(mockS3Send).toHaveBeenCalledTimes(1);
      expect(mockS3Send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(result).toMatch(/^https:\/\/.+\.s3\..+\.amazonaws\.com\/.+\.jpg$/);
    });

    it('should throw InternalServerErrorException when upload fails', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      mockS3Send.mockRejectedValue(new Error('S3 error'));

      await expect(service.uploadFileToS3(mockFile)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should preserve file extension when uploading', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'document.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 2048,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      mockS3Send.mockResolvedValue({});

      const result = await service.uploadFileToS3(mockFile);

      expect(result).toMatch(/\.pdf$/);
    });

    it('should generate unique filename', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      mockS3Send.mockResolvedValue({});

      const result1 = await service.uploadFileToS3(mockFile);
      const result2 = await service.uploadFileToS3(mockFile);

      const filename1 = result1.split('/').pop();
      const filename2 = result2.split('/').pop();

      expect(filename1).not.toBe(filename2);
    });
  });

  describe('uploadBufferToS3', () => {
    it('should upload buffer to S3 successfully', async () => {
      const buffer = Buffer.from('test content');
      const fileName = 'test-file.pdf';
      const mimeType = 'application/pdf';

      mockS3Send.mockResolvedValue({});

      const result = await service.uploadBufferToS3(buffer, fileName, mimeType);

      expect(mockS3Send).toHaveBeenCalledTimes(1);
      expect(mockS3Send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(result).toContain(fileName);
      expect(result).toMatch(/^https:\/\/.+\.s3\..+\.amazonaws\.com\/.+$/);
    });

    it('should throw InternalServerErrorException when upload fails', async () => {
      const buffer = Buffer.from('test data');
      const fileName = 'test-file.pdf';
      const mimeType = 'application/pdf';

      mockS3Send.mockRejectedValue(new Error('S3 error'));

      await expect(
        service.uploadBufferToS3(buffer, fileName, mimeType),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should use correct content type when uploading', async () => {
      const buffer = Buffer.from('test content');
      const fileName = 'image.png';
      const mimeType = 'image/png';

      mockS3Send.mockResolvedValue({});

      await service.uploadBufferToS3(buffer, fileName, mimeType);

      const callArg = mockS3Send.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(PutObjectCommand);
    });
  });

  describe('deleteFileFromS3', () => {
    it('should delete file from S3 successfully', async () => {
      const fileUrl =
        'https://bucket-name.s3.us-east-1.amazonaws.com/test-file.jpg';

      mockS3Send.mockResolvedValue({});

      await service.deleteFileFromS3(fileUrl);

      expect(mockS3Send).toHaveBeenCalledTimes(1);
      expect(mockS3Send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('should throw InternalServerErrorException for invalid URL', async () => {
      const invalidUrl = 'https://bucket-name.s3.us-east-1.amazonaws.com/';

      mockS3Send.mockResolvedValue({});

      await expect(service.deleteFileFromS3(invalidUrl)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException when deletion fails', async () => {
      const fileUrl =
        'https://bucket-name.s3.us-east-1.amazonaws.com/test-file.jpg';

      mockS3Send.mockRejectedValue(new Error('S3 delete error'));

      await expect(service.deleteFileFromS3(fileUrl)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should extract filename correctly from URL', async () => {
      const fileUrl =
        'https://bucket-name.s3.us-east-1.amazonaws.com/folder/subfolder/file.jpg';

      mockS3Send.mockResolvedValue({});

      await service.deleteFileFromS3(fileUrl);

      expect(mockS3Send).toHaveBeenCalledTimes(1);
    });
  });

  describe('AWS SDK initialization', () => {
    it('should initialize Lambda client with correct configuration', () => {
      expect(LambdaClient).toHaveBeenCalledWith({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    });

    it('should initialize S3 client with correct configuration', () => {
      expect(S3Client).toHaveBeenCalledWith({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    });
  });
});
