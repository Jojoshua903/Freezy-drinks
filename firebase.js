// firebase.js — shared Firebase setup + auth/data helpers (ES module).
// Loaded with <script type="module"> on login.html, account.html, admin.html.
//
// NOTE: The apiKey below is meant to be public — Firebase identifies the
// project with it. Your data is protected by Firestore Security Rules
// (firestore.rules) and the `isStaff` flag on each user document, NOT by
// hiding this key.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection,
  query, where, orderBy, getDocs, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTLi8Jfwb9KYsexhM93AiuCahRflpnLlw",
  authDomain: "freezy-drinks.firebaseapp.com",
  projectId: "freezy-drinks",
  storageBucket: "freezy-drinks.firebasestorage.app",
  messagingSenderId: "485603229321",
  appId: "1:485603229321:web:5312663f57f7a438485058",
  measurementId: "G-2T9QTGFRLY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- Auth ---------- */
// Register a new customer. Creates a /users/{uid} doc with isStaff:false.
async function register(email, password, name){
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', cred.user.uid), {
    email, name: name || '', isStaff: false, createdAt: serverTimestamp()
  });
  return cred.user;
}
async function login(email, password){
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}
function logout(){ return signOut(auth); }

// Sign in with Google. Creates a /users/{uid} customer doc on first login.
async function loginWithGoogle(){
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  const ref = doc(db, 'users', cred.user.uid);
  const snap = await getDoc(ref);
  if(!snap.exists()){
    await setDoc(ref, {
      email: cred.user.email || '',
      name: cred.user.displayName || '',
      isStaff: false,
      createdAt: serverTimestamp()
    });
  }
  return cred.user;
}

// Fetch the current user's profile doc (incl. isStaff).
async function getProfile(uid){
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/* ---------- Guards (call at top of protected pages) ---------- */
// Resolves with {user, profile}. Redirects to login if not signed in.
// If requireStaff is true, redirects non-staff to account.html.
function requireAuth({ requireStaff = false } = {}){
  return new Promise((resolve)=>{
    onAuthStateChanged(auth, async (user)=>{
      if(!user){ location.href = 'login.html'; return; }
      const profile = await getProfile(user.uid);
      if(requireStaff && !(profile && profile.isStaff)){ location.href = 'account.html'; return; }
      resolve({ user, profile });
    });
  });
}

/* ---------- Orders ---------- */
// Save an order. Used for CASH orders (online orders are written by the webhook
// after payment succeeds). Extra fields default sensibly for backwards-compat.
async function createOrder({ uid, email, items, total, fulfilment='pickup',
                             address='', deliveryFee=0, payment='online',
                             paymentStatus='Betaald' }){
  return addDoc(collection(db, 'orders'), {
    uid, email, items, total,
    fulfilment, address, deliveryFee, payment, paymentStatus,
    status: 'Nieuw',
    createdAt: serverTimestamp()
  });
}
// A customer's own orders (newest first).
async function getMyOrders(uid){
  const q = query(collection(db,'orders'), where('uid','==',uid), orderBy('createdAt','desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({ id:d.id, ...d.data() }));
}
// Live feed of ALL orders for staff.
function watchAllOrders(cb){
  const q = query(collection(db,'orders'), orderBy('createdAt','desc'));
  return onSnapshot(q, snap=> cb(snap.docs.map(d=>({ id:d.id, ...d.data() }))));
}
async function setOrderStatus(orderId, status){
  return updateDoc(doc(db,'orders',orderId), { status });
}

/* ---------- Products (staff-managed) ---------- */
function watchProducts(cb){
  const q = query(collection(db,'products'), orderBy('name'));
  return onSnapshot(q, snap=> cb(snap.docs.map(d=>({ id:d.id, ...d.data() }))));
}
async function addProduct(p){ return addDoc(collection(db,'products'), p); }
async function updateProduct(id, p){ return updateDoc(doc(db,'products',id), p); }

/* ---------- Roles (staff-only, enforced by rules) ---------- */
// Find a user by email and promote/demote staff status.
async function setStaffByEmail(email, isStaff){
  const q = query(collection(db,'users'), where('email','==',email));
  const snap = await getDocs(q);
  if(snap.empty) throw new Error('Geen gebruiker met dit e-mailadres gevonden.');
  const u = snap.docs[0];
  await updateDoc(doc(db,'users',u.id), { isStaff });
  return u.id;
}

const STATUSES = ['Nieuw','In bereiding','Onderweg','Geleverd'];

export {
  auth, db, register, login, loginWithGoogle, logout, getProfile, requireAuth,
  createOrder, getMyOrders, watchAllOrders, setOrderStatus,
  watchProducts, addProduct, updateProduct, setStaffByEmail, STATUSES
};
