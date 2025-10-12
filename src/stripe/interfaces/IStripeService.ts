export interface IStripeService {
  createCheckoutSession(data: {
    ticketId: string;
    userId: string;
    quantity: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }>;

  createPrice(
    ticketId: string,
    amount: number,
    currency?: string,
  ): Promise<string>;

  constructWebhookEvent(payload: string, signature: string): any;

  handleSuccessfulPayment(sessionId: string): Promise<void>;
}
