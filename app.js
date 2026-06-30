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
  const sub = cartSubtotal();
  if($('#subtotal')) $('#subtotal').textContent = money(sub);
  if($('#delivery')) $('#delivery').textContent = 'kies bij afrekenen';
  if($('#grandTotal')) $('#grandTotal').textContent = money(sub);
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

const DELIVER_FEE = 3.00; // bezorgkosten

// Checkout state for fulfilment + payment choice.
const checkoutChoice = { fulfilment: 'pickup', payment: 'online' };

function checkoutDeliveryFee(){ return checkoutChoice.fulfilment === 'deliver' ? DELIVER_FEE : 0; }
function checkoutTotal(){ return cartSubtotal() + checkoutDeliveryFee(); }

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

  $('#checkoutInner').innerHTML = `
    <h3>Afrekenen</h3>
    <p class="sub">Kies hoe je je bestelling wilt ontvangen en betalen.</p>
    <div class="co-list">${rows}</div>

    <div class="opt-group">
      <h4>Ontvangen</h4>
      <div class="opt-row" id="fulfilRow">
        <button type="button" class="opt" data-ful="pickup" data-selected="true">🏫 Ophalen op school <span class="add-price">gratis</span></button>
        <button type="button" class="opt" data-ful="deliver" data-selected="false">🚲 Bezorgen <span class="add-price">+${money(DELIVER_FEE)}</span></button>
      </div>
    </div>

    <div class="auth-field" id="addrField" style="display:none">
      <label>Bezorgadres</label>
      <input id="coAddress" placeholder="Straat, huisnummer, plaats">
    </div>

    <div class="opt-group">
      <h4>Betalen</h4>
      <div class="opt-row" id="payRow">
        <button type="button" class="opt" data-pay="online" data-selected="true">💳 Online (iDEAL/kaart)</button>
        <button type="button" class="opt" data-pay="cash" data-selected="false">💶 Contant bij ontvangst</button>
      </div>
    </div>

    <div class="co-total"><span>Totaal</span><span id="coTotal">${money(checkoutTotal())}</span></div>
    <div id="coError" class="note" style="display:none"></div>
    <button type="button" id="payBtn" class="btn btn-primary" style="width:100%;justify-content:center;display:flex" onclick="placeOrder()">${payBtnLabel()}</button>
    <button type="button" class="btn btn-ghost" style="width:100%;justify-content:center;display:flex;margin-top:10px" onclick="closeCheckout()">Terug</button>`;

  // Fulfilment toggle
  $('#fulfilRow').querySelectorAll('.opt').forEach(b=>{
    b.addEventListener('click', ()=>{
      checkoutChoice.fulfilment = b.dataset.ful;
      $('#fulfilRow').querySelectorAll('.opt').forEach(x=>x.dataset.selected='false');
      b.dataset.selected='true';
      $('#addrField').style.display = checkoutChoice.fulfilment==='deliver' ? 'block' : 'none';
      refreshCheckoutTotals();
    });
  });
  // Payment toggle
  $('#payRow').querySelectorAll('.opt').forEach(b=>{
    b.addEventListener('click', ()=>{
      checkoutChoice.payment = b.dataset.pay;
      $('#payRow').querySelectorAll('.opt').forEach(x=>x.dataset.selected='false');
      b.dataset.selected='true';
      refreshCheckoutTotals();
    });
  });
}

function payBtnLabel(){
  return checkoutChoice.payment==='cash'
    ? `Bestelling plaatsen · ${money(checkoutTotal())}`
    : `Veilig ${money(checkoutTotal())} betalen →`;
}
function refreshCheckoutTotals(){
  const t = $('#coTotal'); if(t) t.textContent = money(checkoutTotal());
  const b = $('#payBtn'); if(b) b.textContent = payBtnLabel();
}

// Single entry point for the checkout button — routes to cash or online.
async function placeOrder(){
  if(checkoutChoice.fulfilment==='deliver'){
    const addr = ($('#coAddress')?.value || '').trim();
    if(!addr){ showCoError('Vul een bezorgadres in.'); return; }
  }
  if(checkoutChoice.payment==='cash') return placeCashOrder();
  return startStripeCheckout();
}
function showCoError(msg){ const e=$('#coError'); if(e){ e.textContent=msg; e.style.display='block'; } }

