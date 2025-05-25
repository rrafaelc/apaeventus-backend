import { Ticket, User } from '@prisma/client';
import { readFileSync } from 'fs';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { PDFDocument } from 'pdf-lib';

export const generatePdf = async (
  qrCodeBuffer: Buffer<ArrayBufferLike>,
  ticket: Ticket,
  seller: User,
  customer: User,
): Promise<Uint8Array<ArrayBufferLike>> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 600]);

  const logoPath = 'src/assets/images/apaelogo.png';
  const logoBuffer = readFileSync(logoPath);
  const apaeImage = await pdfDoc.embedPng(logoBuffer);

  page.drawImage(apaeImage, {
    x: 50,
    y: 480,
    width: 300,
    height: 100,
  });

  page.drawText(`Ingresso: ${ticket.title}`, { x: 50, y: 450, size: 18 });

  page.drawText(`Vendedor: ${seller.name}`, { x: 50, y: 420, size: 14 });
  page.drawText(`Email: ${seller.email}`, {
    x: 50,
    y: 405,
    size: 10,
  });
  page.drawText(
    `Celular: ${seller.cellphone ? formatPhoneNumber(seller.cellphone) : 'N/A'}`,
    {
      x: 50,
      y: 392,
      size: 10,
    },
  );

  page.drawText(`Cliente: ${customer.name}`, { x: 50, y: 362, size: 14 });
  page.drawText(`Email: ${customer.email}`, {
    x: 50,
    y: 347,
    size: 10,
  });
  page.drawText(
    `Celular: ${customer.cellphone ? formatPhoneNumber(customer.cellphone) : 'N/A'}`,
    {
      x: 50,
      y: 334,
      size: 10,
    },
  );

  page.drawText('Mostre este QRCODE na recepção da APAE', {
    x: 50,
    y: 300,
    size: 14,
  });

  page.drawText(`Valor: R$ ${ticket.price.toFixed(2)}`, {
    x: 50,
    y: 280,
    size: 14,
  });

  const qrImage = await pdfDoc.embedPng(qrCodeBuffer);
  page.drawImage(qrImage, {
    x: 110,
    y: 110,
    width: 160,
    height: 160,
  });

  page.drawText('Obrigado por ajudar a APAE!', { x: 40, y: 80, size: 24 });

  const pdfBytes = await pdfDoc.save();

  return pdfBytes;
};

const formatPhoneNumber = (phoneNumber: string): string => {
  const parsedPhoneNumber = parsePhoneNumberFromString(phoneNumber, 'BR');
  if (parsedPhoneNumber) {
    return parsedPhoneNumber.formatNational();
  }

  return phoneNumber;
};
