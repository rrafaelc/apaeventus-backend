/*
  Warnings:

  - You are about to drop the `_UserTickets` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_UserTickets" DROP CONSTRAINT "_UserTickets_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserTickets" DROP CONSTRAINT "_UserTickets_B_fkey";

-- DropTable
DROP TABLE "_UserTickets";

-- CreateTable
CREATE TABLE "UserTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTicket_userId_ticketId_key" ON "UserTicket"("userId", "ticketId");

-- AddForeignKey
ALTER TABLE "UserTicket" ADD CONSTRAINT "UserTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTicket" ADD CONSTRAINT "UserTicket_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
