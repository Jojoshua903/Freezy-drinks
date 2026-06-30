/* ============================================================
   Freezy Drinks — shared cart engine (runs on every page)
   - Cart persists in localStorage so it survives page changes.
   - Renders the slide-out drawer (present on every page).
   - Page-specific code (menu grid, builder, cart page) lives in
     each page and calls the helpers exposed here.
   ============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const money = n => '€' + Number(n).toFixed(2).replace('.', ',');

/* Hand-drawn glass illustration, tinted per drink — replaces emoji so the
   menu doesn't read as a stock template. Each drink gets its own fill. */
const DRINK_TINT = {
  fruity:['#e6a23c','#d96b4a'], coffee:['#7a4a2b','#3b2418'],
  tea:['#9bbf7a','#5f7d4a'], wellness:['#7fb89a','#3f7a5e'], custom:['#c9a86a','#9c8048']
};
function drinkSVG(cat, seed){
  const [a,b] = DRINK_TINT[cat] || DRINK_TINT.custom;
  const lvl = 30 + (seed % 4)*8;            // varied fill height
  const tilt = (seed % 3) - 1;              // -1,0,1 straw lean
  return `<svg viewBox="0 0 120 150" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs><linearGradient id="g${cat}${seed}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect x="${56+tilt*8}" y="14" width="6" height="58" rx="3" fill="${a}" opacity=".8" transform="rotate(${tilt*7} 59 40)"/>
    <path d="M34 40 h52 l-6 86 a8 8 0 0 1-8 7 H48 a8 8 0 0 1-8-7 Z" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2.5"/>
    <clipPath id="c${cat}${seed}"><path d="M34 40 h52 l-6 86 a8 8 0 0 1-8 7 H48 a8 8 0 0 1-8-7 Z"/></clipPath>
    <rect x="34" y="${132-lvl}" width="52" height="${lvl+14}" fill="url(#g${cat}${seed})" clip-path="url(#c${cat}${seed})"/>
    <ellipse cx="60" cy="${132-lvl}" rx="26" ry="4" fill="rgba(255,255,255,.18)" clip-path="url(#c${cat}${seed})"/>
  </svg>`;
}

const CART_KEY = 'freezy_cart_v1';
let cart = loadCart();

function loadCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart(){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

/* ---------- Cart operations ---------- */
function addToCart(p, opts){
  const lineId = (p.id||'custom') + (opts?('|'+opts.signature):'');
  const existing = cart.find(i=>i.lineId===lineId);
  if(existing){ existing.qty++; }
  else cart.push({lineId, id:p.id, name:p.name, emoji:p.emoji, price:p.price, qty:1, optsText: opts?opts.text:''});
  saveCart(); updateCart();
  toast(`${p.name} toegevoegd`);
}
function changeQty(lineId, delta){
  const it = cart.find(i=>i.lineId===lineId);
  if(!it) return;
  it.qty += delta;
  if(it.qty<=0) cart = cart.filter(i=>i.lineId!==lineId);
  saveCart(); updateCart();
}
function removeItem(lineId){ cart = cart.filter(i=>i.lineId!==lineId); saveCart(); updateCart(); }

function cartSubtotal(){ return cart.reduce((s,i)=>s+i.price*i.qty,0); }
function cartCount(){ return cart.reduce((s,i)=>s+i.qty,0); }
function deliveryFee(){ const s=cartSubtotal(); if(s===0) return 0; return s>=FREE_DELIVERY_OVER?0:DELIVERY_FEE; }

/* ---------- Render: count badge + drawer + cart page ---------- */
function updateCart(){
  $$('.count').forEach(el=>el.textContent = cartCount());
  renderDrawer();
  if(typeof renderCartPage === 'function') renderCartPage();
}

function renderDrawer(){
  const wrap = $('#drawerItems');
  if(!wrap) return;
  if(cart.length===0){
    wrap.innerHTML = '<p class="empty">Je winkelmandje is leeg.<br>Voeg een drankje toe om te beginnen.</p>';
  } else {
    wrap.innerHTML = '';
    cart.forEach(i=>{
      const el = document.createElement('div');
      el.className='ci';
      el.innerHTML = `
        <div class="ci-emoji">${i.emoji||'🥤'}</div>
        <div class="ci-info">
          <h4>${i.name}</h4>
          ${i.optsText?`<div class="opts">${i.optsText}</div>`:''}
          <div class="ci-bottom">
            <div class="qty">
              <button aria-label="decrease">–</button>
              <span>${i.qty}</span>
              <button aria-label="increase">+</button>
            </div>
            <span class="price">${money(i.price*i.qty)}</span>
          </div>
          <button class="remove">Verwijderen</button>
        </div>`;      const [minus,plus] = el.querySelectorAll('.qty button');
      minus.addEventListener('click',()=>changeQty(i.lineId,-1));
      plus.addEventListener('click',()=>changeQty(i.lineId,1));
      el.querySelector('.remove').addEventListener('click',()=>removeItem(i.lineId));
      wrap.appendChild(el);
    });
  }
  const sub = cartSubtotal(), del = deliveryFee();
  if($('#subtotal')) $('#subtotal').textContent = money(sub);
  if($('#delivery')) $('#delivery').textContent = del===0 ? (sub>0?'Gratis':money(0)) : money(del);
  if($('#grandTotal')) $('#grandTotal').textContent = money(sub+del);
  const cb = $('#checkoutBtn'); if(cb) cb.disabled = cart.length===0;
}

/* ---------- Drawer open/close ---------- */
function openCart(){ const o=$('#overlay'),d=$('#drawer'); if(o)o.classList.add('open'); if(d)d.classList.add('open'); }
function closeCart(){ const o=$('#overlay'),d=$('#drawer'); if(o)o.classList.remove('open'); if(d)d.classList.remove('open'); }

/* ---------- Checkout (Stripe via backend) ---------- */
function openCheckout(){
  if(cart.length===0) return;
  closeCart();
  renderCheckoutForm();
  $('#checkoutModal').classList.add('open');
}
function closeCheckout(){ $('#checkoutModal').classList.remove('open'); }

function renderCheckoutForm(){
  const rows = cart.map(i=>`
    <div class="co-row">
      <div class="co-emoji">${i.emoji||'🥤'}</div>
      <div class="co-meta">
        <strong>${i.name}${i.qty>1?` ×${i.qty}`:''}</strong>
        ${i.optsText?`<span>${i.optsText}</span>`:''}
      </div>
      <span class="co-pay-amt">${money(i.price*i.qty)}</span>
    </div>`).join('');
  const sub = cartSubtotal();
  $('#checkoutInner').innerHTML = `
    <h3>Afrekenen</h3>
    <p class="sub">Controleer je bestelling en reken veilig af via Stripe. Je vult je bezorggegevens in op het volgende scherm.</p>
    <div class="co-list">${rows}</div>
    <div class="co-total"><span>Totaal</span><span>${money(sub)}</span></div>
    <div id="coError" class="note" style="display:none"></div>
    <button type="button" id="payBtn" class="btn btn-primary" style="width:100%;justify-content:center;display:flex" onclick="startStripeCheckout()">Veilig ${money(sub)} betalen →</button>
    <button type="button" class="btn btn-ghost" style="width:100%;justify-content:center;display:flex;margin-top:10px" onclick="closeCheckout()">Terug</button>`;
}

async function startStripeCheckout(){
  const btn = $('#payBtn'), err = $('#coError');
  err.style.display='none'; btn.disabled=true; btn.textContent='Veilig afrekenen starten…';
  try {
    // If the customer is logged in, save the order to Firestore first so it
    // shows up in their account and the staff dashboard.
    await saveOrderIfLoggedIn();

    const res = await fetch(CHECKOUT_ENDPOINT, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ items: cart.map(i=>({name:i.name, price:i.price, qty:i.qty, optsText:i.optsText})) })
    });
    if(!res.ok){ const d=await res.json().catch(()=>({})); throw new Error(d.error || 'Afrekenen mislukt.'); }
    const data = await res.json();
    if(!data.url) throw new Error('Geen betaal-URL ontvangen.');
    window.location.href = data.url;
  } catch(e){
    err.textContent = e.message + ' (Staat de backend live en is STRIPE_SECRET_KEY ingesteld?)';
    err.style.display='block';
    btn.disabled=false; btn.textContent = `Veilig ${money(cartSubtotal())} betalen →`;
  }
}

