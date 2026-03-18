import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import stripe from '../../config/stripe';
import * as paymentService from './payment.service';

export async function createCheckout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { tier } = req.body;

    if (!tier || !['premium', 'gold'].includes(tier)) {
      return res.status(400).json({ error: 'tier must be "premium" or "gold"' });
    }

    const result = await paymentService.createCheckoutSession(req.userId!, tier);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function webhook(req: Request, res: Response, next: NextFunction) {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return res.status(400).json({ error: 'Missing Stripe signature or webhook secret' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    await paymentService.handleWebhook(event);

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

export async function successPage(_req: Request, res: Response) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Successful - Spark</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #FFF8F0 0%, #FFE6E6 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 40px 24px;
      max-width: 400px;
    }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 28px; color: #2C3E50; margin-bottom: 12px; }
    p { font-size: 16px; color: #7F8C8D; line-height: 1.6; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      background: #FF6B6B;
      color: #fff;
      padding: 14px 32px;
      border-radius: 24px;
      text-decoration: none;
      font-weight: bold;
      font-size: 16px;
    }
    .btn:hover { background: #E55A5A; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#10003;</div>
    <h1>Payment Successful!</h1>
    <p>Your Spark Premium subscription is now active. Return to the app to enjoy all your new features!</p>
    <a class="btn" href="spark://premium-activated">Return to Spark</a>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}

export async function cancelPage(_req: Request, res: Response) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Cancelled - Spark</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F5F5F5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 40px 24px;
      max-width: 400px;
    }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 28px; color: #2C3E50; margin-bottom: 12px; }
    p { font-size: 16px; color: #7F8C8D; line-height: 1.6; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      background: #FF6B6B;
      color: #fff;
      padding: 14px 32px;
      border-radius: 24px;
      text-decoration: none;
      font-weight: bold;
      font-size: 16px;
    }
    .btn:hover { background: #E55A5A; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#10060;</div>
    <h1>Payment Cancelled</h1>
    <p>Your payment was cancelled. No charges were made. You can try again anytime from the app.</p>
    <a class="btn" href="spark://home">Return to Spark</a>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}
