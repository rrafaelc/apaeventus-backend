export class CreateTicketDto {
  title: string;
  description: string;
  eventDate: string;
  imageUrl?: string | null;
  quantity: number;
  price: number;
}