/* Save the current cart as an order in Firestore, if a user is signed in.
   Uses a dynamic import so the shop pages don't need to load Firebase unless
   the customer actually checks out. Fails silently if Firebase isn't set up. */
async function saveOrderIfLoggedIn(){
  try {
    const fb = await import('./firebase.js');
    const user = await new Promise(resolve=>{
      const unsub = fb.auth.onAuthStateChanged(u=>{ unsub(); resolve(u); });
    });
    if(!user) return; // guest checkout — nothing to save to an account
    await fb.createOrder({
      uid: user.uid,
      email: user.email,
      items: cart.map(i=>({ name:i.name, qty:i.qty, price:i.price, optsText:i.optsText||'' })),
      total: cartSubtotal()
    });
  } catch(e){
    // Firebase not configured yet, or rules block it — don't block checkout.
    console.warn('Order niet opgeslagen in account:', e.message);
  }
}

/* Load the shop menu. Tries Firestore first (so staff control the menu via the
   dashboard); falls back to the PRODUCTS list in products.js if Firestore is
   empty, unavailable, or blocked (e.g. the in-browser preview). Always resolves
   with an array, so the shop never looks broken. */
async function loadMenuProducts(){
  try {
    const { db } = await import('./firebase.js');
    const { collection, getDocs, query, orderBy } =
      await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDocs(query(collection(db,'products'), orderBy('name')));
    const items = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    if(items.length > 0){
      // Give each a category fallback so filters/illustrations keep working.
      return items.map(p=>({ cat:'fruity', desc:'', ...p }));
    }
  } catch(e){
    console.warn('Menu uit Firestore niet geladen, val terug op products.js:', e.message);
  }
  return (typeof PRODUCTS !== 'undefined') ? PRODUCTS : [];
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg){
  const t=$('#toast'); if(!t) return;
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),1800);
}

/* ---------- Shared chrome: drawer markup + footer year + nav highlight ---------- */
function injectChrome(){
  // Cart drawer + checkout modal + toast (same on every page)
  const chrome = document.createElement('div');
  chrome.innerHTML = `
    <div class="overlay" id="overlay" onclick="closeCart()"></div>
    <aside class="drawer" id="drawer" aria-label="Winkelmandje">
      <div class="drawer-head">
        <h3>Je winkelmandje</h3>
        <button class="x" onclick="closeCart()">×</button>
      </div>
      <div class="drawer-items" id="drawerItems"></div>
      <div class="drawer-foot">
        <div class="row"><span>Subtotaal</span><span id="subtotal">€0,00</span></div>
        <div class="row"><span>Bezorging</span><span id="delivery">€0,00</span></div>
        <div class="grand"><span id="grandTotal">€0,00</span></div>
        <button class="btn btn-primary checkout-btn" id="checkoutBtn" onclick="openCheckout()" disabled>Afrekenen</button>
        <a class="btn btn-ghost" href="cart.html">Naar winkelmandje</a>
      </div>
    </aside>
    <div class="modal-wrap" id="checkoutModal"><div class="modal" id="checkoutInner"></div></div>
    <div class="toast" id="toast"></div>`;
  document.body.appendChild(chrome);

  // Footer year
  const y = $('#year'); if(y) y.textContent = new Date().getFullYear();

  // Highlight active nav link
  const path = location.pathname.split('/').pop() || 'index.html';
  $$('.nav-links a').forEach(a=>{
    if(a.getAttribute('href')===path) a.classList.add('active');
  });

  // Return-from-Stripe message
  const q = new URLSearchParams(location.search);
  if(q.get('paid')==='1') setTimeout(()=>toast('Betaling ontvangen — bedankt!'),400);
  if(q.get('canceled')==='1') setTimeout(()=>toast('Afrekenen geannuleerd'),400);

  updateCart();
}

document.addEventListener('DOMContentLoaded', injectChrome);
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){closeCart();closeCheckout();} });
