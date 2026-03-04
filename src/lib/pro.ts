export const PRO_STORAGE_KEY = "bankrollpro_isPro";

export function getPaymentLink() {
  return process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "";
}