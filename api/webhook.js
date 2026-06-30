// api/webhook.js — Stripe webhook. Creates the order in Firestore ONLY after
// Stripe confirms the payment succeeded. This is the robust "order pas na
// betaling" path you chose.
//
// Needs these Vercel Environment Variables:
//   STRIPE_SECRET_KEY          (you already have this)
//   STRIPE_WEBHOOK_SECRET      (from Stripe → Developers → Webhooks → your endpoint)
//   FIREBASE_SERVICE_ACCOUNT   (the full JSON of a Firebase service account key)
//
// See README ("Webhook setup") for exactly how to get these.

import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Init Firebase Admin once (reused across invocations).
function db() {
  if (!getApps().length) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(svc) });
  }
  return getFirestore();
}

// Stripe needs the raw request body to verify the signature.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let event;
  try {
    const raw = await readRawBody(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const m = s.metadata || {};
    let items = [];
    try { items = JSON.parse(m.items || '[]').map(i => ({ name:i.n, qty:i.q, price:i.p, optsText:i.o||'' })); }
    catch { items = []; }

    try {
      await db().collection('orders').add({
        uid: m.uid || '',
        email: m.email || s.customer_details?.email || '',
        items,
        total: (s.amount_total || 0) / 100,
        fulfilment: m.fulfilment || 'pickup',
        address: m.address || s.shipping_details?.address ? JSON.stringify(s.shipping_details?.address || m.address) : (m.address || ''),
        deliveryFee: Number(m.deliveryFee || 0),
        payment: 'online',
        paymentStatus: 'Betaald',
        status: 'Nieuw',
        stripeSessionId: s.id,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('Kon order niet opslaan:', err.message);
      return res.status(500).send('Kon order niet opslaan');
    }
  }

  return res.status(200).json({ received: true });
}
