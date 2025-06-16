import { SendEmailWithPdfDto } from '../dtos/send-email-with-pdf.dto';
import { SendEmailDto } from '../dtos/send-email.dto';

export interface IAWSService {
  sendEmail(sendEmailDto: SendEmailDto): Promise<void>;
  sendEmailWithPdf(sendEmailWithPdfDto: SendEmailWithPdfDto): Promise<void>;
  uploadFileToS3(file: Express.Multer.File): Promise<string>;
}
