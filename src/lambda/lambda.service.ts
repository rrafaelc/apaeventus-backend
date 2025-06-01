import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { Injectable } from '@nestjs/common';
import { SendEmailWithPdfDto } from './dtos/send-email-with-pdf.dto';
import { ILambdaService } from './interfaces/ILambdaService';

@Injectable()
export class LambdaService implements ILambdaService {
  private lambda = new LambdaClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  async sendEmailWithPdf(
    sendEmailWithPdfDto: SendEmailWithPdfDto,
  ): Promise<void> {
    const command = new InvokeCommand({
      FunctionName: process.env.LAMBDA_FUNCTION_NAME,
      Payload: Buffer.from(JSON.stringify(sendEmailWithPdfDto)),
    });

    await this.lambda.send(command);
  }
}