// Cash: place the order immediately (no Stripe), status "Onbetaald (contant)".
async function placeCashOrder(){
  const btn = $('#payBtn'); btn.disabled=true; btn.textContent='Bestelling plaatsen…';
  try {
    const fb = await import('./firebase.js');
    const user = await new Promise(resolve=>{ const u=fb.auth.onAuthStateChanged(x=>{u();resolve(x);}); });
    if(!user){ showCoError('Log in om een contante bestelling te plaatsen.'); btn.disabled=false; btn.textContent=payBtnLabel(); return; }
    await fb.createOrder({
      uid: user.uid, email: user.email,
      items: cart.map(i=>({ name:i.name, qty:i.qty, price:i.price, optsText:i.optsText||'' })),
      total: checkoutTotal(),
      fulfilment: checkoutChoice.fulfilment,
      address: checkoutChoice.fulfilment==='deliver' ? ($('#coAddress')?.value||'').trim() : '',
      deliveryFee: checkoutDeliveryFee(),
      payment: 'contant',
      paymentStatus: 'Onbetaald (contant)'
    });
    cart = []; saveCart(); updateCart(); closeCheckout();
    toast('Bestelling geplaatst — betaal contant bij ontvangst.');
  } catch(e){
    showCoError('Bestelling plaatsen mislukt: ' + e.message);
    btn.disabled=false; btn.textContent=payBtnLabel();
  }
}

async function startStripeCheckout(){
  const btn = $('#payBtn'), err = $('#coError');
  err.style.display='none'; btn.disabled=true; btn.textContent='Veilig afrekenen starten…';
  try {
    const fb = await import('./firebase.js').catch(()=>null);
    let uid = '', email = '';
    if(fb){
      const user = await new Promise(resolve=>{ const u=fb.auth.onAuthStateChanged(x=>{u();resolve(x);}); });
      if(user){ uid = user.uid; email = user.email || ''; }
    }
    const res = await fetch(CHECKOUT_ENDPOINT, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        items: cart.map(i=>({name:i.name, price:i.price, qty:i.qty, optsText:i.optsText})),
        fulfilment: checkoutChoice.fulfilment,
        address: checkoutChoice.fulfilment==='deliver' ? ($('#coAddress')?.value||'').trim() : '',
        deliveryFee: checkoutDeliveryFee(),
        uid, email
      })
    });
    if(!res.ok){ const d=await res.json().catch(()=>({})); throw new Error(d.error || 'Afrekenen mislukt.'); }
    const data = await res.json();
    if(!data.url) throw new Error('Geen betaal-URL ontvangen.');
    window.location.href = data.url;
  } catch(e){
    err.textContent = e.message + ' (Staat de backend live en is STRIPE_SECRET_KEY ingesteld?)';
    err.style.display='block';
    btn.disabled=false; btn.textContent = payBtnLabel();
  }
}

/* Load the shop menu. Tries Firestore first (so staff control the menu via the
   dashboard); falls back to the PRODUCTS list in products.js if Firestore is
   empty, unavailable, blocked, or slow. Always resolves with an array within a
   few seconds, so the shop never hangs or looks broken. */
async function loadMenuProducts(){
  const fallback = (typeof PRODUCTS !== 'undefined') ? PRODUCTS : [];
  try {
    const withTimeout = (p, ms) => Promise.race([
      p, new Promise((_, rej)=> setTimeout(()=> rej(new Error('timeout')), ms))
    ]);
    const items = await withTimeout((async ()=>{
      const { db } = await import('./firebase.js');
      const { collection, getDocs, query, orderBy } =
        await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const snap = await getDocs(query(collection(db,'products'), orderBy('name')));
      return snap.docs.map(d=>({ id:d.id, ...d.data() }));
    })(), 4000);
    if(items && items.length > 0){
      return items.map(p=>({ cat:'fruity', desc:'', ...p }));
    }
  } catch(e){
    console.warn('Menu uit Firestore niet geladen, val terug op products.js:', e.message);
  }
  return fallback;
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
  addStaffNavLink();
}

/* If a staff member is logged in, add a "Dashboard" link to the nav so they
   can reach admin.html from any page. Hidden for customers and guests.
   Uses a dynamic import so shop pages don't hard-depend on Firebase. */
async function addStaffNavLink(){
  try {
    const fb = await import('./firebase.js');
    fb.auth.onAuthStateChanged(async (user)=>{
      const nav = document.querySelector('.nav-links');
      if(!nav) return;
      const existing = nav.querySelector('a[data-staff-link]');
      if(!user){ if(existing) existing.remove(); return; }
      const profile = await fb.getProfile(user.uid);
      if(profile && profile.isStaff){
        if(!existing){
          const a = document.createElement('a');
          a.href = 'admin.html';
          a.textContent = 'Dashboard';
          a.dataset.staffLink = '1';
          nav.appendChild(a);
        }
      } else if(existing){ existing.remove(); }
    });
  } catch(e){ /* Firebase niet beschikbaar — geen dashboard-link, geen probleem */ }
}

document.addEventListener('DOMContentLoaded', injectChrome);
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){closeCart();closeCheckout();} });
