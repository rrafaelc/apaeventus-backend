import { Ticket } from '@prisma/client';

export class TicketSaleResponse {
  id: string;
  used: boolean;
  pdfUrl: string | null;
  qrCodeUrl: string | null;
  qrCodeDataUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  ticket: Ticket;
}
