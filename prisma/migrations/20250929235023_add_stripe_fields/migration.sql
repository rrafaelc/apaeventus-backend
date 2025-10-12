-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "stripePriceId" TEXT;

-- AlterTable
ALTER TABLE "TicketSale" ADD COLUMN     "paymentStatus" TEXT DEFAULT 'pending',
ADD COLUMN     "stripeSessionId" TEXT;
