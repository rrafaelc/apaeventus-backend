export class CreateTicketDto {
  title: string;
  description: string;
  imageUrl?: string | null;
  expiresAt: Date;
  quantity: number;
}
