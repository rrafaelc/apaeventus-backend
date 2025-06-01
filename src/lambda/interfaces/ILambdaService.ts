import { SendEmailWithPdfDto } from '../dtos/send-email-with-pdf.dto';

export interface ILambdaService {
  sendEmailWithPdf(sendEmailWithPdfDto: SendEmailWithPdfDto): Promise<void>;
}
