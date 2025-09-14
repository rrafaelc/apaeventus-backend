import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as path from 'path';
import { awsConstants } from 'src/constants/aws.constants';
import { SendEmailWithPdfDto } from './dtos/send-email-with-pdf.dto';
import { SendEmailDto } from './dtos/send-email.dto';
import { IAWSService } from './interfaces/IAWSService';

@Injectable()
export class AWSService implements IAWSService {
  private readonly logger = new Logger(AWSService.name);
  private lambda = new LambdaClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: awsConstants.aws_access_key_id!,
      secretAccessKey: awsConstants.aws_secret_access_key!,
    },
  });

  private s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: awsConstants.aws_access_key_id!,
      secretAccessKey: awsConstants.aws_secret_access_key!,
    },
  });

  async sendEmail(sendEmailDto: SendEmailDto): Promise<void> {
    this.logger.debug(`Sending email to: ${sendEmailDto.to}`);

    try {
      const command = new InvokeCommand({
        FunctionName: awsConstants.lambda_send_email_function_name!,
        Payload: Buffer.from(JSON.stringify(sendEmailDto)),
      });

      await this.lambda.send(command);
      this.logger.log(`Email sent successfully to: ${sendEmailDto.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to: ${sendEmailDto.to}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendEmailWithPdf(
    sendEmailWithPdfDto: SendEmailWithPdfDto,
  ): Promise<void> {
    const command = new InvokeCommand({
      FunctionName: awsConstants.lambda_function_name!,
      Payload: Buffer.from(JSON.stringify(sendEmailWithPdfDto)),
    });

    await this.lambda.send(command);
  }

  async uploadFileToS3(file: Express.Multer.File): Promise<string> {
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
    const bucketName = awsConstants.s3_bucket_name!;

    this.logger.debug(
      `Uploading file to S3: ${fileName}, size: ${file.size} bytes`,
    );

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
        }),
      );

      const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      this.logger.log(`File uploaded successfully to S3: ${fileName}`);

      return fileUrl;
    } catch (error) {
      this.logger.error(`Error uploading file to S3: ${fileName}`, error.stack);
      throw new InternalServerErrorException(['Error uploading to S3']);
    }
  }

  async uploadBufferToS3(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
    const bucketName = awsConstants.s3_bucket_name!;

    this.logger.debug(
      `Uploading buffer to S3: ${fileName}, size: ${buffer.length} bytes, type: ${mimeType}`,
    );

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: buffer,
          ContentType: mimeType,
          ACL: 'public-read',
        }),
      );

      const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      this.logger.log(`Buffer uploaded successfully to S3: ${fileName}`);

      return fileUrl;
    } catch (error) {
      this.logger.error(
        `Error uploading buffer to S3: ${fileName}`,
        error.stack,
      );
      throw new InternalServerErrorException(['Error uploading to S3']);
    }
  }
}
