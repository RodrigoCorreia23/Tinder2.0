import Stripe from 'stripe';
import prisma from '../../config/database';
import stripe from '../../config/stripe';

export async function createCheckoutSession(userId: string, tier: 'premium' | 'gold') {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const priceId =
    tier === 'gold'
      ? process.env.STRIPE_GOLD_PRICE_ID
      : process.env.STRIPE_PREMIUM_PRICE_ID;

  if (!priceId) {
    throw new Error('Stripe price ID not configured for this tier');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL || 'https://spark-api-yvl3.onrender.com'}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL || 'https://spark-api-yvl3.onrender.com'}/api/payments/cancel`,
    metadata: { userId, tier },
  });

  return { url: session.url, sessionId: session.id };
}

export async function handleWebhook(event: Stripe.Event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const tier = (session.metadata?.tier as 'premium' | 'gold') || 'premium';

    if (userId) {
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + 30);

      await prisma.user.update({
        where: { id: userId },
        data: {
          isPremium: true,
          premiumUntil,
          premiumTier: tier,
        },
      });
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = invoice.subscription as string;

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.userId;

      if (userId) {
        const premiumUntil = new Date();
        premiumUntil.setDate(premiumUntil.getDate() + 30);

        await prisma.user.update({
          where: { id: userId },
          data: { isPremium: true, premiumUntil },
        });
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isPremium: false,
          premiumUntil: null,
          premiumTier: null,
        },
      });
    }
  }
}
