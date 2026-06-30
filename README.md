# Freezy Drinks — site + Stripe checkout (Vercel)

This folder is **ready to deploy as-is**. It contains the website (`index.html`)
and the Stripe checkout function (`api/checkout.js`) together, so Vercel serves
the site and runs the function on one domain. Works for the signature menu AND
build-your-own drinks at any price.

## How it stays secure
- The Stripe **secret key** lives ONLY in a Vercel Environment Variable.
- It is never in the website, never in this code, never sent to the browser.
- Customers enter card details on **Stripe's own hosted page**, not your site.

## Files
- `index.html` — Home page
- `menu.html` — Full menu + build-your-own drink builder
- `cart.html` — Full cart page → Stripe checkout
- `about.html` — About + contact
- `styles.css` — Shared styles for all pages
- `products.js` — Drinks, builder options, prices (edit your menu here)
- `app.js` — Shared cart engine (persists in the browser via localStorage)
- `api/checkout.js` — the serverless function (creates the Checkout Session)
- `package.json` — declares the `stripe` dependency
- `.env.example` — the env vars you need (copy to `.env` for local testing only)

The cart is shared across every page (saved in the browser), with a slide-out
drawer everywhere plus a full cart page.

## Deploy (about 15 minutes)

1. **Get your Stripe secret key**
   - Stripe dashboard → Developers → API keys → copy the **Secret key**.
   - Use the **test** key (`sk_test_…`) first; switch to the live key when ready.

2. **Put this whole folder in a Git repo** (GitHub is easiest for Vercel).
   - Upload the entire `freezy-drinks-deploy` folder as the repo root. The site
     and the `api/` folder are already side by side — don't separate them.
     Vercel serves `index.html` statically and runs
     anything in `api/` as a function automatically.

3. **Import the repo at https://vercel.com/new** and deploy.

4. **Add Environment Variables** in Vercel
   - Project → Settings → Environment Variables:
     - `STRIPE_SECRET_KEY` = your `sk_test_…` key
     - `SITE_URL` = your deployed site URL (e.g. `https://freezy-drinks.vercel.app`)
   - Redeploy so they take effect.

5. **Point the site at the function**
   - In `index.html`, `CHECKOUT_ENDPOINT` is `/api/checkout` — correct if the
     site and function are in the same Vercel project. If the backend is a
     separate deploy, set the full URL instead.

6. **Test with a Stripe test card**
   - Card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
   - You should land back on the site with a "Payment received" message.

7. **Go live**
   - Activate your Stripe account, swap `STRIPE_SECRET_KEY` for the live
     `sk_live_…` key, redeploy.

## Optional next steps
- **Email confirmations / receipts:** enable in Stripe (Settings → Customer emails).
- **Order notifications:** add a Stripe webhook to email yourself on each sale.
- **Delivery fee / promo codes:** can be added to the Checkout Session — ask and I'll wire it in.

---

# Accounts, login & dashboards (Firebase)

The site has customer accounts, a customer "my orders" page, and a staff
dashboard (manage products, handle orders, assign staff). This runs on Firebase.

## Files
- `firebase.js` — Firebase setup + auth/data helpers (your config is already in it)
- `firestore.rules` — **security rules — you MUST paste these into Firebase**
- `login.html` — log in / register (customers and staff use the same page)
- `account.html` — customer sees their own orders + status
- `admin.html` — staff: products, all orders + status, assign staff role

## One-time Firebase setup (~10 min)
1. Go to the [Firebase Console](https://console.firebase.google.com/) → project **freezy-drinks**.
2. **Authentication** → Get started → enable **Email/Password**.
3. **Firestore Database** → Create database → start in *production* mode.
4. **Firestore → Rules** → paste the entire contents of `firestore.rules` → **Publish**.
   This is what actually protects your data. Don't skip it.

## Make the FIRST staff member (chicken-and-egg)
The staff dashboard can promote people, but the very first staff account must be
set by hand:
1. Open the live site → **Inloggen** → register an account (e.g. the owner's).
2. In Firebase Console → **Firestore → Data → `users`** → open that user's document.
3. Change `isStaff` from `false` to `true` → Save.
4. Log in again → you'll land on `admin.html`. From now on you can promote
   anyone else from the dashboard (Medewerkers beheren).

## How it fits together
- Customers register/log in, and any checkout while logged in saves the order to
  Firestore (`orders`), visible on their `account.html` and the staff dashboard.
- Guests can still check out via Stripe; their order just isn't tied to an account.
- Staff change order status (Nieuw → In bereiding → Onderweg → Geleverd) and it
  updates live for everyone.
- Products added in the dashboard are stored in Firestore (`products`). The
  public shop (home + menu) reads its menu from Firestore, so the dashboard
  controls what customers see. If Firestore has no products yet (or can't load,
  e.g. in the preview), the shop falls back to the starter list in `products.js`.
  The build-your-own options stay in `products.js` by design.

## Important: preview vs. live
The in-browser preview blocks Firebase's scripts (sandbox restriction), so login
won't work in the preview. **It works once deployed to Vercel** (or any normal
host). Test accounts/dashboards on the live URL, not the preview.

