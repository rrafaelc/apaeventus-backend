export const StripeConstants = {
  // URLs de redirecionamento padrão (podem ser sobrescritas pelo frontend)
  defaultSuccessUrl:
    process.env.STRIPE_DEFAULT_SUCCESS_URL ||
    'https://rrafaelc.github.io/apaeventus-pages/payment-success/',
  defaultCancelUrl:
    process.env.STRIPE_DEFAULT_CANCEL_URL ||
    'https://rrafaelc.github.io/apaeventus-pages/payment-failed/',
};
