/* ============================================================
   Freezy Drinks — shared product data
   Edit drinks, builder options, and pricing here. Used by every page.
   Prices are re-validated by the backend before charging.
   ============================================================ */
const PRODUCTS = [
  {id:'p1', name:'Sunset Citrus Fizz', cat:'fruity', emoji:'🍊', price:6.5, desc:'Verse sinaasappel, bloedgrapefruit en bruiswater op ijs.', badge:'Bestseller'},
  {id:'p2', name:'Berry Bloom Smoothie', cat:'fruity', emoji:'🫐', price:7.0, desc:'Blauwe bes, aardbei en banaan gemixt met havermelk.'},
  {id:'p3', name:'Velvet Cold Brew', cat:'coffee', emoji:'☕', price:5.5, desc:'18 uur cold brew met een zijdezachte vanilleroom.', badge:'Bestseller'},
  {id:'p4', name:'Brown Sugar Latte', cat:'coffee', emoji:'🥛', price:6.0, desc:'Espresso, gestoomde melk en huisgemaakte bruine-suikersiroop.'},
  {id:'p5', name:'Jasmine Cloud Tea', cat:'tea', emoji:'🍵', price:5.0, desc:'Koud getrokken jasmijn-groene thee met een zacht melkkapje.'},
  {id:'p6', name:'Peach Oolong', cat:'tea', emoji:'🍑', price:5.5, desc:'Geroosterde oolong geshaket met verse perzikpuree.'},
  {id:'p7', name:'Green Glow Tonic', cat:'wellness', emoji:'🥒', price:7.5, desc:'Komkommer, groene appel, bleekselderij, limoen en munt.'},
  {id:'p8', name:'Golden Turmeric Shot', cat:'wellness', emoji:'🧡', price:4.0, desc:'Kurkuma, gember, citroen en een vleugje zwarte peper.'}
];

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
