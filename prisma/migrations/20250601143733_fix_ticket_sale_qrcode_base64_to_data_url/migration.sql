/*
  Warnings:

  - You are about to drop the column `qrCodeBase64` on the `TicketSale` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TicketSale" DROP COLUMN "qrCodeBase64",
ADD COLUMN     "qrCodeDataUrl" TEXT;
