import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import { awsConstants } from 'src/constants/aws.constants';
import { SendEmailWithPdfDto } from './dtos/send-email-with-pdf.dto';
import { IAWSService } from './interfaces/IAWSService';

@Injectable()
export class AWSService implements IAWSService {
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

      return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new InternalServerErrorException(['Error uploading to S3']);
    }
  }
}
