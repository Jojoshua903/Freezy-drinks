/* ============================================================
   Freezy Drinks — shared product data
   The shop reads its menu from Firestore (managed in the staff dashboard).
   This list is only a fallback if Firestore is empty/unreachable.
   It is intentionally EMPTY so no sample drinks show — add real products
   via the dashboard. The build-your-own options below stay in code.
   ============================================================ */
const PRODUCTS = [];

const BUILDER = {
  base:   {title:'Basis', type:'single', required:true, options:[
            {id:'fruit', label:'Vers fruit', emoji:'🍓', price:6.0},
            {id:'coffee', label:'Koffie / espresso', emoji:'☕', price:5.5},
            {id:'tea', label:'Thee', emoji:'🍵', price:5.0},
            {id:'sparkling', label:'Bruisend', emoji:'🫧', price:5.5}
          ]},
  size:   {title:'Formaat', type:'single', required:true, options:[
            {id:'sm', label:'Klein (35cl)', emoji:'', price:0},
            {id:'md', label:'Medium (47cl)', emoji:'', price:1.0},
            {id:'lg', label:'Groot (59cl)', emoji:'', price:2.0}
          ]},
  milk:   {title:'Melk', type:'single', required:false, options:[
            {id:'none', label:'Geen', emoji:'', price:0},
            {id:'whole', label:'Volle melk', emoji:'', price:0},
            {id:'oat', label:'Haver', emoji:'', price:0.7},
            {id:'almond', label:'Amandel', emoji:'', price:0.7}
          ]},
  sweet:  {title:'Zoetheid', type:'single', required:false, options:[
            {id:'0', label:'Geen', emoji:'', price:0},
            {id:'50', label:'Licht', emoji:'', price:0},
            {id:'100', label:'Normaal', emoji:'', price:0},
            {id:'125', label:'Extra', emoji:'', price:0}
          ]},
  addins: {title:'Extra\'s (meerdere)', type:'multi', required:false, options:[
            {id:'boba', label:'Bubbels (boba)', emoji:'⚫', price:0.8},
            {id:'jelly', label:'Fruitjelly', emoji:'🟥', price:0.8},
            {id:'cream', label:'Roomkapje', emoji:'🍦', price:0.9},
            {id:'shot', label:'Extra shot', emoji:'💥', price:1.0},
            {id:'collagen', label:'Collageen-boost', emoji:'✨', price:1.2}
          ]}
};

const DELIVERY_FEE = 4.50;
const FREE_DELIVERY_OVER = 35;

/* Where the deployed Stripe checkout function lives.
   Same Vercel project => '/api/checkout'. */
const CHECKOUT_ENDPOINT = '/api/checkout';
