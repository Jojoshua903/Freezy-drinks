// api/checkout.js
// Vercel Serverless Function — creates one Stripe Checkout Session for the whole cart.
//
// SECURITY: This runs on Vercel's servers, NOT in the browser. Your Stripe
// secret key lives only in a Vercel Environment Variable (STRIPE_SECRET_KEY).
// It is never sent to or visible in the website. Never paste the secret key
// into any file in this repo or into the site HTML.

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// The public origin of your site, e.g. https://freezydrinks.com
// Set this in Vercel env vars too (SITE_URL). Falls back to the request origin.
function getSiteUrl(req) {
  return process.env.SITE_URL || `https://${req.headers.host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items, fulfilment, address, uid, email } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    // Build Stripe line items. We send price + name from the cart, but we
    // re-validate amounts server-side so the client can't send a €0 price.
    const line_items = items.map((item) => {
      const name = String(item.name || 'Drink').slice(0, 120);
      const description = item.optsText ? String(item.optsText).slice(0, 200) : undefined;
      const unitAmount = Math.round(Number(item.price) * 100); // euros -> cents
      const quantity = Math.max(1, Math.min(99, parseInt(item.qty, 10) || 1));

      if (!Number.isFinite(unitAmount) || unitAmount < 50) {
        throw new Error(`Invalid price for "${name}".`);
      }

      return {
        quantity,
        price_data: {
          currency: 'eur',
          unit_amount: unitAmount,
          product_data: { name, ...(description ? { description } : {}) },
        },
      };
    });

    // Add a €3 delivery fee line when the customer chose delivery.
    const isDelivery = fulfilment === 'deliver';
    if (isDelivery) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: 300,
          product_data: { name: 'Bezorgkosten' },
        },
      });
    }

    // The order is written to Firestore by the webhook AFTER payment succeeds.
    // We pass everything it needs as metadata (Stripe metadata values are
    // strings, so the cart is JSON-encoded; kept compact and under limits).
    const compactItems = items.map(i => ({ n:i.name, q:i.qty, p:i.price, o:i.optsText||'' }));
    const metadata = {
      uid: String(uid || ''),
      email: String(email || ''),
      fulfilment: isDelivery ? 'deliver' : 'pickup',
      address: String(address || '').slice(0, 300),
      deliveryFee: isDelivery ? '3' : '0',
      items: JSON.stringify(compactItems).slice(0, 4500),
    };

    const siteUrl = getSiteUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      locale: 'nl',
      metadata,
      ...(email ? { customer_email: email } : {}),
      // Collect delivery address + let Stripe handle email receipts.
      shipping_address_collection: { allowed_countries: ['NL', 'BE'] },
      phone_number_collection: { enabled: true },
      success_url: `${siteUrl}/?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?canceled=1`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    return res.status(500).json({ error: err.message || 'Could not start checkout.' });
  }
}
