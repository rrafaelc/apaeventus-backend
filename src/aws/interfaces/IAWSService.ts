import { SendEmailWithPdfDto } from '../dtos/send-email-with-pdf.dto';

export interface IAWSService {
  sendEmailWithPdf(sendEmailWithPdfDto: SendEmailWithPdfDto): Promise<void>;
  uploadFileToS3(file: Express.Multer.File): Promise<string>;
}
