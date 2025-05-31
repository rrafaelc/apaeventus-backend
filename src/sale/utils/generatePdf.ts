import { Ticket, User } from '@prisma/client';
import * as dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { readFileSync } from 'fs';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { PDFDocument } from 'pdf-lib';

export const generatePdf = async (
  qrCodeBuffer: Buffer<ArrayBufferLike>,
  ticket: Ticket,
  user: User,
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

  page.drawText(`Evento: ${ticket.title}`, { x: 50, y: 450, size: 18 });

  page.drawText(`Data do evento`, { x: 50, y: 420, size: 14 });
  page.drawText(dayjs(ticket.eventDate).locale('pt-br').format('DD/MM/YYYY'), {
    x: 50,
    y: 405,
    size: 10,
  });
  const eventDate = dayjs(ticket.eventDate).locale('pt-br');
  const dayOfWeek = eventDate.format('dddd');
  const time = eventDate.format('HH:mm');
  page.drawText(
    `${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)} às ${time}`,
    {
      x: 50,
      y: 392,
      size: 10,
    },
  );

  page.drawText(`Nome: ${user.name}`, { x: 50, y: 362, size: 14 });
  page.drawText(`Email: ${user.email}`, {
    x: 50,
    y: 347,
    size: 10,
  });
  page.drawText(
    `Celular: ${user.cellphone ? formatPhoneNumber(user.cellphone) : 'N/A'}`,
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
