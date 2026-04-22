import { useState, useRef } from "react";

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "chorechart_v3";

const DAY_NAMES_SUN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_NAMES_MON = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const FULL_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// calendar slot key: "W{0|1}-D{0-6}" where W=fortnight week, D=day index within that week
const slotKey = (week, day) => `W${week}-D${day}`;

const defaultData = {
  parents:  [{ id:"p1", name:"Parent", pin:"1234", photo:null, avatar:"👤" }],
  children: [
    { id:"c1", name:"Alex", avatar:"🦊", photo:null, walletPoints:0, pin:null },
    { id:"c2", name:"Sam",  avatar:"🐨", photo:null, walletPoints:0, pin:null },
  ],
  chores: [
    { id:"ch1", title:"Wash Dishes",       points:2, icon:"🍽️", requiresPhoto:false, recurring:true },
    { id:"ch2", title:"Vacuum Living Room", points:3, icon:"🧹", requiresPhoto:true,  recurring:true },
    { id:"ch3", title:"Take Out Trash",     points:2, icon:"🗑️", requiresPhoto:false, recurring:true },
    { id:"ch4", title:"Clean Bedroom",      points:4, icon:"🛏️", requiresPhoto:true,  recurring:true },
  ],
  careSchedule: {},
  choreSchedule: [],
  banks: [
    { id:"b1", childId:"c1", name:"Screen Time", icon:"📱", type:"recurring", costPoints:5,  reward:"15 min screen time", savedPoints:0 },
    { id:"b2", childId:"c1", name:"New Toy",      icon:"🎮", type:"goal",      costPoints:20, reward:"LEGO Set",           savedPoints:0 },
    { id:"b3", childId:"c2", name:"Screen Time",  icon:"📱", type:"recurring", costPoints:5,  reward:"15 min screen time", savedPoints:0 },
  ],
  choreRequests: [],
  transactions: [],
  // checklist: shared items + per-child items
  // { id, label, icon, points, scope: "all"|childId }
  checklistItems: [
    { id:"cl1", label:"Brush teeth (morning)", icon:"🦷", points:0, scope:"all" },
    { id:"cl2", label:"Brush teeth (night)",   icon:"🦷", points:0, scope:"all" },
    { id:"cl3", label:"Make bed",              icon:"🛏️", points:0, scope:"all" },
  ],
  // checklistLog: { "YYYY-MM-DD": { childId: { itemId: true|false } } }
  checklistLog: {},
  // milestoneRewards: { childId: { achievementId: points } }
  milestoneRewards: {},
  settings: {
    pointValue: 0.50,
    currency: "AUD",
    calendarStartDay: "Mon",
    fortnightStart: null,
  },
};

function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : defaultData; }
  catch { return defaultData; }
}
function saveData(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid   = () => Math.random().toString(36).slice(2,10);
const now   = () => new Date().toLocaleString("en-AU",{dateStyle:"short",timeStyle:"short"});

// Currency formatting using Intl
const CURRENCIES = [
  { code:"AUD", name:"Australian Dollar",   symbol:"A$", flag:"🇦🇺" },
  { code:"USD", name:"US Dollar",           symbol:"$",  flag:"🇺🇸" },
  { code:"NZD", name:"New Zealand Dollar",  symbol:"NZ$",flag:"🇳🇿" },
  { code:"GBP", name:"British Pound",       symbol:"£",  flag:"🇬🇧" },
  { code:"EUR", name:"Euro",                symbol:"€",  flag:"🇪🇺" },
  { code:"CAD", name:"Canadian Dollar",     symbol:"C$", flag:"🇨🇦" },
  { code:"SGD", name:"Singapore Dollar",    symbol:"S$", flag:"🇸🇬" },
  { code:"ZAR", name:"South African Rand",  symbol:"R",  flag:"🇿🇦" },
  { code:"INR", name:"Indian Rupee",        symbol:"₹",  flag:"🇮🇳" },
  { code:"JPY", name:"Japanese Yen",        symbol:"¥",  flag:"🇯🇵" },
  { code:"CNY", name:"Chinese Yuan",        symbol:"¥",  flag:"🇨🇳" },
  { code:"HKD", name:"Hong Kong Dollar",    symbol:"HK$",flag:"🇭🇰" },
  { code:"AED", name:"UAE Dirham",          symbol:"د.إ",flag:"🇦🇪" },
  { code:"CHF", name:"Swiss Franc",         symbol:"Fr", flag:"🇨🇭" },
  { code:"SEK", name:"Swedish Krona",       symbol:"kr", flag:"🇸🇪" },
  { code:"NOK", name:"Norwegian Krone",     symbol:"kr", flag:"🇳🇴" },
  { code:"DKK", name:"Danish Krone",        symbol:"kr", flag:"🇩🇰" },
  { code:"MXN", name:"Mexican Peso",        symbol:"$",  flag:"🇲🇽" },
  { code:"BRL", name:"Brazilian Real",      symbol:"R$", flag:"🇧🇷" },
  { code:"PHP", name:"Philippine Peso",     symbol:"₱",  flag:"🇵🇭" },
];

function money(pts, rate, currencyCode="AUD") {
  const val = pts * rate;
  try {
    return new Intl.NumberFormat(undefined, { style:"currency", currency: currencyCode, minimumFractionDigits:2, maximumFractionDigits:2 }).format(val);
  } catch {
    const cur = CURRENCIES.find(c=>c.code===currencyCode);
    return `${cur?.symbol||"$"}${val.toFixed(2)}`;
  }
}

const pts = n => `${n} pt${n!==1?"s":""}`;
const readFile = f => new Promise(res => { const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsDataURL(f); });

// Parse an ISO date string (YYYY-MM-DD) as local midnight, avoiding timezone shifts
function parseLocalDate(str) {
  if (!str) return null;
  const [y,m,d] = str.split("-").map(Number);
  return new Date(y, m-1, d);
}

// Snap a date backwards to the nearest Mon or Sun
function snapToStartDay(date, startDay) {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun,1=Mon,...6=Sat
  const target = startDay === "Sun" ? 0 : 1;
  let diff = dow - target;
  if (diff < 0) diff += 7;
  d.setDate(d.getDate() - diff);
  return d;
}

// Get which fortnight slot (week 0 or 1, day 0-6) today falls on
function getTodaySlot(settings) {
  if (!settings.fortnightStart) return null;
  const anchor = parseLocalDate(settings.fortnightStart);
  if (!anchor) return null;
  // Snap anchor to start day in case it was set to a mid-week date
  const snapped = snapToStartDay(anchor, settings.calendarStartDay);
  const today = new Date();
  today.setHours(0,0,0,0);
  snapped.setHours(0,0,0,0);
  const diffDays = Math.floor((today - snapped) / 86400000);
  if (diffDays < 0) return null;
  const slotDay = diffDays % 14;
  const week = Math.floor(slotDay / 7);
  const day  = slotDay % 7;
  return { week, day, slotDay };
}

// Build ordered day labels for the calendar grid
function buildDayLabels(startDay) {
  return startDay === "Sun" ? DAY_NAMES_SUN : DAY_NAMES_MON;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Av({ photo, emoji, size=40 }) {
  if (photo) return <img src={photo} alt="" style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0,display:"block"}} />;
  return <span style={{fontSize:size*0.58,lineHeight:1,display:"block",textAlign:"center"}}>{emoji||"👤"}</span>;
}

// ─── AvatarPicker ─────────────────────────────────────────────────────────────
function AvatarPicker({ photo, emoji, emojiList, onPhoto, onEmoji }) {
  const ref = useRef();
  return (
    <div className="form-group">
      <label className="form-label">Avatar — tap ring for photo, or pick emoji</label>
      <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:10}}>
        <div onClick={()=>ref.current.click()} style={{width:72,height:72,borderRadius:"50%",border:"3px dashed #cbd5e1",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",flexShrink:0,background:"#f8fafc"}}>
          {photo ? <img src={photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} /> : <Av emoji={emoji} size={52} />}
        </div>
        <div style={{fontSize:".8rem",color:"var(--mid)",fontWeight:600}}>Tap circle to<br/>upload photo</div>
        <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{if(e.target.files[0]){onPhoto(await readFile(e.target.files[0]));}}} />
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {emojiList.map(av=>(
          <div key={av} onClick={()=>{onEmoji(av);onPhoto(null);}}
            style={{fontSize:"1.5rem",cursor:"pointer",padding:6,borderRadius:10,
              background:!photo&&emoji===av?"#dbeafe":"#f1f5f9",
              border:!photo&&emoji===av?"2px solid #3b82f6":"2px solid transparent"}}>
            {av}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --sky:#e0f2fe;--mint:#d1fae5;--peach:#ffe4cc;--lavender:#ede9fe;--yellow:#fef9c3;
    --blue:#3b82f6;--green:#10b981;--orange:#f97316;--purple:#8b5cf6;--amber:#f59e0b;
    --red:#ef4444;--dark:#1e293b;--mid:#64748b;--white:#ffffff;
    --radius:16px;--shadow:0 4px 24px rgba(0,0,0,.08);--shadow-lg:0 8px 40px rgba(0,0,0,.14);
  }
  body{font-family:'Nunito',sans-serif;background:var(--sky);color:var(--dark);min-height:100vh;}
  .app{min-height:100vh;display:flex;flex-direction:column;}

  .nav{background:var(--white);padding:12px 20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 12px rgba(0,0,0,.06);position:sticky;top:0;z-index:100;}
  .nav-logo{font-family:'Fredoka One',cursive;font-size:1.35rem;color:var(--blue);display:flex;align-items:center;gap:10px;}
  .nav-right{display:flex;gap:10px;align-items:center;}
  .nav-badge{background:var(--sky);border-radius:20px;padding:6px 14px;font-weight:700;font-size:.85rem;color:var(--blue);}
  .nav-btn{background:var(--dark);color:white;border:none;border-radius:12px;padding:8px 16px;font-family:'Nunito',sans-serif;font-weight:700;font-size:.85rem;cursor:pointer;}
  .nav-btn.ghost{background:transparent;color:var(--mid);border:2px solid #e2e8f0;}

  .main{flex:1;padding:20px 16px;max-width:960px;margin:0 auto;width:100%;}
  .section-title{font-family:'Fredoka One',cursive;font-size:1.3rem;color:var(--dark);margin-bottom:14px;display:flex;align-items:center;gap:8px;}

  .card{background:var(--white);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow);margin-bottom:14px;}
  .card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;margin-bottom:20px;}

  .chore-card{background:var(--white);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:8px;border:2px solid transparent;transition:all .2s;}
  .chore-card:hover{border-color:var(--blue);transform:translateY(-2px);}
  .tag{border-radius:20px;padding:3px 10px;font-size:.72rem;font-weight:700;}
  .tag-photo{background:var(--peach);color:var(--orange);}
  .tag-recurring{background:var(--mint);color:var(--green);}
  .tag-oneoff{background:var(--lavender);color:var(--purple);}
  .tag-cal{background:var(--sky);color:var(--blue);}

  .bank-card{background:var(--white);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:8px;}
  .bank-progress{height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;}
  .bank-progress-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--blue),var(--purple));transition:width .4s;}

  .request-card{background:var(--white);border-radius:var(--radius);padding:14px 18px;box-shadow:var(--shadow);display:flex;align-items:center;gap:12px;margin-bottom:10px;border-left:4px solid var(--amber);}
  .request-card.approved{border-left-color:var(--green);}
  .request-card.rejected{border-left-color:var(--red);}
  .request-info{flex:1;}

  .btn{border:none;border-radius:12px;padding:10px 18px;font-family:'Nunito',sans-serif;font-weight:800;font-size:.9rem;cursor:pointer;transition:all .2s;}
  .btn:hover{opacity:.88;transform:translateY(-1px);}
  .btn:active{transform:translateY(0);}
  .btn-blue{background:var(--blue);color:white;}
  .btn-green{background:var(--green);color:white;}
  .btn-red{background:var(--red);color:white;}
  .btn-purple{background:var(--purple);color:white;}
  .btn-amber{background:var(--amber);color:white;}
  .btn-teal{background:#0d9488;color:white;}
  .btn-ghost{background:#f1f5f9;color:var(--dark);}
  .btn-sm{padding:6px 12px;font-size:.78rem;border-radius:8px;}
  .btn-lg{padding:14px 28px;font-size:1rem;border-radius:14px;width:100%;}

  .wallet-card{background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:20px;padding:24px;box-shadow:0 8px 32px rgba(102,126,234,.4);margin-bottom:20px;position:relative;overflow:hidden;}
  .wallet-card::before{content:'';position:absolute;top:-40px;right:-40px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.1);}
  .wallet-label{font-size:.8rem;opacity:.85;font-weight:600;text-transform:uppercase;letter-spacing:1px;}
  .wallet-pts{font-family:'Fredoka One',cursive;font-size:2.8rem;line-height:1;}
  .wallet-money{font-size:1rem;opacity:.85;font-weight:700;}

  .tabs{display:flex;gap:6px;margin-bottom:20px;background:white;padding:5px;border-radius:14px;box-shadow:var(--shadow);flex-wrap:wrap;}
  .tab{flex:1;padding:9px 4px;border:none;border-radius:10px;font-family:'Nunito',sans-serif;font-weight:700;font-size:.78rem;cursor:pointer;transition:all .2s;background:transparent;color:var(--mid);white-space:nowrap;}
  .tab.active{background:var(--blue);color:white;}

  .child-selector{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;}
  .child-pill{display:flex;align-items:center;gap:7px;padding:8px 16px;border-radius:99px;border:2px solid #e2e8f0;background:white;font-weight:700;cursor:pointer;transition:all .2s;font-family:'Nunito',sans-serif;font-size:.88rem;}
  .child-pill.active{border-color:var(--blue);background:var(--sky);color:var(--blue);}

  /* ── Calendar ── */
  .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px;}
  .cal-header{text-align:center;font-size:.72rem;font-weight:800;color:var(--mid);padding:4px 0;}
  .cal-cell{border-radius:10px;padding:6px 4px;min-height:64px;background:#f8fafc;border:2px solid transparent;cursor:pointer;transition:all .15s;position:relative;}
  .cal-cell:hover{border-color:var(--blue);}
  .cal-cell.today{border-color:var(--amber);background:var(--yellow);}
  .cal-cell.has-care{background:var(--mint);}
  .cal-cell.today.has-care{background:#bbf7d0;border-color:var(--amber);}
  .cal-day-num{font-size:.72rem;font-weight:800;color:var(--mid);margin-bottom:3px;}
  .cal-avatars{display:flex;flex-wrap:wrap;gap:2px;justify-content:center;}
  .cal-chore-dot{width:6px;height:6px;border-radius:50%;background:var(--blue);display:inline-block;margin:1px;}
  .week-label{font-family:'Fredoka One',cursive;font-size:1rem;color:var(--dark);margin:10px 0 6px;display:flex;align-items:center;gap:8px;}

  /* Day detail panel */
  .day-panel{background:white;border-radius:var(--radius);padding:18px;box-shadow:var(--shadow-lg);margin-bottom:16px;border-left:4px solid var(--blue);}
  .day-panel-title{font-family:'Fredoka One',cursive;font-size:1.1rem;margin-bottom:12px;}
  .care-toggle{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
  .care-chip{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;border:2px solid #e2e8f0;cursor:pointer;font-weight:700;font-size:.82rem;transition:all .15s;}
  .care-chip.active{border-color:var(--green);background:var(--mint);color:#065f46;}

  /* Screen select */
  .screen-select{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;background:linear-gradient(160deg,#e0f2fe 0%,#ede9fe 100%);padding:40px 16px;}
  .screen-select-title{font-family:'Fredoka One',cursive;font-size:2.2rem;color:var(--dark);text-align:center;}
  .profile-cards{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;}
  .profile-card{background:white;border-radius:20px;padding:22px 18px;box-shadow:var(--shadow-lg);text-align:center;cursor:pointer;transition:all .25s;border:3px solid transparent;min-width:110px;display:flex;flex-direction:column;align-items:center;gap:7px;}
  .profile-card:hover{transform:translateY(-4px);border-color:var(--blue);}
  .profile-card .profile-name{font-weight:800;font-size:.95rem;}
  .profile-card .profile-role{font-size:.75rem;color:var(--mid);font-weight:600;}
  .profile-card.parent-card{background:linear-gradient(135deg,#1e293b,#334155);color:white;}
  .profile-card.parent-card .profile-role{color:#94a3b8;}

  .pin-display{display:flex;gap:12px;justify-content:center;margin:18px 0;}
  .pin-dot{width:16px;height:16px;border-radius:50%;background:#e2e8f0;transition:background .2s;}
  .pin-dot.filled{background:var(--blue);}
  .pin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:240px;margin:0 auto;}
  .pin-key{padding:16px;border:2px solid #e2e8f0;border-radius:14px;background:white;font-family:'Fredoka One',cursive;font-size:1.4rem;cursor:pointer;transition:all .15s;text-align:center;}
  .pin-key:hover{background:var(--sky);border-color:var(--blue);}
  .pin-key:active{transform:scale(.95);}
  .pin-error{color:var(--red);font-weight:700;text-align:center;font-size:.9rem;}

  .stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;}
  .stat-box{background:white;border-radius:14px;padding:14px;text-align:center;box-shadow:var(--shadow);}
  .stat-val{font-family:'Fredoka One',cursive;font-size:1.5rem;color:var(--blue);}
  .stat-label{font-size:.72rem;color:var(--mid);font-weight:700;text-transform:uppercase;letter-spacing:.5px;}

  .empty{text-align:center;padding:36px 20px;color:var(--mid);}
  .empty-icon{font-size:2.8rem;margin-bottom:10px;}
  .empty-text{font-weight:700;}
  .empty-sub{font-size:.85rem;margin-top:4px;}

  .status{display:inline-block;border-radius:20px;padding:3px 12px;font-size:.72rem;font-weight:800;}
  .status-pending{background:var(--yellow);color:#92400e;}
  .status-approved{background:var(--mint);color:#065f46;}
  .status-rejected{background:#fee2e2;color:#991b1b;}

  .distribute-row{display:flex;align-items:center;gap:10px;padding:12px;background:#f8fafc;border-radius:12px;margin-bottom:8px;}
  .distribute-info{flex:1;}
  .distribute-input{width:76px;padding:8px;border:2px solid #e2e8f0;border-radius:10px;font-family:'Nunito',sans-serif;font-weight:700;text-align:center;font-size:.92rem;outline:none;}
  .distribute-input:focus{border-color:var(--blue);}

  .photo-upload{border:2px dashed #e2e8f0;border-radius:14px;padding:22px;text-align:center;cursor:pointer;transition:border-color .2s;}
  .photo-upload:hover{border-color:var(--blue);}
  .photo-preview{max-width:100%;border-radius:10px;margin-top:10px;}

  .notif-dot{background:var(--red);color:white;border-radius:50%;width:20px;height:20px;font-size:.7rem;font-weight:900;display:inline-flex;align-items:center;justify-content:center;}

  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);}
  .modal{background:white;border-radius:20px;padding:24px;width:100%;max-width:480px;box-shadow:var(--shadow-lg);max-height:92vh;overflow-y:auto;}
  .modal-title{font-family:'Fredoka One',cursive;font-size:1.3rem;margin-bottom:18px;}

  .form-group{margin-bottom:14px;}
  .form-label{font-weight:700;font-size:.82rem;color:var(--mid);margin-bottom:5px;display:block;}
  .form-input{width:100%;padding:11px 13px;border:2px solid #e2e8f0;border-radius:12px;font-family:'Nunito',sans-serif;font-size:.92rem;font-weight:600;outline:none;transition:border-color .2s;color:var(--dark);}
  .form-input:focus{border-color:var(--blue);}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .checkbox-label{display:flex;align-items:center;gap:9px;font-weight:700;cursor:pointer;}
  .checkbox-label input{width:17px;height:17px;cursor:pointer;}

  .divider{height:1px;background:#f1f5f9;margin:18px 0;}
  .flex-between{display:flex;justify-content:space-between;align-items:center;}
  .mb-0{margin-bottom:0;}
  .text-mid{color:var(--mid);}
  .text-sm{font-size:.85rem;}
  .gap-8{gap:8px;}

  /* value badge */
  .val-badge{display:inline-flex;align-items:center;gap:4px;background:var(--yellow);color:#92400e;border-radius:20px;padding:2px 9px;font-size:.75rem;font-weight:800;}
`;

// ─── PIN Modals ───────────────────────────────────────────────────────────────
function PinModal({ user, onSuccess, onCancel }) {
  const [pin,setPin]=useState(""); const [err,setErr]=useState(false);
  const press=k=>{
    if(k==="del"){setPin(p=>p.slice(0,-1));setErr(false);return;}
    const n=pin+k; if(n.length>4)return; setPin(n);
    if(n.length===4){if(n===user.pin)onSuccess();else{setErr(true);setTimeout(()=>{setPin("");setErr(false);},600);}}
  };
  return(
    <div className="modal-overlay"><div className="modal" style={{textAlign:"center"}}>
      <div style={{marginBottom:12}}><Av photo={user.photo} emoji={user.avatar||"👤"} size={60}/></div>
      <div className="modal-title">Parent Portal</div>
      <div className="text-sm text-mid" style={{marginBottom:16,fontWeight:600}}>PIN for {user.name}</div>
      <div className="pin-display">{[0,1,2,3].map(i=><div key={i} className={`pin-dot ${pin.length>i?"filled":""}`}/>)}</div>
      {err&&<div className="pin-error" style={{marginBottom:8}}>Incorrect PIN</div>}
      <div className="pin-grid">{["1","2","3","4","5","6","7","8","9","","0","del"].map((k,i)=><div key={i} className="pin-key" onClick={()=>k&&press(k)}>{k==="del"?"⌫":k}</div>)}</div>
      <button className="btn btn-ghost" style={{marginTop:18,width:"100%"}} onClick={onCancel}>Cancel</button>
    </div></div>
  );
}
function ChildPinModal({ child, onSuccess, onCancel }) {
  const [pin,setPin]=useState(""); const [err,setErr]=useState(false);
  const press=k=>{
    if(k==="del"){setPin(p=>p.slice(0,-1));setErr(false);return;}
    const n=pin+k; if(n.length>4)return; setPin(n);
    if(n.length===4){if(n===child.pin)onSuccess();else{setErr(true);setTimeout(()=>{setPin("");setErr(false);},600);}}
  };
  return(
    <div className="modal-overlay"><div className="modal" style={{textAlign:"center"}}>
      <div style={{marginBottom:12}}><Av photo={child.photo} emoji={child.avatar} size={64}/></div>
      <div className="modal-title">Hi {child.name}! 👋</div>
      <div className="text-sm text-mid" style={{marginBottom:16,fontWeight:600}}>Enter your PIN</div>
      <div className="pin-display">{[0,1,2,3].map(i=><div key={i} className={`pin-dot ${pin.length>i?"filled":""}`}/>)}</div>
      {err&&<div className="pin-error" style={{marginBottom:8}}>Wrong PIN!</div>}
      <div className="pin-grid">{["1","2","3","4","5","6","7","8","9","","0","del"].map((k,i)=><div key={i} className="pin-key" onClick={()=>k&&press(k)}>{k==="del"?"⌫":k}</div>)}</div>
      <button className="btn btn-ghost" style={{marginTop:18,width:"100%"}} onClick={onCancel}>Cancel</button>
    </div></div>
  );
}

// ─── AddChoreModal ────────────────────────────────────────────────────────────
function AddChoreModal({ children, onSave, onClose }) {
  const [f,setF]=useState({title:"",icon:"⭐",points:2,requiresPhoto:false,recurring:true});
  const icons=["⭐","🍽️","🧹","🗑️","🛏️","🪴","🐕","🚗","👕","🧺","🪣","🪟","🍳","🧼","📚","🐾","🌿","🧽","🪥","🛒"];
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  return(
    <div className="modal-overlay"><div className="modal">
      <div className="modal-title">✨ New Chore</div>
      <div className="form-group">
        <label className="form-label">Icon</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {icons.map(ic=><div key={ic} onClick={()=>set("icon",ic)} style={{fontSize:"1.5rem",cursor:"pointer",padding:5,borderRadius:9,background:f.icon===ic?"#dbeafe":"#f1f5f9",border:f.icon===ic?"2px solid #3b82f6":"2px solid transparent"}}>{ic}</div>)}
        </div>
      </div>
      <div className="form-group"><label className="form-label">Chore Name</label><input className="form-input" value={f.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. Wash Dishes"/></div>
      <div className="form-row">
        <div className="form-group mb-0"><label className="form-label">Points</label><input className="form-input" type="number" min="1" max="100" value={f.points} onChange={e=>set("points",+e.target.value)}/></div>
        <div className="form-group mb-0">
          <label className="form-label">Type</label>
          <select className="form-input" value={f.recurring?"recurring":"oneoff"} onChange={e=>set("recurring",e.target.value==="recurring")}>
            <option value="recurring">🔄 Recurring</option>
            <option value="oneoff">🎯 One-off</option>
          </select>
        </div>
      </div>
      <div style={{marginTop:12,marginBottom:14}}>
        <label className="checkbox-label"><input type="checkbox" checked={f.requiresPhoto} onChange={e=>set("requiresPhoto",e.target.checked)}/>📸 Photo Required</label>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn btn-blue" style={{flex:1}} onClick={()=>f.title&&onSave(f)}>Save Chore</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ─── AddBankModal ─────────────────────────────────────────────────────────────
function AddBankModal({ childId, onSave, onClose }) {
  const [f,setF]=useState({name:"",icon:"🏦",type:"recurring",costPoints:5,reward:""});
  const icons=["🏦","📱","🎮","🎬","🍦","🎪","📚","🚲","👟","🎁","✈️","🎨","🎵","🏀","⭐"];
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  return(
    <div className="modal-overlay"><div className="modal">
      <div className="modal-title">🏦 New Savings Bank</div>
      <div className="form-group">
        <label className="form-label">Icon</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {icons.map(ic=><div key={ic} onClick={()=>set("icon",ic)} style={{fontSize:"1.5rem",cursor:"pointer",padding:5,borderRadius:9,background:f.icon===ic?"#dbeafe":"#f1f5f9",border:f.icon===ic?"2px solid #3b82f6":"2px solid transparent"}}>{ic}</div>)}
        </div>
      </div>
      <div className="form-group"><label className="form-label">Bank Name</label><input className="form-input" value={f.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Screen Time"/></div>
      <div className="form-group"><label className="form-label">Reward</label><input className="form-input" value={f.reward} onChange={e=>set("reward",e.target.value)} placeholder="e.g. 15 min screen time"/></div>
      <div className="form-row">
        <div className="form-group mb-0"><label className="form-label">Points Needed</label><input className="form-input" type="number" min="1" value={f.costPoints} onChange={e=>set("costPoints",+e.target.value)}/></div>
        <div className="form-group mb-0"><label className="form-label">Type</label>
          <select className="form-input" value={f.type} onChange={e=>set("type",e.target.value)}>
            <option value="recurring">🔄 Recurring</option>
            <option value="goal">🎯 One-off Goal</option>
          </select>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <button className="btn btn-purple" style={{flex:1}} onClick={()=>f.name&&f.reward&&onSave({...f,childId,savedPoints:0})}>Save Bank</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ─── AddChildModal ────────────────────────────────────────────────────────────
function AddChildModal({ onSave, onClose }) {
  const [name,setName]=useState(""); const [emoji,setEmoji]=useState("🦁");
  const [photo,setPhoto]=useState(null); const [pin,setPin]=useState("");
  const emojiList=["🦁","🐯","🦊","🐨","🐼","🐸","🦄","🐙","🦋","🐬","🦖","🐧","🦅","🐻","🦝"];
  return(
    <div className="modal-overlay"><div className="modal">
      <div className="modal-title">👦 Add Child</div>
      <AvatarPicker photo={photo} emoji={emoji} emojiList={emojiList} onPhoto={setPhoto} onEmoji={setEmoji}/>
      <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Alex"/></div>
      <div className="form-group">
        <label className="form-label">PIN — 4 digits (optional)</label>
        <input className="form-input" type="password" maxLength={4} placeholder="Leave blank for no PIN" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))}/>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn btn-green" style={{flex:1}} onClick={()=>name&&onSave({name,avatar:emoji,photo,walletPoints:0,pin:pin.length===4?pin:null})}>Add Child</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ─── AddParentModal ───────────────────────────────────────────────────────────
function AddParentModal({ onSave, onClose }) {
  const [name,setName]=useState(""); const [pin,setPin]=useState("");
  const [emoji,setEmoji]=useState("👤"); const [photo,setPhoto]=useState(null);
  const emojiList=["👤","👨","👩","🧔","👴","👵","🧑","👨‍💼","👩‍💼","🦸","🦹","🧙","🧑‍🍳","👮","🧑‍🏫"];
  return(
    <div className="modal-overlay"><div className="modal">
      <div className="modal-title">👤 Add Parent</div>
      <AvatarPicker photo={photo} emoji={emoji} emojiList={emojiList} onPhoto={setPhoto} onEmoji={setEmoji}/>
      <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Mum"/></div>
      <div className="form-group"><label className="form-label">4-Digit PIN</label><input className="form-input" type="password" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="••••"/></div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn btn-blue" style={{flex:1}} onClick={()=>name&&pin.length===4&&onSave({name,pin,photo,avatar:emoji})}>Add Parent</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ─── ApprovalCard ─────────────────────────────────────────────────────────────
function ApprovalCard({ req, child, chore, rate, currency, onReview, readOnly }) {
  const [showPhoto,setShowPhoto]=useState(false);
  return(
    <div className={`request-card ${req.status}`}>
      <div style={{fontSize:"1.8rem"}}>{chore?.icon||"📋"}</div>
      <div className="request-info">
        <div style={{fontSize:".78rem",color:"var(--mid)",fontWeight:600,display:"flex",alignItems:"center",gap:5}}>
          <Av photo={child?.photo} emoji={child?.avatar} size={16}/>{child?.name}
        </div>
        <div style={{fontWeight:800}}>{chore?.title||"Unknown chore"}</div>
        <div style={{fontSize:".72rem",color:"var(--mid)"}}>{req.time} · <span className={`status status-${req.status}`}>{req.status}</span></div>
        {req.note&&<div style={{fontSize:".78rem",color:req.status==="approved"?"var(--green)":"var(--red)",fontWeight:700,marginTop:3}}>
          {req.status==="approved"&&req.bonusPts>0?"⭐ "+req.note:req.status==="rejected"?"💬 "+req.note:""}
        </div>}
        {req.bonusPts>0&&<div style={{fontSize:".75rem",color:"var(--amber)",fontWeight:800}}>+{pts(req.bonusPts)} bonus!</div>}
        {req.photo&&<div style={{fontSize:".78rem",color:"#3b82f6",fontWeight:700,cursor:"pointer",marginTop:3}} onClick={()=>setShowPhoto(true)}>📸 View Photo</div>}
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontWeight:800,color:"var(--amber)",marginBottom:4}}>{pts(chore?.points||0)}</div>
        <div style={{fontSize:".75rem",color:"var(--green)",fontWeight:700}}>{money(chore?.points||0,rate,currency)}</div>
        {!readOnly&&req.status==="pending"&&(
          <button className="btn btn-blue btn-sm" style={{marginTop:6}} onClick={onReview}>Review</button>
        )}
      </div>
      {showPhoto&&req.photo&&(
        <div className="modal-overlay" onClick={()=>setShowPhoto(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">📸 Photo Evidence</div>
            <img src={req.photo} alt="Evidence" className="photo-preview"/>
            <button className="btn btn-ghost btn-lg" style={{marginTop:14}} onClick={()=>setShowPhoto(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EditParentInline ─────────────────────────────────────────────────────────
function EditParentInline({ parent, onSave }) {
  const [open,setOpen]=useState(false);
  const [name,setName]=useState(parent.name);
  const [emoji,setEmoji]=useState(parent.avatar||"👤");
  const [photo,setPhoto]=useState(parent.photo||null);
  const [curPin,setCur]=useState(""); const [newPin,setNew]=useState(""); const [conf,setConf]=useState("");
  const [err,setErr]=useState(""); const [ok,setOk]=useState(false);
  const emojiList=["👤","👨","👩","🧔","👴","👵","🧑","👨‍💼","👩‍💼","🦸","🦹","🧙","🧑‍🍳","👮","🧑‍🏫"];
  const save=()=>{
    setErr("");
    if(!name.trim()){setErr("Name can't be empty.");return;}
    let finalPin=undefined;
    if(newPin||curPin||conf){
      const stored=loadData().parents.find(p=>p.id===parent.id);
      if(curPin!==stored?.pin){setErr("Current PIN is incorrect.");return;}
      if(newPin.length!==4){setErr("New PIN must be 4 digits.");return;}
      if(newPin!==conf){setErr("PINs don't match.");return;}
      finalPin=newPin;
    }
    onSave({name:name.trim(),photo,avatar:emoji,pin:finalPin});
    setOk(true);setTimeout(()=>{setOpen(false);setOk(false);setCur("");setNew("");setConf("");},900);
  };
  if(!open)return <button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:10}} onClick={()=>setOpen(true)}>✏️ Edit Profile & PIN</button>;
  return(
    <div style={{background:"#f8fafc",borderRadius:12,padding:14,marginTop:10}}>
      <div style={{fontWeight:800,marginBottom:12}}>✏️ Edit Profile</div>
      <AvatarPicker photo={photo} emoji={emoji} emojiList={emojiList} onPhoto={setPhoto} onEmoji={setEmoji}/>
      <div className="form-group"><label className="form-label">Display Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)}/></div>
      <div style={{fontWeight:700,fontSize:".82rem",color:"var(--mid)",marginBottom:8}}>Change PIN (leave blank to keep current)</div>
      <div className="form-row" style={{marginBottom:10}}>
        <div><label className="form-label">Current PIN</label><input className="form-input" type="password" maxLength={4} placeholder="••••" value={curPin} onChange={e=>setCur(e.target.value.replace(/\D/g,"").slice(0,4))}/></div>
        <div><label className="form-label">New PIN</label><input className="form-input" type="password" maxLength={4} placeholder="••••" value={newPin} onChange={e=>setNew(e.target.value.replace(/\D/g,"").slice(0,4))}/></div>
      </div>
      <div className="form-group"><label className="form-label">Confirm New PIN</label><input className="form-input" type="password" maxLength={4} placeholder="••••" value={conf} onChange={e=>setConf(e.target.value.replace(/\D/g,"").slice(0,4))}/></div>
      {err&&<div style={{color:"var(--red)",fontWeight:700,fontSize:".82rem",marginBottom:8}}>{err}</div>}
      {ok&&<div style={{color:"var(--green)",fontWeight:700,fontSize:".82rem",marginBottom:8}}>✅ Saved!</div>}
      <div style={{display:"flex",gap:8}}><button className="btn btn-blue btn-sm" onClick={save}>Save</button><button className="btn btn-ghost btn-sm" onClick={()=>{setOpen(false);setErr("");}}>Cancel</button></div>
    </div>
  );
}

// ─── EditChildInline ──────────────────────────────────────────────────────────
function EditChildInline({ child, onSave }) {
  const [open,setOpen]=useState(false);
  const [name,setName]=useState(child.name);
  const [emoji,setEmoji]=useState(child.avatar);
  const [photo,setPhoto]=useState(child.photo||null);
  const [newPin,setNew]=useState(""); const [conf,setConf]=useState("");
  const [err,setErr]=useState(""); const [ok,setOk]=useState(false);
  const emojiList=["🦁","🐯","🦊","🐨","🐼","🐸","🦄","🐙","🦋","🐬","🦖","🐧","🦅","🐻","🦝"];
  const save=()=>{
    setErr(""); if(!name.trim()){setErr("Name can't be empty.");return;}
    let pin=child.pin;
    if(newPin||conf){if(newPin.length!==4){setErr("PIN must be 4 digits.");return;}if(newPin!==conf){setErr("PINs don't match.");return;}pin=newPin;}
    onSave({name:name.trim(),avatar:emoji,photo,pin});
    setOk(true);setTimeout(()=>{setOpen(false);setOk(false);setNew("");setConf("");},900);
  };
  if(!open)return <button className="btn btn-ghost btn-sm" style={{marginTop:10}} onClick={()=>setOpen(true)}>✏️ Edit / Manage PIN</button>;
  return(
    <div style={{background:"#f8fafc",borderRadius:12,padding:14,marginTop:10}}>
      <div style={{fontWeight:800,marginBottom:12}}>✏️ Edit {child.name}</div>
      <AvatarPicker photo={photo} emoji={emoji} emojiList={emojiList} onPhoto={setPhoto} onEmoji={setEmoji}/>
      <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)}/></div>
      <div style={{fontWeight:700,fontSize:".82rem",marginBottom:8}}>Child PIN — {child.pin?<span style={{color:"var(--green)"}}>🔒 Active</span>:<span style={{color:"var(--mid)"}}>No PIN</span>}</div>
      <div className="form-row" style={{marginBottom:10}}>
        <div><label className="form-label">{child.pin?"New PIN":"Set PIN"}</label><input className="form-input" type="password" maxLength={4} placeholder="••••" value={newPin} onChange={e=>setNew(e.target.value.replace(/\D/g,"").slice(0,4))}/></div>
        <div><label className="form-label">Confirm</label><input className="form-input" type="password" maxLength={4} placeholder="••••" value={conf} onChange={e=>setConf(e.target.value.replace(/\D/g,"").slice(0,4))}/></div>
      </div>
      {err&&<div style={{color:"var(--red)",fontWeight:700,fontSize:".82rem",marginBottom:8}}>{err}</div>}
      {ok&&<div style={{color:"var(--green)",fontWeight:700,fontSize:".82rem",marginBottom:8}}>✅ Saved!</div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button className="btn btn-blue btn-sm" onClick={save}>Save</button>
        {child.pin&&<button className="btn btn-amber btn-sm" onClick={()=>{onSave({name:child.name,avatar:child.avatar,photo:child.photo,pin:null});setOpen(false);}}>Remove PIN</button>}
        <button className="btn btn-ghost btn-sm" onClick={()=>{setOpen(false);setErr("");}}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Calendar Component ───────────────────────────────────────────────────────
function CalendarView({ data, doUpdate, isParent, activeChildId }) {
  const { settings, children, chores, careSchedule, choreSchedule } = data;
  const [selectedSlot, setSelectedSlot] = useState(null); // {week, day}
  const [addChoreSlot, setAddChoreSlot] = useState(null);  // slot key for chore assignment modal
  const [choreChild, setChoreChild]     = useState(children[0]?.id || "");
  const [choreId, setChoreId]           = useState(chores[0]?.id || "");

  const dayLabels = buildDayLabels(settings.calendarStartDay);
  const todaySlot = getTodaySlot(settings);
  const rate = settings.pointValue || 0.5;
  const currency = settings.currency || "AUD";

  // Get absolute day index within fortnight (0-13) for a slot
  const slotIndex = (week, day) => week * 7 + day;

  // Get actual date for a slot using timezone-safe parsing + snapping
  const slotDate = (week, day) => {
    if (!settings.fortnightStart) return null;
    const anchor = parseLocalDate(settings.fortnightStart);
    if (!anchor) return null;
    const snapped = snapToStartDay(anchor, settings.calendarStartDay);
    const d = new Date(snapped);
    d.setDate(snapped.getDate() + slotIndex(week, day));
    return d;
  };

  const formatSlotDate = (week, day) => {
    const d = slotDate(week, day);
    if (!d) return "";
    return d.toLocaleDateString("en-AU", { day:"numeric", month:"short" });
  };

  const toggleCare = (slot, childId) => {
    doUpdate(d => {
      const current = d.careSchedule[slot] || [];
      const next = current.includes(childId)
        ? current.filter(x => x !== childId)
        : [...current, childId];
      return { ...d, careSchedule: { ...d.careSchedule, [slot]: next } };
    });
  };

  const addChoreToSlot = () => {
    if (!addChoreSlot || !choreChild || !choreId) return;
    doUpdate(d => ({
      ...d,
      choreSchedule: [...(d.choreSchedule||[]).filter(x => !(x.slot===addChoreSlot&&x.childId===choreChild&&x.choreId===choreId)),
        { slot: addChoreSlot, childId: choreChild, choreId }]
    }));
    setAddChoreSlot(null);
  };

  const removeChoreFromSlot = (slot, childId, choreId) => {
    doUpdate(d => ({ ...d, choreSchedule: (d.choreSchedule||[]).filter(x => !(x.slot===slot&&x.childId===childId&&x.choreId===choreId)) }));
  };

  const setFortnightStart = (dateStr) => {
    doUpdate(d => ({ ...d, settings: { ...d.settings, fortnightStart: dateStr } }));
  };

  const setStartDay = (day) => {
    doUpdate(d => ({ ...d, settings: { ...d.settings, calendarStartDay: day } }));
  };

  // Show what date the cycle actually snaps to
  const snappedAnchor = settings.fortnightStart
    ? snapToStartDay(parseLocalDate(settings.fortnightStart), settings.calendarStartDay)
    : null;
  const snappedLabel = snappedAnchor
    ? snappedAnchor.toLocaleDateString("en-AU", { weekday:"long", day:"numeric", month:"long", year:"numeric" })
    : null;

  // For child view: filter chores assigned to this child on today's slot
  const todayChores = todaySlot
    ? (choreSchedule||[]).filter(x => x.slot === slotKey(todaySlot.week, todaySlot.day) && x.childId === activeChildId)
    : [];

  if (!isParent) {
    // Child view — show today's scheduled chores
    return (
      <div>
        <div className="section-title">📅 Today's Scheduled Chores</div>
        {!settings.fortnightStart && (
          <div className="empty"><div className="empty-icon">📅</div><div className="empty-text">Calendar not set up yet</div><div className="empty-sub">Ask a parent to set up the calendar.</div></div>
        )}
        {settings.fortnightStart && todayChores.length === 0 && (
          <div className="empty"><div className="empty-icon">🎉</div><div className="empty-text">No scheduled chores today!</div><div className="empty-sub">Check the Chores tab for general chores.</div></div>
        )}
        {todayChores.map(cs => {
          const chore = chores.find(c => c.id === cs.choreId);
          if (!chore) return null;
          return (
            <div key={cs.choreId} className="chore-card" style={{ flexDirection:"row", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:"2rem", marginRight:12 }}>{chore.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800 }}>{chore.title}</div>
                <div style={{ color:"var(--amber)", fontWeight:800, fontSize:".85rem" }}>⭐ {pts(chore.points)} · {money(chore.points, rate, currency)}</div>
              </div>
              <span className="tag tag-cal">📅 Today</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Parent calendar view
  return (
    <div>
      {/* Settings bar */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:16 }}>
          <div>
            <div className="form-label">Week Starts On</div>
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              {["Mon","Sun"].map(d => (
                <button key={d} className={`btn btn-sm ${settings.calendarStartDay===d?"btn-blue":"btn-ghost"}`} onClick={()=>setStartDay(d)}>{d}</button>
              ))}
            </div>
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            <div className="form-label">Pick any date in Week 1 of your cycle</div>
            <input type="date" className="form-input" style={{ marginTop:4 }}
              value={settings.fortnightStart||""}
              onChange={e=>setFortnightStart(e.target.value)}/>
            {snappedLabel && (
              <div style={{ marginTop:6, padding:"6px 10px", background:"var(--mint)", borderRadius:8, fontSize:".78rem", fontWeight:700, color:"#065f46" }}>
                ✅ Week 1 starts: <strong>{snappedLabel}</strong>
              </div>
            )}
            {!snappedLabel && (
              <div style={{ marginTop:4, fontSize:".75rem", color:"var(--mid)", fontWeight:600 }}>
                Pick any date — the calendar will snap back to the nearest {settings.calendarStartDay}.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2-week grid */}
      {[0,1].map(week => (
        <div key={week}>
          <div className="week-label">
            <span style={{ background: week===0?"var(--blue)":"var(--purple)", color:"white", borderRadius:8, padding:"2px 12px", fontSize:".85rem" }}>
              Week {week+1}
            </span>
            {todaySlot?.week===week && <span style={{ fontSize:".8rem", color:"var(--amber)", fontWeight:800 }}>← this week</span>}
          </div>
          <div className="cal-grid">
            {dayLabels.map(d => <div key={d} className="cal-header">{d}</div>)}
          </div>
          <div className="cal-grid" style={{ marginBottom:8 }}>
            {[0,1,2,3,4,5,6].map(day => {
              const sk = slotKey(week, day);
              const careKids = careSchedule[sk] || [];
              const dayChores = (choreSchedule||[]).filter(x => x.slot===sk);
              const isToday = todaySlot?.week===week && todaySlot?.day===day;
              const isSel = selectedSlot?.week===week && selectedSlot?.day===day;
              return (
                <div key={day}
                  className={`cal-cell ${isToday?"today":""} ${careKids.length>0?"has-care":""}`}
                  style={{ border: isSel ? "2px solid var(--blue)" : "", background: isSel ? "#eff6ff" : "" }}
                  onClick={() => setSelectedSlot(isSel ? null : {week, day})}>
                  <div className="cal-day-num">{formatSlotDate(week,day) || dayLabels[day]}</div>
                  <div className="cal-avatars">
                    {careKids.map(cid => {
                      const c = children.find(x=>x.id===cid);
                      return c ? <Av key={cid} photo={c.photo} emoji={c.avatar} size={20}/> : null;
                    })}
                  </div>
                  {dayChores.length > 0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:2, justifyContent:"center", marginTop:3 }}>
                      {dayChores.slice(0,4).map((x,i) => <div key={i} className="cal-chore-dot"/>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day detail panel */}
          {selectedSlot?.week===week && (
            <div className="day-panel">
              <div className="day-panel-title">
                {dayLabels[selectedSlot.day]} — {formatSlotDate(selectedSlot.week, selectedSlot.day) || `Week ${week+1}, Day ${selectedSlot.day+1}`}
                {todaySlot?.week===selectedSlot.week && todaySlot?.day===selectedSlot.day && <span style={{ marginLeft:8, color:"var(--amber)", fontSize:".85rem" }}>📍 Today</span>}
              </div>

              {/* Care schedule */}
              <div style={{ fontWeight:700, fontSize:".82rem", color:"var(--mid)", marginBottom:6 }}>👨‍👧 In Care Today</div>
              <div className="care-toggle">
                {children.map(child => {
                  const sk = slotKey(selectedSlot.week, selectedSlot.day);
                  const active = (careSchedule[sk]||[]).includes(child.id);
                  return (
                    <div key={child.id} className={`care-chip ${active?"active":""}`} onClick={()=>toggleCare(sk, child.id)}>
                      <Av photo={child.photo} emoji={child.avatar} size={22}/>
                      {child.name}
                      {active && " ✓"}
                    </div>
                  );
                })}
              </div>

              {/* Assigned chores for this day */}
              <div style={{ fontWeight:700, fontSize:".82rem", color:"var(--mid)", marginBottom:6 }}>🧹 Scheduled Chores</div>
              {(choreSchedule||[]).filter(x=>x.slot===slotKey(selectedSlot.week,selectedSlot.day)).length===0 && (
                <div style={{ fontSize:".82rem", color:"var(--mid)", marginBottom:8 }}>No chores scheduled for this day.</div>
              )}
              {(choreSchedule||[]).filter(x=>x.slot===slotKey(selectedSlot.week,selectedSlot.day)).map((cs,i) => {
                const chore = chores.find(c=>c.id===cs.choreId);
                const child = children.find(c=>c.id===cs.childId);
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:"#f8fafc", borderRadius:10, marginBottom:6 }}>
                    <span style={{ fontSize:"1.2rem" }}>{chore?.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:".88rem" }}>{chore?.title}</div>
                      <div style={{ fontSize:".75rem", color:"var(--mid)" }}>{child?.avatar} {child?.name} · {pts(chore?.points||0)} · {money(chore?.points||0,rate,currency)}</div>
                    </div>
                    <button className="btn btn-red btn-sm" onClick={()=>removeChoreFromSlot(cs.slot,cs.childId,cs.choreId)}>✕</button>
                  </div>
                );
              })}
              <button className="btn btn-teal btn-sm" style={{ marginTop:4 }} onClick={()=>setAddChoreSlot(slotKey(selectedSlot.week,selectedSlot.day))}>+ Assign Chore</button>
            </div>
          )}
        </div>
      ))}

      {/* Assign chore modal */}
      {addChoreSlot && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">📅 Assign Chore to Day</div>
            <div className="form-group">
              <label className="form-label">Child</label>
              <select className="form-input" value={choreChild} onChange={e=>setChoreChild(e.target.value)}>
                {children.map(c=><option key={c.id} value={c.id}>{c.avatar} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Chore</label>
              <select className="form-input" value={choreId} onChange={e=>setChoreId(e.target.value)}>
                {chores.map(c=><option key={c.id} value={c.id}>{c.icon} {c.title} ({pts(c.points)})</option>)}
              </select>
            </div>
            <div style={{ background:"var(--sky)", borderRadius:10, padding:10, fontSize:".82rem", fontWeight:700, color:"var(--blue)", marginBottom:14 }}>
              This chore will appear in {children.find(c=>c.id===choreChild)?.name}'s schedule every fortnight on this day.
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-teal" style={{ flex:1 }} onClick={addChoreToSlot}>Assign Chore</button>
              <button className="btn btn-ghost" onClick={()=>setAddChoreSlot(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MilestoneRewards ─────────────────────────────────────────────────────────
function MilestoneRewards({ childId, milestoneRewards, onSave }) {
  const [open, setOpen] = useState(false);
  const rewards = milestoneRewards?.[childId] || {};
  const [vals, setVals] = useState(rewards);

  const save = () => {
    onSave(childId, vals);
    setOpen(false);
  };

  if (!open) return (
    <button className="btn btn-ghost btn-sm" style={{marginTop:8,width:"100%"}} onClick={()=>{setVals(milestoneRewards?.[childId]||{});setOpen(true);}}>
      🏅 Set Milestone Rewards
    </button>
  );

  return (
    <div style={{background:"#f8fafc",borderRadius:12,padding:14,marginTop:10}}>
      <div style={{fontWeight:800,marginBottom:4}}>🏅 Milestone Bonus Points</div>
      <div style={{fontSize:".78rem",color:"var(--mid)",fontWeight:600,marginBottom:12,lineHeight:1.5}}>
        Set bonus points to auto-award when this child unlocks a badge. Leave blank or 0 for no bonus.
      </div>
      <div style={{maxHeight:280,overflowY:"auto"}}>
        {ACHIEVEMENTS.map(a=>(
          <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid #f1f5f9"}}>
            <div style={{fontSize:"1.3rem",width:28,textAlign:"center"}}>{a.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:".85rem"}}>{a.label}</div>
              <div style={{fontSize:".72rem",color:"var(--mid)",fontWeight:600}}>{a.desc}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <input type="number" min="0" max="50"
                style={{width:56,padding:"5px 8px",border:"2px solid #e2e8f0",borderRadius:8,fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:".85rem",textAlign:"center",outline:"none"}}
                value={vals[a.id]||""}
                onChange={e=>setVals(v=>({...v,[a.id]:e.target.value}))}
                placeholder="0"/>
              <span style={{fontSize:".72rem",color:"var(--mid)",fontWeight:600}}>pts</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <button className="btn btn-blue btn-sm" onClick={save}>Save</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

// ─── ChecklistManager (parent) ────────────────────────────────────────────────
function ChecklistManager({ data, doUpdate, children, rate, currency }) {
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon]   = useState("✅");
  const [newPts, setNewPts]     = useState(0);
  const [newScope, setNewScope] = useState("all");
  const icons = ["✅","🦷","🛏️","🚿","👕","🎒","📚","💧","🥗","🏃","🐾","🧴","😴","🙏","🌟"];
  const today = todayISO();

  const addItem = () => {
    if (!newLabel.trim()) return;
    doUpdate(d=>({...d, checklistItems:[...(d.checklistItems||[]), {id:uid(), label:newLabel.trim(), icon:newIcon, points:+newPts||0, scope:newScope}]}));
    setNewLabel(""); setNewPts(0); setNewScope("all");
  };

  const removeItem = id => doUpdate(d=>({...d, checklistItems:(d.checklistItems||[]).filter(x=>x.id!==id)}));

  // Get today's log
  const getLog = (childId, itemId) => data.checklistLog?.[today]?.[childId]?.[itemId] || false;
  const setLog = (childId, itemId, val) => {
    doUpdate(d=>{
      const log = d.checklistLog || {};
      const dayLog = log[today] || {};
      const childLog = dayLog[childId] || {};
      const wasChecked = childLog[itemId] || false;
      const newChildLog = {...childLog, [itemId]: val};
      // Award/revoke points if item has points
      const item = (d.checklistItems||[]).find(x=>x.id===itemId);
      const pts2 = item?.points || 0;
      let newChildren = d.children;
      let newTxs = d.transactions;
      if (pts2 > 0) {
        if (val && !wasChecked) {
          newChildren = d.children.map(c=>c.id===childId?{...c,walletPoints:c.walletPoints+pts2}:c);
          newTxs = [{id:uid(),childId,type:"earn",points:pts2,label:`✅ ${item.label}`,time:now()},...d.transactions];
        } else if (!val && wasChecked) {
          newChildren = d.children.map(c=>c.id===childId?{...c,walletPoints:Math.max(0,c.walletPoints-pts2)}:c);
        }
      }
      return {...d, children:newChildren, transactions:newTxs, checklistLog:{...log,[today]:{...dayLog,[childId]:newChildLog}}};
    });
  };

  const items = data.checklistItems || [];

  return (
    <div>
      <div className="section-title">✅ Daily Checklist</div>

      {/* Today overview per child */}
      <div style={{marginBottom:20}}>
        <div style={{fontWeight:700,fontSize:".85rem",color:"var(--mid)",marginBottom:10}}>Today — {new Date().toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long"})}</div>
        {children.map(child=>{
          const childItems = items.filter(x=>x.scope==="all"||x.scope===child.id);
          const done = childItems.filter(x=>getLog(child.id,x.id)).length;
          const pct = childItems.length ? Math.round((done/childItems.length)*100) : 0;
          return (
            <div key={child.id} className="card" style={{marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <Av photo={child.photo} emoji={child.avatar} size={36}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800}}>{child.name}</div>
                  <div style={{fontSize:".78rem",color:"var(--mid)",fontWeight:600}}>{done}/{childItems.length} done · {pct}%</div>
                </div>
                <div style={{fontWeight:900,fontSize:"1.1rem",color:pct===100?"var(--green)":"var(--mid)"}}>{pct===100?"🌟":""}{pct}%</div>
              </div>
              <div style={{height:6,background:"#e2e8f0",borderRadius:99,marginBottom:10,overflow:"hidden"}}>
                <div style={{height:"100%",background:pct===100?"var(--green)":"var(--blue)",borderRadius:99,width:`${pct}%`,transition:"width .3s"}}/>
              </div>
              {childItems.map(item=>(
                <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #f8fafc"}}>
                  <div style={{fontSize:"1.2rem"}}>{item.icon}</div>
                  <div style={{flex:1,fontWeight:600,fontSize:".85rem",color:getLog(child.id,item.id)?"var(--mid)":"var(--dark)",textDecoration:getLog(child.id,item.id)?"line-through":"none"}}>{item.label}</div>
                  {item.points>0&&<span style={{fontSize:".72rem",fontWeight:700,color:"var(--amber)"}}>+{item.points}pts</span>}
                  <div onClick={()=>setLog(child.id,item.id,!getLog(child.id,item.id))}
                    style={{width:26,height:26,borderRadius:8,border:`2px solid ${getLog(child.id,item.id)?"var(--green)":"#e2e8f0"}`,background:getLog(child.id,item.id)?"var(--green)":"white",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,color:"white",fontWeight:900,fontSize:".85rem"}}>
                    {getLog(child.id,item.id)?"✓":""}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Manage items */}
      <div className="section-title" style={{fontSize:"1.1rem"}}>⚙️ Manage Checklist Items</div>
      <div className="card" style={{marginBottom:14}}>
        <div style={{fontWeight:800,marginBottom:10,fontSize:".9rem"}}>Add New Item</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
          {icons.map(ic=>(
            <div key={ic} onClick={()=>setNewIcon(ic)}
              style={{fontSize:"1.4rem",cursor:"pointer",padding:5,borderRadius:8,background:newIcon===ic?"#dbeafe":"#f1f5f9",border:newIcon===ic?"2px solid #3b82f6":"2px solid transparent"}}>
              {ic}
            </div>
          ))}
        </div>
        <div className="form-group">
          <input className="form-input" placeholder="e.g. Brush teeth" value={newLabel} onChange={e=>setNewLabel(e.target.value)}/>
        </div>
        <div className="form-row">
          <div className="form-group mb-0">
            <label className="form-label">Applies to</label>
            <select className="form-input" value={newScope} onChange={e=>setNewScope(e.target.value)}>
              <option value="all">All children</option>
              {children.map(c=><option key={c.id} value={c.id}>{c.name} only</option>)}
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Points (0 = no reward)</label>
            <input className="form-input" type="number" min="0" max="20" value={newPts} onChange={e=>setNewPts(e.target.value)}/>
          </div>
        </div>
        <button className="btn btn-teal" style={{marginTop:10,width:"100%"}} onClick={addItem}>+ Add Item</button>
      </div>

      {items.length===0&&<div className="empty"><div className="empty-icon">✅</div><div className="empty-text">No checklist items yet</div></div>}
      {items.map(item=>(
        <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"white",borderRadius:12,boxShadow:"var(--shadow)",marginBottom:8}}>
          <div style={{fontSize:"1.4rem"}}>{item.icon}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:".88rem"}}>{item.label}</div>
            <div style={{fontSize:".72rem",color:"var(--mid)",fontWeight:600}}>
              {item.scope==="all"?"All children":children.find(c=>c.id===item.scope)?.name+" only"}
              {item.points>0?` · +${item.points} pts`:" · No reward"}
            </div>
          </div>
          <button className="btn btn-red btn-sm" onClick={()=>removeItem(item.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── HelpTab ──────────────────────────────────────────────────────────────────
function HelpSection({ icon, title, children, color="#3b82f6" }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{background:"white",borderRadius:14,marginBottom:10,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",cursor:"pointer",userSelect:"none"}}>
        <div style={{width:38,height:38,borderRadius:10,background:color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem",flexShrink:0}}>{icon}</div>
        <div style={{flex:1,fontWeight:800,fontSize:".95rem"}}>{title}</div>
        <div style={{fontSize:"1.1rem",color:"var(--mid)",transition:"transform .2s",transform:open?"rotate(180deg)":"rotate(0deg)"}}>⌄</div>
      </div>
      {open&&(
        <div style={{padding:"0 18px 16px",borderTop:"1px solid #f1f5f9"}}>
          {children}
        </div>
      )}
    </div>
  );
}

function HelpStep({ num, text }) {
  return (
    <div style={{display:"flex",gap:10,alignItems:"flex-start",marginTop:10}}>
      <div style={{width:24,height:24,borderRadius:"50%",background:"var(--blue)",color:"white",fontSize:".75rem",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{num}</div>
      <div style={{fontSize:".88rem",fontWeight:600,color:"var(--dark)",lineHeight:1.5}}>{text}</div>
    </div>
  );
}

function HelpTip({ text }) {
  return (
    <div style={{background:"var(--sky)",borderRadius:10,padding:"9px 12px",marginTop:10,fontSize:".82rem",fontWeight:700,color:"var(--blue)",lineHeight:1.5}}>
      💡 {text}
    </div>
  );
}

function HelpBadge({ label, color }) {
  return <span style={{display:"inline-block",borderRadius:20,padding:"2px 10px",fontSize:".75rem",fontWeight:800,background:color+"22",color:color,margin:"2px 3px 2px 0"}}>{label}</span>;
}

function HelpTab() {
  return (
    <div>
      {/* Header card */}
      <div style={{background:"linear-gradient(135deg,#667eea,#764ba2)",borderRadius:20,padding:"22px 20px",marginBottom:20,color:"white",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-30,right:-30,width:110,height:110,borderRadius:"50%",background:"rgba(255,255,255,.1)"}}/>
        <div style={{fontSize:"2rem",marginBottom:6}}>❓</div>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.5rem",marginBottom:4}}>Help & Guide</div>
        <div style={{fontSize:".85rem",opacity:.88,fontWeight:600,lineHeight:1.5}}>
          Tap any section below to expand it. Each section explains a feature and how to use it.
        </div>
      </div>

      {/* Quick start */}
      <HelpSection icon="🚀" title="Quick Start — First Time Setup" color="#10b981">
        <HelpStep num="1" text="Go to Settings → set your currency (e.g. AUD) and how much each point is worth (default 50¢)." />
        <HelpStep num="2" text="Go to Children → edit the demo profiles or remove them and add your own kids. You can upload a photo or pick an emoji avatar." />
        <HelpStep num="3" text="Go to Chores → add the chores your family does. Set the point value, whether a photo is required, and if it repeats." />
        <HelpStep num="4" text="Go to Banks → for each child, create savings goals (e.g. Screen Time, New Toy). Set a point target and reward description." />
        <HelpStep num="5" text="Optional: go to Calendar → set up your fortnight cycle if you have a split care arrangement." />
        <HelpStep num="6" text="Share the app URL with your family. Kids tap their profile to log in and start claiming chores!" />
        <HelpTip text="The default parent PIN is 1234. Change it in Settings as soon as you are set up." />
      </HelpSection>

      {/* Approvals */}
      <HelpSection icon="✅" title="Approvals — Reviewing Chore Requests" color="#f59e0b">
        <div style={{fontSize:".88rem",color:"var(--mid)",fontWeight:600,marginTop:10,lineHeight:1.6}}>
          When a child claims a chore, it appears here as a pending card. You must approve or reject it before any points are awarded.
        </div>
        <HelpStep num="1" text="Review the child name, chore, and submission time." />
        <HelpStep num="2" text="If a photo was required, tap 📸 View Photo to inspect their evidence." />
        <HelpStep num="3" text='Tap "✓ Yes" to approve — points land in the child wallet instantly.' />
        <HelpStep num="4" text='Tap "✗ No" to reject — the child can resubmit after fixing the issue.' />
        <HelpTip text="The red dot on the Approvals tab tells you how many are waiting. Check it daily!" />
      </HelpSection>

      {/* Calendar */}
      <HelpSection icon="📅" title="Calendar — Fortnight Schedule & Split Care" color="#8b5cf6">
        <div style={{fontSize:".88rem",color:"var(--mid)",fontWeight:600,marginTop:10,lineHeight:1.6}}>
          The calendar runs on a repeating 14-day cycle. Use it to mark which child is in your care on which days, and to assign chores to specific days.
        </div>
        <HelpStep num="1" text='Choose "Mon" or "Sun" for your week start day.' />
        <HelpStep num="2" text="Pick any date in Week 1 of your care cycle. The calendar snaps to the nearest Monday/Sunday automatically — a green confirmation shows the exact start date." />
        <HelpStep num="3" text="Tap any day cell to open the day panel. Toggle which children are in care that day using the green chips." />
        <HelpStep num="4" text='In the day panel, tap "+ Assign Chore" to pin a specific chore to a specific child on that day. It will repeat every fortnight.' />
        <HelpTip text="Children see their scheduled chores for today in their Schedule tab — the full calendar is only visible to parents." />
        <div style={{background:"var(--lavender)",borderRadius:10,padding:"10px 12px",marginTop:10,fontSize:".82rem",fontWeight:700,color:"var(--purple)",lineHeight:1.5}}>
          <strong>Split care example:</strong> Mark Week 1 all days for Child A, Week 2 all days for Child B — then assign each child chores to their respective week.
        </div>
      </HelpSection>

      {/* Chores */}
      <HelpSection icon="🧹" title="Chores — Creating & Managing Chores" color="#f97316">
        <div style={{fontSize:".88rem",color:"var(--mid)",fontWeight:600,marginTop:10,lineHeight:1.6}}>
          Chores are the tasks children complete to earn points. All chores are available to all children by default — use the Calendar to assign specific ones to specific days/kids.
        </div>
        <div style={{marginTop:12,marginBottom:4,fontWeight:800,fontSize:".85rem"}}>When adding a chore:</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
          <HelpBadge label="Icon 🍽️" color="#f97316"/>
          <HelpBadge label="Points value" color="#f59e0b"/>
          <HelpBadge label="🔄 Recurring or 🎯 One-off" color="#10b981"/>
          <HelpBadge label="📸 Photo required?" color="#3b82f6"/>
        </div>
        <HelpTip text="Use Photo Required for chores like 'Clean Bedroom' where a quick snap keeps everyone honest. Skip it for simpler tasks." />
      </HelpSection>

      {/* Banks */}
      <HelpSection icon="🏦" title="Banks — Savings Goals for Each Child" color="#8b5cf6">
        <div style={{fontSize:".88rem",color:"var(--mid)",fontWeight:600,marginTop:10,lineHeight:1.6}}>
          Banks are where children save their points toward rewards. Each child has their own banks. There are two types:
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"10px 0"}}>
          <div style={{background:"var(--mint)",borderRadius:10,padding:"8px 12px",flex:1,minWidth:140}}>
            <div style={{fontWeight:800,fontSize:".82rem",color:"#065f46"}}>🔄 Recurring</div>
            <div style={{fontSize:".78rem",color:"#065f46",marginTop:3,fontWeight:600}}>Redeems and resets. E.g. "5 pts = 15 min screen time" — can be redeemed repeatedly.</div>
          </div>
          <div style={{background:"var(--lavender)",borderRadius:10,padding:"8px 12px",flex:1,minWidth:140}}>
            <div style={{fontWeight:800,fontSize:".82rem",color:"var(--purple)"}}>🎯 One-off Goal</div>
            <div style={{fontSize:".78rem",color:"var(--purple)",marginTop:3,fontWeight:600}}>A single savings target. E.g. "40 pts = new LEGO set". Completes once and empties.</div>
          </div>
        </div>
        <HelpTip text="Give each child at least one recurring bank AND one goal bank. This creates the spend-vs-save tension that teaches real financial thinking." />
      </HelpSection>

      {/* Children */}
      <HelpSection icon="👦" title="Children — Managing Profiles & PINs" color="#10b981">
        <div style={{fontSize:".88rem",color:"var(--mid)",fontWeight:600,marginTop:10,lineHeight:1.6}}>
          Each child has their own profile, wallet, and bank set.
        </div>
        <HelpStep num="1" text='Tap "✏️ Edit / Manage PIN" on any child card to change their name, avatar, or PIN.' />
        <HelpStep num="2" text='Tap "🎁 Gift Points" to inject bonus points — great for birthdays or rewarding great behaviour. Add a note so the child knows why.' />
        <HelpStep num="3" text="To reset a forgotten PIN: go to Children → Edit → set a new PIN for them." />
        <HelpStep num="4" text='To remove a PIN entirely: go to Edit → tap "Remove PIN". The child will log in without a PIN.' />
        <HelpTip text="Younger kids work well without a PIN. Older kids enjoy having their own secure account." />
      </HelpSection>

      {/* Point system */}
      <HelpSection icon="⭐" title="Points & Money — How the System Works" color="#f59e0b">
        <div style={{fontSize:".88rem",color:"var(--mid)",fontWeight:600,marginTop:10,lineHeight:1.6}}>
          Points flow through the app in four stages:
        </div>
        {[
          ["Complete chore → Submit","Child claims a chore and submits it (with photo if required)"],
          ["Parent approves","Points are added to the child wallet instantly"],
          ["Child distributes","Child moves points from wallet into savings banks"],
          ["Redeem reward","When a bank reaches its target, child redeems the reward"],
        ].map(([step,desc],i)=>(
          <div key={i} style={{display:"flex",gap:10,marginTop:10,alignItems:"flex-start"}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:"var(--amber)",color:"white",fontSize:".72rem",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{i+1}</div>
            <div>
              <div style={{fontWeight:800,fontSize:".85rem"}}>{step}</div>
              <div style={{fontSize:".8rem",color:"var(--mid)",fontWeight:600,marginTop:2}}>{desc}</div>
            </div>
          </div>
        ))}
        <HelpTip text="The point value is set in Settings. Start at 50¢ per point and adjust as kids grow. This is a great teaching moment about wages and purchasing power." />
      </HelpSection>

      {/* Financial literacy */}
      <HelpSection icon="💡" title="Teaching Money Values — The Inspiration Feature" color="#10b981">
        <div style={{fontSize:".88rem",color:"var(--mid)",fontWeight:600,marginTop:10,lineHeight:1.6}}>
          ChoreChart has a built-in financial literacy feature that helps kids understand the cost of impulse spending.
        </div>
        <div style={{background:"#fef3c7",borderRadius:10,padding:"10px 12px",marginTop:10,fontSize:".82rem",fontWeight:700,color:"#92400e",lineHeight:1.5}}>
          <strong>On recurring bank cards:</strong> After the first redemption, a yellow tally box shows total points and dollars spent on that reward — and how far that money would have taken them toward a savings goal.
        </div>
        <div style={{background:"var(--mint)",borderRadius:10,padding:"10px 12px",marginTop:8,fontSize:".82rem",fontWeight:700,color:"#065f46",lineHeight:1.5}}>
          <strong>At redemption time:</strong> Before confirming, children see a nudge screen showing their running tally and a progress bar: "If you saved this instead, you'd be 67% of the way to your New Bike 🚲"
        </div>
        <HelpTip text="This works best when each child has both a recurring bank (e.g. Screen Time) and a goal bank (e.g. New Toy). The contrast between the two is the lesson." />
      </HelpSection>

      {/* Settings */}
      <HelpSection icon="⚙️" title="Settings — Currency, PINs & Parents" color="#64748b">
        <div style={{fontSize:".88rem",color:"var(--mid)",fontWeight:600,marginTop:10,lineHeight:1.6}}>
          The Settings tab has three areas:
        </div>
        <div style={{marginTop:10}}>
          <div style={{fontWeight:800,fontSize:".85rem",marginBottom:4}}>💰 Currency & Point Value</div>
          <div style={{fontSize:".82rem",color:"var(--mid)",fontWeight:600,lineHeight:1.5}}>Choose from 20 currencies (AUD, USD, GBP, EUR, NZD and more). Set how much each point is worth. All money values update instantly across the whole app.</div>
        </div>
        <div style={{marginTop:10}}>
          <div style={{fontWeight:800,fontSize:".85rem",marginBottom:4}}>👤 Parent Accounts</div>
          <div style={{fontSize:".82rem",color:"var(--mid)",fontWeight:600,lineHeight:1.5}}>Add multiple parents — each with their own name, avatar (photo or emoji), and PIN. Edit your name or change your PIN at any time. You'll need your current PIN to set a new one.</div>
        </div>
        <div style={{marginTop:10}}>
          <div style={{fontWeight:800,fontSize:".85rem",marginBottom:4}}>📊 Family Stats</div>
          <div style={{fontSize:".82rem",color:"var(--mid)",fontWeight:600,lineHeight:1.5}}>A quick summary of total children, chores, and approved completions.</div>
        </div>
        <HelpTip text="Change the default PIN (1234) as soon as you set up the app so your kids cannot sneak into the parent portal!" />
      </HelpSection>

      {/* Data note */}
      <div style={{background:"#fef3c7",borderRadius:14,padding:"14px 16px",marginTop:6,marginBottom:20}}>
        <div style={{fontWeight:800,fontSize:".88rem",color:"#92400e",marginBottom:4}}>📱 Data & Syncing</div>
        <div style={{fontSize:".82rem",color:"#92400e",fontWeight:600,lineHeight:1.6}}>
          Currently, data is stored on each device separately. If you approve a chore on your phone, your child will not see it on a different device until a shared database is connected. A cloud sync upgrade is planned for a future update.
        </div>
      </div>
    </div>
  );
}

// ─── Achievements definition ──────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id:"first_chore",    icon:"⭐", label:"First Step",      desc:"Complete your first chore",              check:(txs)=>txs.filter(t=>t.type==="earn").length>=1 },
  { id:"five_chores",    icon:"🔥", label:"On Fire",         desc:"Complete 5 chores",                      check:(txs)=>txs.filter(t=>t.type==="earn").length>=5 },
  { id:"ten_chores",     icon:"💪", label:"Hard Worker",     desc:"Complete 10 chores",                     check:(txs)=>txs.filter(t=>t.type==="earn").length>=10 },
  { id:"twenty_chores",  icon:"🏆", label:"Champion",        desc:"Complete 20 chores",                     check:(txs)=>txs.filter(t=>t.type==="earn").length>=20 },
  { id:"first_save",     icon:"🏦", label:"Saver",           desc:"Distribute points to a bank for the first time", check:(txs)=>txs.filter(t=>t.type==="save").length>=1 },
  { id:"first_redeem",   icon:"🎉", label:"Treat Yourself",  desc:"Redeem your first reward",               check:(txs)=>txs.filter(t=>t.type==="redeem").length>=1 },
  { id:"first_bonus",    icon:"🌟", label:"Above & Beyond",  desc:"Earn a bonus for exceptional effort",    check:(txs)=>txs.filter(t=>t.type==="bonus").length>=1 },
  { id:"three_bonus",    icon:"💎", label:"Star Performer",  desc:"Earn 3 bonuses",                         check:(txs)=>txs.filter(t=>t.type==="bonus").length>=3 },
  { id:"earn_10pts",     icon:"💰", label:"Pocket Money",    desc:"Earn 10 points total",                   check:(txs)=>txs.filter(t=>t.type==="earn"||t.type==="bonus").reduce((a,t)=>a+t.points,0)>=10 },
  { id:"earn_50pts",     icon:"💵", label:"Big Earner",      desc:"Earn 50 points total",                   check:(txs)=>txs.filter(t=>t.type==="earn"||t.type==="bonus").reduce((a,t)=>a+t.points,0)>=50 },
  { id:"earn_100pts",    icon:"🤑", label:"Money Maker",     desc:"Earn 100 points total",                  check:(txs)=>txs.filter(t=>t.type==="earn"||t.type==="bonus").reduce((a,t)=>a+t.points,0)>=100 },
  { id:"streak_3",       icon:"📅", label:"3-Day Streak",    desc:"Complete chores 3 days in a row",        check:(_,streak)=>streak>=3 },
  { id:"streak_7",       icon:"🗓️", label:"Week Warrior",    desc:"Complete chores 7 days in a row",        check:(_,streak)=>streak>=7 },
  { id:"gift_received",  icon:"🎁", label:"Lucky Day",       desc:"Receive a gift from a parent",           check:(txs)=>txs.filter(t=>t.type==="gift").length>=1 },
];

function checkAchievements(data, childId) {
  const childTxs = data.transactions.filter(t=>t.childId===childId);
  const streak = calcStreak(data, childId);
  const child = data.children.find(c=>c.id===childId);
  if (!child) return data;
  const existing = child.achievements || [];
  const newlyUnlocked = ACHIEVEMENTS.filter(a =>
    !existing.includes(a.id) && a.check(childTxs, streak)
  ).map(a=>a.id);
  if (newlyUnlocked.length===0) return data;

  // Award milestone bonus points for any newly unlocked achievements
  const milestones = data.milestoneRewards?.[childId] || {};
  const bonusTxs = newlyUnlocked
    .filter(id => milestones[id] && +milestones[id] > 0)
    .map(id => {
      const a = ACHIEVEMENTS.find(x=>x.id===id);
      return { id:uid(), childId, type:"bonus", points:+milestones[id], label:`${a?.icon} Milestone: ${a?.label}!`, time:now() };
    });
  const bonusPtsTotal = bonusTxs.reduce((a,t)=>a+t.points, 0);

  return {
    ...data,
    children: data.children.map(c => c.id===childId ? {
      ...c,
      achievements: [...existing, ...newlyUnlocked],
      walletPoints: c.walletPoints + bonusPtsTotal,
    } : c),
    transactions: bonusTxs.length > 0 ? [...bonusTxs, ...data.transactions] : data.transactions,
  };
}

// Today as YYYY-MM-DD in local time
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function calcStreak(data, childId) {
  const earnTxs = data.transactions.filter(t=>t.childId===childId && t.type==="earn");
  if (earnTxs.length===0) return 0;

  // Build set of dates child earned points (local date strings "DD/MM/YYYY")
  const earnDateSet = new Set(earnTxs.map(t=>{
    try { return t.time.split(",")[0]; } catch { return null; }
  }).filter(Boolean));

  // Build set of "away" dates from careSchedule (dates where child NOT in care)
  // Convert fortnight slots to real dates and check if child is absent
  const awayDates = new Set();
  if (data.settings?.fortnightStart) {
    const anchor = parseLocalDate(data.settings.fortnightStart);
    const snapped = snapToStartDay(anchor, data.settings.calendarStartDay || "Mon");
    // Check last 60 days
    for (let i=0; i<60; i++) {
      const d = new Date(snapped);
      d.setDate(snapped.getDate() + i);
      const diffDays = Math.floor((d - snapped) / 86400000);
      const week = Math.floor((diffDays % 14) / 7);
      const day  = diffDays % 7;
      const sk   = slotKey(week, day);
      const careKids = data.careSchedule?.[sk] || [];
      // If calendar is set up and child is NOT in careKids for that slot, mark as away
      if (Object.keys(data.careSchedule||{}).length > 0 && !careKids.includes(childId)) {
        const dateStr = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
        awayDates.add(dateStr);
      }
    }
  }

  // Walk backwards from today, counting consecutive "active" days
  // Active = either earned points OR was away (away days are skipped, not broken)
  let streak = 0;
  let broken = false;
  const today = new Date(); today.setHours(0,0,0,0);

  for (let i=0; i<=60 && !broken; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;

    if (awayDates.has(dateStr)) continue; // skip away days entirely
    if (earnDateSet.has(dateStr)) { streak++; continue; }
    if (i === 0) continue; // today hasn't ended yet, don't break on today
    broken = true;
  }

  return streak;
}

// ─── ApprovalModal ────────────────────────────────────────────────────────────
function ApprovalModal({ req, child, chore, rate, currency, onApprove, onReject, onClose }) {
  const [mode, setMode]       = useState("approve"); // "approve" | "reject"
  const [bonusPts, setBonusPts] = useState(0);
  const [note, setNote]       = useState("");

  const chorePts = chore?.points || 0;
  const totalPts = chorePts + (+bonusPts||0);

  return (
    <div className="modal-overlay">
      <div className="modal">
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <div style={{fontSize:"2.2rem"}}>{chore?.icon||"📋"}</div>
          <div>
            <div style={{fontWeight:800,fontSize:"1.05rem"}}>{chore?.title}</div>
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:".82rem",color:"var(--mid)",fontWeight:600}}>
              <Av photo={child?.photo} emoji={child?.avatar} size={18}/>{child?.name}
            </div>
          </div>
          {req.photo&&(
            <a href={req.photo} target="_blank" rel="noreferrer"
              style={{marginLeft:"auto",fontSize:".78rem",color:"var(--blue)",fontWeight:700}}>📸 View Photo</a>
          )}
        </div>

        {/* Mode toggle */}
        <div style={{display:"flex",gap:8,marginBottom:18}}>
          <button className={`btn ${mode==="approve"?"btn-green":"btn-ghost"}`} style={{flex:1}}
            onClick={()=>{setMode("approve");setNote("");}}>✓ Approve</button>
          <button className={`btn ${mode==="reject"?"btn-red":"btn-ghost"}`} style={{flex:1}}
            onClick={()=>{setMode("reject");setBonusPts(0);}}>✗ Reject</button>
        </div>

        {/* Approve panel */}
        {mode==="approve"&&(
          <>
            <div style={{background:"var(--mint)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:".82rem",color:"#065f46",marginBottom:4}}>Base reward</div>
              <div style={{fontWeight:900,fontSize:"1.1rem",color:"var(--green)"}}>
                {pts(chorePts)} · {money(chorePts,rate,currency)}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">⭐ Bonus points — did they go above and beyond?</label>
              <div style={{display:"flex",gap:8,marginBottom:6}}>
                {[0,1,2,3,5].map(n=>(
                  <div key={n} onClick={()=>setBonusPts(n)}
                    style={{flex:1,textAlign:"center",padding:"8px 4px",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:".9rem",
                      background:bonusPts===n?"var(--amber)":"#f1f5f9",
                      color:bonusPts===n?"white":"var(--dark)",
                      border:bonusPts===n?"2px solid var(--amber)":"2px solid transparent"}}>
                    {n===0?"None":`+${n}`}
                  </div>
                ))}
              </div>
              <input className="form-input" type="number" min="0" max="20" placeholder="Or enter custom bonus..."
                value={bonusPts||""} onChange={e=>setBonusPts(+e.target.value)}/>
            </div>

            {+bonusPts>0&&(
              <div className="form-group">
                <label className="form-label">Note for {child?.name} (optional)</label>
                <input className="form-input" placeholder={`e.g. "Amazing effort today!"`}
                  value={note} onChange={e=>setNote(e.target.value)}/>
              </div>
            )}

            {+bonusPts>0&&(
              <div style={{background:"var(--yellow)",borderRadius:12,padding:"10px 14px",marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:".82rem",color:"#92400e"}}>Total to award</div>
                <div style={{fontWeight:900,fontSize:"1.2rem",color:"#b45309"}}>
                  {pts(totalPts)} · {money(totalPts,rate,currency)}
                  <span style={{fontSize:".8rem",fontWeight:700,marginLeft:8,color:"#92400e"}}>
                    ({pts(chorePts)} + {pts(+bonusPts)} bonus)
                  </span>
                </div>
              </div>
            )}

            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-green" style={{flex:1}}
                onClick={()=>{onApprove(bonusPts,note);onClose();}}>
                ✓ Approve {+bonusPts>0?`& Award ${pts(totalPts)}`:""}
              </button>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}

        {/* Reject panel */}
        {mode==="reject"&&(
          <>
            <div style={{background:"#fee2e2",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:".85rem",fontWeight:700,color:"#991b1b"}}>
              No points will be awarded. {child?.name} can resubmit after fixing the issue.
            </div>
            <div className="form-group">
              <label className="form-label">Leave a note for {child?.name} (recommended)</label>
              <input className="form-input" placeholder={`e.g. "Dishes still dirty, try again!"`}
                value={note} onChange={e=>setNote(e.target.value)}/>
              <div style={{fontSize:".75rem",color:"var(--mid)",fontWeight:600,marginTop:4}}>
                This will show in their history so they know what to fix.
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-red" style={{flex:1}}
                onClick={()=>{onReject(note);onClose();}}>✗ Reject Chore</button>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [data,setData]             = useState(loadData);
  const [screen,setScreen]         = useState("home");
  const [activeUser,setActiveUser] = useState(null);
  const [pendingLogin,setPending]  = useState(null);
  const [childTab,setChildTab]     = useState("chores");
  const [parentTab,setParentTab]   = useState("approvals");
  const [selChild,setSelChild]     = useState(null);
  const [modal,setModal]           = useState(null);
  const [claimChore,setClaimChore] = useState(null);
  const [claimPhoto,setClaimPhoto] = useState(null);
  const [distAmts,setDistAmts]     = useState({});
  const [giftChild,setGiftChild]   = useState(null);
  const [giftPts,setGiftPts]       = useState("");
  const [giftNote,setGiftNote]     = useState("");
  const [redeemNudge,setRedeemNudge] = useState(null);
  const [approvalModal,setApprovalModal] = useState(null); // { reqId, mode: 'approve'|'reject' }

  const rate = data.settings?.pointValue || 0.5;
  const currency = data.settings?.currency || "AUD";

  const doUpdate = fn => {
    let next;
    setData(d=>{next=fn(d);saveData(next);return next;});
    setTimeout(()=>{
      if(!next||!activeUser)return;
      if(screen==="child"){const c=next.children.find(x=>x.id===activeUser.id);if(c)setActiveUser(c);}
      if(screen==="parent"){const p=next.parents.find(x=>x.id===activeUser.id);if(p)setActiveUser(p);}
    },0);
  };

  const myChores  = activeUser&&screen==="child" ? data.chores : [];
  const myBanks   = activeUser&&screen==="child" ? data.banks.filter(b=>b.childId===activeUser.id) : [];
  const myHistory = activeUser&&screen==="child" ? data.choreRequests.filter(r=>r.childId===activeUser.id) : [];
  const childBanks = selChild ? data.banks.filter(b=>b.childId===selChild) : [];

  // Login
  const handleSelectParent = p=>{setPending({type:"parent",user:p});setModal("pin");};
  const handleSelectChild  = c=>{
    if(c.pin){setPending({type:"child",user:c});setModal("childPin");}
    else{setActiveUser(c);setScreen("child");setChildTab("chores");}
  };
  const handleParentPinOk=()=>{
    const fresh=loadData().parents.find(p=>p.id===pendingLogin.user.id)||pendingLogin.user;
    setActiveUser(fresh);setScreen("parent");setModal(null);setPending(null);
    setSelChild(data.children[0]?.id||null);
  };
  const handleChildPinOk=()=>{
    const fresh=loadData().children.find(c=>c.id===pendingLogin.user.id)||pendingLogin.user;
    setActiveUser(fresh);setScreen("child");setChildTab("chores");setModal(null);setPending(null);
  };

  // Chore claim
  const handleClaimChore=chore=>{setClaimChore(chore);setClaimPhoto(null);setModal("claimChore");};
  const handleSubmitClaim=()=>{
    if(!claimChore)return;
    doUpdate(d=>({...d,choreRequests:[{id:uid(),childId:activeUser.id,choreId:claimChore.id,status:"pending",time:now(),photo:claimPhoto},...d.choreRequests]}));
    setModal(null);setClaimChore(null);setClaimPhoto(null);
  };

  const handleApprove=(reqId, bonusPts=0, note="")=>doUpdate(d=>{
    const req=d.choreRequests.find(r=>r.id===reqId);
    const chore=d.chores.find(c=>c.id===req?.choreId);
    if(!req||!chore)return d;
    const total=chore.points+(+bonusPts||0);
    const txs=[{id:uid(),childId:req.childId,type:"earn",points:chore.points,label:chore.title,choreId:chore.id,time:now()}];
    if(+bonusPts>0) txs.push({id:uid(),childId:req.childId,type:"bonus",points:+bonusPts,label:`⭐ Bonus: ${note||"Great effort!"}`,time:now()});
    const newData={...d,
      choreRequests:d.choreRequests.map(r=>r.id===reqId?{...r,status:"approved",note,bonusPts:+bonusPts||0}:r),
      children:d.children.map(c=>c.id===req.childId?{...c,walletPoints:c.walletPoints+total}:c),
      transactions:[...txs,...d.transactions]
    };
    return checkAchievements(newData, req.childId);
  });
  const handleReject=(reqId,note="")=>doUpdate(d=>({...d,choreRequests:d.choreRequests.map(r=>r.id===reqId?{...r,status:"rejected",note}:r)}));

  const handleDistribute=()=>{
    const child=data.children.find(c=>c.id===activeUser.id);
    const total=Object.values(distAmts).reduce((a,b)=>a+(+b||0),0);
    if(total>child.walletPoints||total<=0)return;
    doUpdate(d=>{
      const banks=d.banks.map(b=>{const add=+distAmts[b.id]||0;return add>0?{...b,savedPoints:b.savedPoints+add}:b;});
      const txs=Object.entries(distAmts).filter(([,v])=>+v>0).map(([bid,v])=>{const b=d.banks.find(x=>x.id===bid);return{id:uid(),childId:activeUser.id,type:"save",points:-v,label:`→ ${b?.name}`,time:now()};});
      return{...d,banks,children:d.children.map(c=>c.id===activeUser.id?{...c,walletPoints:c.walletPoints-total}:c),transactions:[...txs,...d.transactions]};
    });
    setDistAmts({});
  };

  const handleRedeemBank=bankId=>{
    const bank=data.banks.find(b=>b.id===bankId);
    if(!bank||bank.savedPoints<bank.costPoints)return;
    doUpdate(d=>({
      ...d,
      banks:d.banks.map(b=>b.id===bankId?{...b,savedPoints:b.type==="recurring"?b.savedPoints-b.costPoints:0}:b),
      transactions:[{
        id:uid(),childId:bank.childId,type:"redeem",
        points:-bank.costPoints,
        label:`🎉 ${bank.reward}`,
        bankId:bankId,
        bankName:bank.name,
        bankIcon:bank.icon,
        time:now()
      },...d.transactions]
    }));
    setRedeemNudge(null);
  };

  const handleGift=()=>{
    const p=+giftPts; if(!giftChild||p<=0)return;
    doUpdate(d=>({...d,children:d.children.map(c=>c.id===giftChild?{...c,walletPoints:c.walletPoints+p}:c),transactions:[{id:uid(),childId:giftChild,type:"gift",points:p,label:`🎁 ${giftNote||"Gift from Parent"}`,time:now()},...d.transactions]}));
    setGiftChild(null);setGiftPts("");setGiftNote("");
  };

  const photoInput=async e=>{if(e.target.files[0])setClaimPhoto(await readFile(e.target.files[0]));};

  // ══ HOME ══════════════════════════════════════════════════════════════════════
  if(screen==="home") return(
    <>
      <style>{styles}</style>
      <div className="screen-select">
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:"3.5rem",marginBottom:6}}>⭐</div>
          <div className="screen-select-title">ChoreChart</div>
          <div style={{color:"var(--mid)",fontWeight:600,fontSize:".95rem"}}>Earn points · Build good habits · Save for what you love</div>
        </div>
        <div className="profile-cards">
          {data.children.map(child=>(
            <div key={child.id} className="profile-card" onClick={()=>handleSelectChild(child)}>
              <Av photo={child.photo} emoji={child.avatar} size={54}/>
              <div className="profile-name">{child.name}</div>
              <div className="profile-role">{child.pin?"🔒 PIN protected":"Tap to enter"}</div>
              <div className="profile-role">⭐ {child.walletPoints} pts · {money(child.walletPoints,rate,currency)}</div>
            </div>
          ))}
          {data.parents.map(parent=>(
            <div key={parent.id} className="profile-card parent-card" onClick={()=>handleSelectParent(parent)}>
              <Av photo={parent.photo} emoji={parent.avatar||"👤"} size={54}/>
              <div className="profile-name">{parent.name}</div>
              <div className="profile-role">🔒 Parent Portal</div>
            </div>
          ))}
        </div>
        {modal==="pin"&&pendingLogin&&<PinModal user={pendingLogin.user} onSuccess={handleParentPinOk} onCancel={()=>{setModal(null);setPending(null);}}/>}
        {modal==="childPin"&&pendingLogin&&<ChildPinModal child={pendingLogin.user} onSuccess={handleChildPinOk} onCancel={()=>{setModal(null);setPending(null);}}/>}
      </div>
    </>
  );

  // ══ CHILD ═════════════════════════════════════════════════════════════════════
  if(screen==="child"){
    const child=data.children.find(c=>c.id===activeUser.id)||activeUser;
    return(
      <>
        <style>{styles}</style>
        <div className="app">
          <nav className="nav">
            <div className="nav-logo"><Av photo={child.photo} emoji={child.avatar} size={30}/>{child.name}</div>
            <div className="nav-right">
              <div className="nav-badge">⭐ {child.walletPoints} · {money(child.walletPoints,rate,currency)}</div>
              <button className="nav-btn ghost" onClick={()=>setScreen("home")}>← Switch</button>
            </div>
          </nav>
          <div className="main">
            {(()=>{
              const streak=calcStreak(data,child.id);
              const earned=data.transactions.filter(t=>t.childId===child.id&&(t.type==="earn"||t.type==="bonus")).reduce((a,t)=>a+t.points,0);
              const badges=(child.achievements||[]);
              return(
                <div className="wallet-card">
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div className="wallet-label">My Wallet</div>
                      <div className="wallet-pts">{child.walletPoints} <span style={{fontSize:"1.4rem"}}>pts</span></div>
                      <div className="wallet-money">{money(child.walletPoints,rate,currency)} value · {CURRENCIES.find(c=>c.code===currency)?.symbol||"$"}{rate.toFixed(2)} per point</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      {streak>0&&(
                        <div style={{background:"rgba(255,255,255,.2)",borderRadius:12,padding:"6px 12px",marginBottom:6}}>
                          <div style={{fontWeight:900,fontSize:"1.1rem"}}>🔥 {streak}</div>
                          <div style={{fontSize:".72rem",opacity:.88,fontWeight:700}}>day streak</div>
                        </div>
                      )}
                      {badges.length>0&&(
                        <div style={{background:"rgba(255,255,255,.15)",borderRadius:12,padding:"5px 10px",fontSize:"1.1rem"}}>
                          {badges.slice(-4).map(id=>{const a=ACHIEVEMENTS.find(x=>x.id===id);return a?<span key={id}>{a.icon}</span>:null;})}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="tabs">
              {[["chores","🧹 Chores"],["calendar","📅 Schedule"],["checklist","✅ Daily"],["wallet","💰 Distribute"],["banks","🏦 Banks"],["history","📋 History"],["badges","🏅 Badges"]].map(([t,l])=>(
                <button key={t} className={`tab ${childTab===t?"active":""}`} onClick={()=>setChildTab(t)}>{l}</button>
              ))}
            </div>

            {/* CHORES */}
            {childTab==="chores"&&(
              <>
                <div className="section-title">🧹 Available Chores</div>
                {myChores.length===0&&<div className="empty"><div className="empty-icon">🎉</div><div className="empty-text">No chores yet!</div></div>}
                <div className="card-grid">
                  {myChores.map(chore=>{
                    const pend=data.choreRequests.find(r=>r.childId===child.id&&r.choreId===chore.id&&r.status==="pending");
                    return(
                      <div key={chore.id} className="chore-card">
                        <div style={{fontSize:"2rem"}}>{chore.icon}</div>
                        <div style={{fontWeight:800}}>{chore.title}</div>
                        <div style={{color:"var(--amber)",fontWeight:800,fontSize:".85rem"}}>⭐ {pts(chore.points)}</div>
                        <div style={{color:"var(--green)",fontWeight:800,fontSize:".85rem"}}>{money(chore.points,rate,currency)}</div>
                        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                          {chore.requiresPhoto&&<span className="tag tag-photo">📸 Photo</span>}
                          <span className={`tag ${chore.recurring?"tag-recurring":"tag-oneoff"}`}>{chore.recurring?"🔄":"🎯"}</span>
                        </div>
                        {pend?<button className="btn btn-ghost btn-sm" disabled style={{opacity:.6}}>⏳ Pending</button>
                             :<button className="btn btn-blue btn-sm" onClick={()=>handleClaimChore(chore)}>Claim Chore</button>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* CALENDAR */}
            {childTab==="calendar"&&(
              <CalendarView data={data} doUpdate={doUpdate} isParent={false} activeChildId={child.id}/>
            )}

            {/* DAILY CHECKLIST */}
            {childTab==="checklist"&&(()=>{
              const today = todayISO();
              const items = (data.checklistItems||[]).filter(x=>x.scope==="all"||x.scope===child.id);
              const getLog = itemId => data.checklistLog?.[today]?.[child.id]?.[itemId]||false;
              const doneCount = items.filter(x=>getLog(x.id)).length;
              const pct = items.length ? Math.round((doneCount/items.length)*100) : 0;
              const allDone = items.length > 0 && doneCount === items.length;

              const toggleItem = (itemId, val) => {
                doUpdate(d=>{
                  const log = d.checklistLog||{};
                  const dayLog = log[today]||{};
                  const childLog = dayLog[child.id]||{};
                  const wasChecked = childLog[itemId]||false;
                  const item = (d.checklistItems||[]).find(x=>x.id===itemId);
                  const pts2 = item?.points||0;
                  let newChildren = d.children;
                  let newTxs = d.transactions;
                  if (pts2>0) {
                    if (val&&!wasChecked) {
                      newChildren = d.children.map(c=>c.id===child.id?{...c,walletPoints:c.walletPoints+pts2}:c);
                      newTxs = [{id:uid(),childId:child.id,type:"earn",points:pts2,label:`✅ ${item.label}`,time:now()},...d.transactions];
                    } else if (!val&&wasChecked) {
                      newChildren = d.children.map(c=>c.id===child.id?{...c,walletPoints:Math.max(0,c.walletPoints-pts2)}:c);
                    }
                  }
                  return {...d,children:newChildren,transactions:newTxs,
                    checklistLog:{...log,[today]:{...dayLog,[child.id]:{...childLog,[itemId]:val}}}};
                });
              };

              return(
                <>
                  <div className="section-title">✅ Daily Checklist</div>

                  {/* Progress header */}
                  <div style={{background:allDone?"linear-gradient(135deg,#10b981,#059669)":"white",borderRadius:16,padding:18,boxShadow:"var(--shadow)",marginBottom:16,color:allDone?"white":"var(--dark)",transition:"all .3s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:"1rem"}}>{allDone?"🌟 All done today!":"Today's Essentials"}</div>
                        <div style={{fontSize:".82rem",opacity:.85,fontWeight:600,marginTop:2}}>
                          {new Date().toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long"})}
                        </div>
                      </div>
                      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"2rem",lineHeight:1}}>{doneCount}/{items.length}</div>
                    </div>
                    <div style={{height:10,background:allDone?"rgba(255,255,255,.3)":"#e2e8f0",borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",background:allDone?"white":"var(--green)",borderRadius:99,width:`${pct}%`,transition:"width .4s"}}/>
                    </div>
                    {allDone&&<div style={{marginTop:10,fontSize:".85rem",fontWeight:700,opacity:.9}}>Amazing work {child.name}! Keep it up 💪</div>}
                  </div>

                  {items.length===0&&(
                    <div className="empty">
                      <div className="empty-icon">✅</div>
                      <div className="empty-text">No checklist items yet</div>
                      <div className="empty-sub">Ask a parent to add your daily essentials!</div>
                    </div>
                  )}

                  {/* Checklist items */}
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {items.map(item=>{
                      const done = getLog(item.id);
                      return(
                        <div key={item.id}
                          onClick={()=>toggleItem(item.id,!done)}
                          style={{
                            display:"flex",alignItems:"center",gap:14,padding:"14px 16px",
                            background:"white",borderRadius:14,boxShadow:done?"none":"var(--shadow)",
                            border:`2px solid ${done?"var(--green)":"#e2e8f0"}`,
                            opacity:done?0.75:1,cursor:"pointer",transition:"all .2s",
                            background:done?"var(--mint)":"white"
                          }}>
                          <div style={{fontSize:"1.8rem"}}>{item.icon}</div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:".95rem",textDecoration:done?"line-through":"none",color:done?"var(--mid)":"var(--dark)"}}>{item.label}</div>
                            {item.points>0&&<div style={{fontSize:".75rem",color:"var(--amber)",fontWeight:800,marginTop:2}}>+{item.points} pts on completion</div>}
                          </div>
                          <div style={{width:32,height:32,borderRadius:"50%",border:`2px solid ${done?"var(--green)":"#e2e8f0"}`,background:done?"var(--green)":"white",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:900,fontSize:"1rem",flexShrink:0,transition:"all .2s"}}>
                            {done?"✓":""}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {items.length>0&&!allDone&&(
                    <div style={{textAlign:"center",marginTop:16,fontSize:".85rem",color:"var(--mid)",fontWeight:600}}>
                      {items.length-doneCount} item{items.length-doneCount!==1?"s":""} left — you can do it! 💪
                    </div>
                  )}
                </>
              );
            })()}

            {/* DISTRIBUTE */}
            {childTab==="wallet"&&(
              <>
                <div className="section-title">💰 Distribute Points</div>
                {myBanks.length===0&&<div className="empty"><div className="empty-icon">🏦</div><div className="empty-text">No banks yet</div><div className="empty-sub">Ask a parent to set up savings banks!</div></div>}
                {myBanks.map(bank=>{
                  const pct=Math.min(100,(bank.savedPoints/bank.costPoints)*100);
                  return(
                    <div key={bank.id} className="distribute-row">
                      <div style={{fontSize:"1.7rem"}}>{bank.icon}</div>
                      <div className="distribute-info">
                        <div style={{fontWeight:800}}>{bank.name}</div>
                        <div style={{fontSize:".78rem",color:"var(--mid)",fontWeight:600}}>{bank.savedPoints}/{bank.costPoints} pts · {money(bank.savedPoints,rate,currency)} / {money(bank.costPoints,rate,currency)}</div>
                        <div className="bank-progress" style={{marginTop:4}}><div className="bank-progress-fill" style={{width:`${pct}%`}}/></div>
                      </div>
                      <input className="distribute-input" type="number" min="0" placeholder="0" value={distAmts[bank.id]||""} onChange={e=>setDistAmts(a=>({...a,[bank.id]:e.target.value}))}/>
                    </div>
                  );
                })}
                {myBanks.length>0&&(
                  <div style={{marginTop:14}}>
                    <div style={{marginBottom:10,fontWeight:700,color:"var(--mid)"}}>
                      Moving: {Object.values(distAmts).reduce((a,b)=>a+(+b||0),0)} pts · Wallet after: {child.walletPoints-Object.values(distAmts).reduce((a,b)=>a+(+b||0),0)} pts
                    </div>
                    <button className="btn btn-purple btn-lg" onClick={handleDistribute}>💸 Distribute Points</button>
                  </div>
                )}
              </>
            )}

            {/* BANKS */}
            {childTab==="banks"&&(
              <>
                <div className="section-title">🏦 My Banks</div>
                {myBanks.length===0&&<div className="empty"><div className="empty-icon">🏦</div><div className="empty-text">No banks yet</div></div>}
                <div className="card-grid">
                  {myBanks.map(bank=>{
                    const pct=Math.min(100,(bank.savedPoints/bank.costPoints)*100);
                    // tally: total redeemed from this specific bank
                    const redeemTxs=data.transactions.filter(t=>t.childId===child.id&&t.type==="redeem"&&t.bankId===bank.id);
                    const totalSpentPts=redeemTxs.reduce((a,t)=>a+Math.abs(t.points),0);
                    const redeemCount=redeemTxs.length;
                    // inspiration: find best goal bank for comparison
                    const goalBanks=myBanks.filter(b=>b.type==="goal"&&b.id!==bank.id);
                    const inspBank=goalBanks[0]||null;
                    const inspPct=inspBank?Math.min(100,Math.round((totalSpentPts/inspBank.costPoints)*100)):0;
                    return(
                      <div key={bank.id} className="bank-card">
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <div style={{fontSize:"1.8rem"}}>{bank.icon}</div>
                          <span className={`tag ${bank.type==="recurring"?"tag-recurring":"tag-oneoff"}`}>{bank.type==="recurring"?"🔄":"🎯"}</span>
                        </div>
                        <div style={{fontWeight:800}}>{bank.name}</div>
                        <div style={{fontSize:".78rem",color:"var(--mid)",fontWeight:600}}>🎁 {bank.reward}</div>
                        <div className="bank-progress"><div className="bank-progress-fill" style={{width:`${pct}%`}}/></div>
                        <div className="flex-between">
                          <div style={{fontWeight:800,color:"var(--green)",fontSize:".9rem"}}>{bank.savedPoints}/{bank.costPoints} pts</div>
                          <div style={{fontSize:".78rem",color:"var(--mid)",fontWeight:600}}>{money(bank.savedPoints,rate,currency)} / {money(bank.costPoints,rate,currency)}</div>
                        </div>
                        {/* Tally for recurring banks */}
                        {bank.type==="recurring"&&redeemCount>0&&(
                          <div style={{background:"#fef3c7",borderRadius:10,padding:"8px 10px",marginTop:2}}>
                            <div style={{fontWeight:800,fontSize:".78rem",color:"#92400e"}}>
                              💸 Total spent on {bank.name}
                            </div>
                            <div style={{fontWeight:800,fontSize:".92rem",color:"#b45309",marginTop:2}}>
                              {totalSpentPts} pts · {money(totalSpentPts,rate,currency)} · {redeemCount}x redeemed
                            </div>
                            {inspBank&&(
                              <div style={{marginTop:6,fontSize:".75rem",color:"#78350f",fontWeight:700,lineHeight:1.4}}>
                                💡 If you'd saved this instead, you'd be <span style={{color:"var(--green)"}}>{inspPct}%</span> of the way to your <strong>{inspBank.name}</strong> goal {inspBank.icon}
                              </div>
                            )}
                            {!inspBank&&totalSpentPts>0&&(
                              <div style={{marginTop:6,fontSize:".75rem",color:"#78350f",fontWeight:700,lineHeight:1.4}}>
                                💡 That's {money(totalSpentPts,rate,currency)} — ask a parent to set up a savings goal so you can see what you could have instead!
                              </div>
                            )}
                          </div>
                        )}
                        {bank.savedPoints>=bank.costPoints&&<button className="btn btn-green btn-sm" onClick={()=>setRedeemNudge(bank.id)}>🎉 Redeem!</button>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* HISTORY */}
            {childTab==="history"&&(()=>{
              const allTxs = data.transactions.filter(t=>t.childId===child.id);
              const earnPts  = allTxs.filter(t=>t.type==="earn" ||t.type==="bonus").reduce((a,t)=>a+t.points,0);
              const spendPts = allTxs.filter(t=>t.type==="redeem").reduce((a,t)=>a+Math.abs(t.points),0);
              const savePts  = allTxs.filter(t=>t.type==="save").reduce((a,t)=>a+Math.abs(t.points),0);
              const giftPts2 = allTxs.filter(t=>t.type==="gift").reduce((a,t)=>a+t.points,0);
              const grandTotal = earnPts + giftPts2;
              const isEmpty = allTxs.length===0 && myHistory.length===0;
              return (
                <>
                  <div className="section-title">📋 History</div>

                  {/* Spending summary card */}
                  {grandTotal>0&&(
                    <div style={{background:"white",borderRadius:16,padding:18,boxShadow:"var(--shadow)",marginBottom:16}}>
                      <div style={{fontWeight:800,marginBottom:12,fontSize:".95rem"}}>💰 Money Summary</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                        {[
                          {label:"Total Earned",val:earnPts,col:"var(--green)",icon:"⭐"},
                          {label:"Gifts Received",val:giftPts2,col:"var(--amber)",icon:"🎁"},
                          {label:"Spent on Rewards",val:spendPts,col:"var(--purple)",icon:"🎉"},
                          {label:"Moved to Banks",val:savePts,col:"var(--blue)",icon:"🏦"},
                        ].map(({label,val,col,icon})=>(
                          <div key={label} style={{background:"#f8fafc",borderRadius:12,padding:"10px 12px"}}>
                            <div style={{fontSize:".72rem",color:"var(--mid)",fontWeight:700,marginBottom:3}}>{icon} {label}</div>
                            <div style={{fontWeight:900,color:col,fontSize:"1rem"}}>{money(val,rate,currency)}</div>
                            <div style={{fontSize:".72rem",color:"var(--mid)",fontWeight:600}}>{pts(val)}</div>
                          </div>
                        ))}
                      </div>
                      {/* Bar showing earn vs spend ratio */}
                      {spendPts>0&&grandTotal>0&&(
                        <div>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:".75rem",fontWeight:700,color:"var(--mid)",marginBottom:4}}>
                            <span>Saved / banked</span><span>Spent on rewards</span>
                          </div>
                          <div style={{height:10,background:"#e2e8f0",borderRadius:99,overflow:"hidden",display:"flex"}}>
                            <div style={{width:`${Math.round(((grandTotal-spendPts)/grandTotal)*100)}%`,background:"var(--green)",borderRadius:"99px 0 0 99px",transition:"width .4s"}}/>
                            <div style={{flex:1,background:"var(--purple)",borderRadius:"0 99px 99px 0"}}/>
                          </div>
                          <div style={{fontSize:".72rem",color:"var(--mid)",fontWeight:600,marginTop:4,textAlign:"center"}}>
                            {Math.round(((grandTotal-spendPts)/grandTotal)*100)}% saved · {Math.round((spendPts/grandTotal)*100)}% spent on rewards
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isEmpty&&<div className="empty"><div className="empty-icon">📋</div><div className="empty-text">No history yet</div><div className="empty-sub">Complete some chores to get started!</div></div>}

                  {/* Bonus transactions */}
                  {allTxs.filter(t=>t.type==="bonus").map(t=>(
                    <div key={t.id} className="request-card" style={{borderLeftColor:"var(--amber)"}}>
                      <div style={{fontSize:"1.8rem"}}>⭐</div>
                      <div className="request-info">
                        <div style={{fontWeight:800}}>{t.label}</div>
                        <div style={{fontSize:".72rem",color:"var(--mid)"}}>{t.time}</div>
                        <span className="tag" style={{background:"var(--yellow)",color:"#92400e",marginTop:3,display:"inline-block"}}>Bonus</span>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontWeight:800,color:"var(--amber)"}}>+{pts(t.points)}</div>
                        <div style={{fontSize:".75rem",color:"var(--green)",fontWeight:700}}>{money(t.points,rate,currency)}</div>
                      </div>
                    </div>
                  ))}
                  {/* Gifts */}
                  {allTxs.filter(t=>t.type==="gift").map(t=>(
                    <div key={t.id} className="request-card approved">
                      <div style={{fontSize:"1.8rem"}}>🎁</div>
                      <div className="request-info"><div style={{fontWeight:800}}>{t.label}</div><div style={{fontSize:".72rem",color:"var(--mid)"}}>{t.time}</div></div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontWeight:800,color:"var(--green)"}}>+{pts(t.points)}</div>
                        <div style={{fontSize:".75rem",color:"var(--green)",fontWeight:700}}>{money(t.points,rate,currency)}</div>
                      </div>
                    </div>
                  ))}
                  {/* Redemptions */}
                  {allTxs.filter(t=>t.type==="redeem").map(t=>(
                    <div key={t.id} className="request-card" style={{borderLeftColor:"var(--purple)"}}>
                      <div style={{fontSize:"1.8rem"}}>{t.bankIcon||"🎉"}</div>
                      <div className="request-info">
                        <div style={{fontWeight:800}}>{t.label}</div>
                        <div style={{fontSize:".72rem",color:"var(--mid)"}}>{t.time}</div>
                        <span className="tag" style={{background:"var(--lavender)",color:"var(--purple)",marginTop:3,display:"inline-block"}}>Redeemed</span>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontWeight:800,color:"var(--purple)"}}>-{pts(Math.abs(t.points))}</div>
                        <div style={{fontSize:".75rem",color:"var(--purple)",fontWeight:700}}>{money(Math.abs(t.points),rate,currency)}</div>
                      </div>
                    </div>
                  ))}
                  {/* Chore requests */}
                  {myHistory.map(req=>{
                    const chore=data.chores.find(c=>c.id===req.choreId);
                    return(
                      <div key={req.id} className={`request-card ${req.status}`}>
                        <div style={{fontSize:"1.8rem"}}>{chore?.icon||"📋"}</div>
                        <div className="request-info">
                          <div style={{fontWeight:800}}>{chore?.title||"Chore"}</div>
                          <div style={{fontSize:".72rem",color:"var(--mid)"}}>{req.time}</div>
                          {req.note&&<div style={{fontSize:".75rem",fontWeight:700,marginTop:3,color:req.status==="rejected"?"var(--red)":"var(--green)"}}>
                            💬 {req.note}
                          </div>}
                          {req.bonusPts>0&&<div style={{fontSize:".75rem",color:"var(--amber)",fontWeight:800}}>+{pts(req.bonusPts)} bonus!</div>}
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontWeight:800,color:"var(--amber)"}}>+{pts(chore?.points||0)}</div>
                          <div style={{fontSize:".75rem",color:"var(--green)",fontWeight:700}}>{money(chore?.points||0,rate,currency)}</div>
                          <span className={`status status-${req.status}`}>{req.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}

            {/* BADGES */}
            {childTab==="badges"&&(()=>{
              const unlocked = child.achievements||[];
              const streak = calcStreak(data, child.id);
              const earnTxs = data.transactions.filter(t=>t.childId===child.id);
              return(
                <>
                  <div className="section-title">🏅 Achievements</div>

                  {/* Streak card */}
                  <div style={{background:streak>0?"linear-gradient(135deg,#f97316,#ef4444)":"white",borderRadius:16,padding:18,boxShadow:"var(--shadow)",marginBottom:16,color:streak>0?"white":"var(--dark)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <div style={{fontSize:"2.8rem"}}>🔥</div>
                      <div>
                        <div style={{fontWeight:900,fontSize:"1.6rem",fontFamily:"'Fredoka One',cursive"}}>
                          {streak} {streak===1?"day":"days"}
                        </div>
                        <div style={{fontWeight:700,fontSize:".88rem",opacity:.9}}>
                          {streak===0?"No streak yet — complete a chore today to start one!":
                           streak<3?"Keep going! Reach 3 days for your first streak badge.":
                           streak<7?"Amazing! Keep it up for the Week Warrior badge 🗓️":
                           "Incredible streak! You are on fire! 🔥"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badge grid */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
                    {ACHIEVEMENTS.map(a=>{
                      const earned = unlocked.includes(a.id);
                      return(
                        <div key={a.id} style={{
                          background:earned?"white":"#f8fafc",
                          borderRadius:14,padding:"14px 12px",
                          boxShadow:earned?"var(--shadow)":"none",
                          border:earned?"2px solid var(--green)":"2px solid #e2e8f0",
                          textAlign:"center",
                          opacity:earned?1:0.55,
                          transition:"all .2s"
                        }}>
                          <div style={{fontSize:"2rem",marginBottom:6,filter:earned?"none":"grayscale(100%)"}}>{a.icon}</div>
                          <div style={{fontWeight:800,fontSize:".85rem",color:earned?"var(--dark)":"var(--mid)"}}>{a.label}</div>
                          <div style={{fontSize:".72rem",color:"var(--mid)",fontWeight:600,marginTop:3,lineHeight:1.4}}>{a.desc}</div>
                          {earned&&<div style={{marginTop:6,fontSize:".72rem",fontWeight:800,color:"var(--green)"}}>✓ Unlocked!</div>}
                        </div>
                      );
                    })}
                  </div>

                  {unlocked.length===0&&(
                    <div style={{textAlign:"center",marginTop:16,color:"var(--mid)",fontWeight:600,fontSize:".9rem"}}>
                      Complete chores to unlock your first badge! ⭐
                    </div>
                  )}
                  <div style={{marginTop:12,textAlign:"center",fontSize:".82rem",color:"var(--mid)",fontWeight:600}}>
                    {unlocked.length} of {ACHIEVEMENTS.length} badges unlocked
                  </div>
                </>
              );
            })()}

          </div>
        </div>

        {modal==="claimChore"&&claimChore&&(
          <div className="modal-overlay"><div className="modal">
            <div style={{fontSize:"2.8rem",textAlign:"center",marginBottom:10}}>{claimChore.icon}</div>
            <div className="modal-title" style={{textAlign:"center"}}>{claimChore.title}</div>
            <div style={{textAlign:"center",marginBottom:18}}>
              <span className="val-badge">⭐ {pts(claimChore.points)} · {money(claimChore.points,rate,currency)}</span>
            </div>
            {claimChore.requiresPhoto&&(
              <div className="form-group">
                <label className="form-label">📸 Photo Required</label>
                <label className="photo-upload">
                  {claimPhoto?<img src={claimPhoto} alt="" className="photo-preview"/>:<div><div style={{fontSize:"2rem"}}>📷</div><div style={{fontWeight:700,marginTop:8}}>Tap to upload photo</div></div>}
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={photoInput}/>
                </label>
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-blue" style={{flex:1}} onClick={handleSubmitClaim} disabled={claimChore.requiresPhoto&&!claimPhoto}>✅ Submit for Approval</button>
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
            </div>
          </div></div>
        )}

        {/* Redemption nudge modal */}
        {redeemNudge&&(()=>{
          const bank=data.banks.find(b=>b.id===redeemNudge);
          if(!bank)return null;
          const redeemTxs=data.transactions.filter(t=>t.childId===child.id&&t.type==="redeem"&&t.bankId===bank.id);
          const totalSpentPts=redeemTxs.reduce((a,t)=>a+Math.abs(t.points),0);
          // after this redeem it would be totalSpentPts + bank.costPoints
          const afterRedeemTotal=totalSpentPts+bank.costPoints;
          const goalBanks=myBanks.filter(b=>b.type==="goal"&&b.id!==bank.id);
          const inspBank=goalBanks[0]||null;
          const inspPct=inspBank?Math.min(100,Math.round((afterRedeemTotal/inspBank.costPoints)*100)):0;
          return(
            <div className="modal-overlay"><div className="modal">
              <div style={{textAlign:"center",fontSize:"3rem",marginBottom:8}}>{bank.icon}</div>
              <div className="modal-title" style={{textAlign:"center"}}>Redeem {bank.name}?</div>

              {/* What they're spending now */}
              <div style={{background:"var(--lavender)",borderRadius:12,padding:14,marginBottom:12}}>
                <div style={{fontWeight:800,color:"var(--purple)",fontSize:".9rem",marginBottom:4}}>You're about to spend:</div>
                <div style={{fontWeight:900,fontSize:"1.2rem",color:"var(--purple)"}}>{pts(bank.costPoints)} · {money(bank.costPoints,rate,currency)}</div>
                <div style={{fontSize:".78rem",color:"var(--mid)",fontWeight:600,marginTop:4}}>for: {bank.reward}</div>
              </div>

              {/* Running tally */}
              {bank.type==="recurring"&&(
                <div style={{background:"#fef3c7",borderRadius:12,padding:14,marginBottom:12}}>
                  <div style={{fontWeight:800,color:"#92400e",fontSize:".85rem",marginBottom:4}}>
                    💸 Your {bank.name} tab so far
                  </div>
                  <div style={{fontWeight:900,fontSize:"1.1rem",color:"#b45309"}}>
                    {totalSpentPts>0?`${totalSpentPts} pts · ${money(totalSpentPts,rate,currency)} spent (${redeemTxs.length}x)`:"This will be your first time!"}
                  </div>
                  {totalSpentPts>0&&(
                    <div style={{fontWeight:800,fontSize:".82rem",color:"#92400e",marginTop:4}}>
                      After this redeem: {afterRedeemTotal} pts · {money(afterRedeemTotal,rate,currency)} total
                    </div>
                  )}
                </div>
              )}

              {/* Inspiration comparison */}
              {inspBank&&(
                <div style={{background:"var(--mint)",borderRadius:12,padding:14,marginBottom:16,border:"2px solid var(--green)"}}>
                  <div style={{fontWeight:800,color:"var(--green)",fontSize:".85rem",marginBottom:6}}>💡 Did you know?</div>
                  <div style={{fontWeight:700,fontSize:".82rem",color:"#065f46",lineHeight:1.5}}>
                    If you saved this {money(bank.costPoints,rate,currency)} instead, you'd be{" "}
                    <strong style={{fontSize:"1rem",color:"var(--green)"}}>{inspPct}%</strong>{" "}
                    of the way to your <strong>{inspBank.name}</strong> goal {inspBank.icon}
                  </div>
                  <div style={{marginTop:8}}>
                    <div style={{height:8,background:"#e2e8f0",borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:99,background:"var(--green)",width:`${inspPct}%`,transition:"width .4s"}}/>
                    </div>
                    <div style={{fontSize:".75rem",color:"var(--mid)",fontWeight:600,marginTop:4}}>
                      {inspBank.costPoints-Math.min(inspBank.costPoints,afterRedeemTotal)} pts ({money(Math.max(0,inspBank.costPoints-afterRedeemTotal),rate,currency)}) still needed
                    </div>
                  </div>
                </div>
              )}

              <div style={{display:"flex",gap:8}}>
                <button className="btn btn-green" style={{flex:1}} onClick={()=>handleRedeemBank(bank.id)}>🎉 Yes, Redeem!</button>
                <button className="btn btn-ghost" onClick={()=>setRedeemNudge(null)}>Save Instead</button>
              </div>
            </div></div>
          );
        })()}
      </>
    );
  }

  // ══ PARENT ════════════════════════════════════════════════════════════════════
  if(screen==="parent"){
    const allPending=data.choreRequests.filter(r=>r.status==="pending");
    return(
      <>
        <style>{styles}</style>
        <div className="app">
          <nav className="nav">
            <div className="nav-logo"><Av photo={activeUser.photo} emoji={activeUser.avatar||"👤"} size={30}/>{activeUser.name}</div>
            <div className="nav-right">
              {allPending.length>0&&<span className="notif-dot">{allPending.length}</span>}
              <button className="nav-btn ghost" onClick={()=>setScreen("home")}>← Switch</button>
            </div>
          </nav>
          <div className="main">
            <div className="tabs">
              {[
                ["approvals",`✅ Approvals${allPending.length>0?` (${allPending.length})`:""}`],
                ["calendar","📅 Calendar"],
                ["chores","🧹 Chores"],
                ["banks","🏦 Banks"],
                ["children","👦 Children"],
                ["checklist","✅ Checklist"],
                ["settings","⚙️ Settings"],
                ["help","❓ Help"],
              ].map(([t,l])=><button key={t} className={`tab ${parentTab===t?"active":""}`} onClick={()=>setParentTab(t)} style={{fontSize:".74rem"}}>{l}</button>)}
            </div>

            {/* APPROVALS */}
            {parentTab==="approvals"&&(
              <>
                <div className="section-title">✅ Pending Approvals</div>
                {allPending.length===0&&<div className="empty"><div className="empty-icon">🎉</div><div className="empty-text">All caught up!</div></div>}
                {allPending.map(req=>{const child=data.children.find(c=>c.id===req.childId);const chore=data.chores.find(c=>c.id===req.choreId);return<ApprovalCard key={req.id} req={req} child={child} chore={chore} rate={rate} currency={currency} onReview={()=>setApprovalModal({reqId:req.id})} readOnly={false}/>;  })}
                {data.choreRequests.filter(r=>r.status!=="pending").length>0&&(<>
                  <div className="divider"/><div className="section-title">📋 Recent History</div>
                  {data.choreRequests.filter(r=>r.status!=="pending").slice(0,10).map(req=>{const child=data.children.find(c=>c.id===req.childId);const chore=data.chores.find(c=>c.id===req.choreId);return<ApprovalCard key={req.id} req={req} child={child} chore={chore} rate={rate} currency={currency} readOnly={true}/>;  })}
                </>)}
              </>
            )}

            {/* CALENDAR */}
            {parentTab==="calendar"&&(
              <>
                <div className="section-title">📅 Fortnight Calendar</div>
                <CalendarView data={data} doUpdate={doUpdate} isParent={true}/>
              </>
            )}

            {/* CHORES */}
            {parentTab==="chores"&&(
              <>
                <div className="flex-between" style={{marginBottom:14}}>
                  <div className="section-title" style={{marginBottom:0}}>🧹 Manage Chores</div>
                  <button className="btn btn-blue btn-sm" onClick={()=>setModal("addChore")}>+ Add Chore</button>
                </div>
                {data.chores.length===0&&<div className="empty"><div className="empty-icon">🧹</div><div className="empty-text">No chores yet</div></div>}
                <div className="card-grid">
                  {data.chores.map(chore=>(
                    <div key={chore.id} className="chore-card">
                      <div style={{fontSize:"2rem"}}>{chore.icon}</div>
                      <div style={{fontWeight:800}}>{chore.title}</div>
                      <div style={{color:"var(--amber)",fontWeight:800,fontSize:".85rem"}}>⭐ {pts(chore.points)}</div>
                      <div style={{color:"var(--green)",fontWeight:700,fontSize:".82rem"}}>{money(chore.points,rate,currency)} value</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {chore.requiresPhoto&&<span className="tag tag-photo">📸 Photo</span>}
                        <span className={`tag ${chore.recurring?"tag-recurring":"tag-oneoff"}`}>{chore.recurring?"🔄":"🎯"}</span>
                      </div>
                      <button className="btn btn-red btn-sm" onClick={()=>doUpdate(d=>({...d,chores:d.chores.filter(c=>c.id!==chore.id)}))}>🗑 Remove</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* BANKS */}
            {parentTab==="banks"&&(
              <>
                <div className="child-selector">
                  {data.children.map(child=>(
                    <div key={child.id} className={`child-pill ${selChild===child.id?"active":""}`} onClick={()=>setSelChild(child.id)}>
                      <Av photo={child.photo} emoji={child.avatar} size={22}/>{child.name}
                    </div>
                  ))}
                </div>
                {selChild&&(<>
                  <div className="flex-between" style={{marginBottom:14}}>
                    <div className="section-title" style={{marginBottom:0}}>🏦 {data.children.find(c=>c.id===selChild)?.name}'s Banks</div>
                    <button className="btn btn-purple btn-sm" onClick={()=>setModal("addBank")}>+ Add Bank</button>
                  </div>
                  {childBanks.length===0&&<div className="empty"><div className="empty-icon">🏦</div><div className="empty-text">No banks yet</div></div>}
                  <div className="card-grid">
                    {childBanks.map(bank=>{
                      const pct=Math.min(100,(bank.savedPoints/bank.costPoints)*100);
                      return(
                        <div key={bank.id} className="bank-card">
                          <div style={{display:"flex",justifyContent:"space-between"}}>
                            <div style={{fontSize:"1.8rem"}}>{bank.icon}</div>
                            <span className={`tag ${bank.type==="recurring"?"tag-recurring":"tag-oneoff"}`}>{bank.type==="recurring"?"🔄":"🎯"}</span>
                          </div>
                          <div style={{fontWeight:800}}>{bank.name}</div>
                          <div style={{fontSize:".78rem",color:"var(--mid)",fontWeight:600}}>🎁 {bank.reward}</div>
                          <div className="bank-progress"><div className="bank-progress-fill" style={{width:`${pct}%`}}/></div>
                          <div className="flex-between">
                            <div style={{fontWeight:800,color:"var(--green)",fontSize:".88rem"}}>{bank.savedPoints}/{bank.costPoints} pts</div>
                            <div style={{fontSize:".78rem",color:"var(--mid)",fontWeight:600}}>{money(bank.costPoints,rate,currency)}</div>
                          </div>
                          <button className="btn btn-red btn-sm" onClick={()=>doUpdate(d=>({...d,banks:d.banks.filter(b=>b.id!==bank.id)}))}>🗑 Remove</button>
                        </div>
                      );
                    })}
                  </div>
                </>)}
              </>
            )}

            {/* CHILDREN */}
            {parentTab==="children"&&(
              <>
                <div className="flex-between" style={{marginBottom:14}}>
                  <div className="section-title" style={{marginBottom:0}}>👦 Children</div>
                  <button className="btn btn-green btn-sm" onClick={()=>setModal("addChild")}>+ Add Child</button>
                </div>
                {data.children.map(child=>{
                  const earned=data.transactions.filter(t=>t.childId===child.id&&t.type==="earn").reduce((a,t)=>a+t.points,0);
                  return(
                    <div key={child.id} className="card">
                      <div className="flex-between">
                        <div style={{display:"flex",gap:12,alignItems:"center"}}>
                          <Av photo={child.photo} emoji={child.avatar} size={50}/>
                          <div>
                            <div style={{fontWeight:800,fontSize:"1.05rem"}}>{child.name}</div>
                            <div style={{color:"var(--mid)",fontSize:".82rem",fontWeight:600}}>Wallet: {child.walletPoints} pts · {money(child.walletPoints,rate,currency)}</div>
                            <div style={{color:"var(--mid)",fontSize:".78rem",fontWeight:600}}>Earned total: {earned} pts · {money(earned,rate,currency)}</div>
                            <div style={{fontSize:".78rem",marginTop:2}}>{child.pin?<span style={{color:"var(--green)",fontWeight:700}}>🔒 PIN active</span>:<span style={{color:"var(--mid)",fontWeight:600}}>No PIN</span>}</div>
                          </div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
                          <button className="btn btn-amber btn-sm" onClick={()=>{setGiftChild(child.id);setGiftPts("");setGiftNote("");}}>🎁 Gift</button>
                          <button className="btn btn-red btn-sm" onClick={()=>doUpdate(d=>({...d,children:d.children.filter(c=>c.id!==child.id)}))}>Remove</button>
                        </div>
                      </div>
                      <EditChildInline child={child} onSave={upd=>doUpdate(d=>({...d,children:d.children.map(c=>c.id===child.id?{...c,...upd}:c)}))}/>
                      <MilestoneRewards
                        childId={child.id}
                        milestoneRewards={data.milestoneRewards||{}}
                        onSave={(childId,vals)=>doUpdate(d=>({...d,milestoneRewards:{...(d.milestoneRewards||{}),[childId]:vals}}))}
                      />
                    </div>
                  );
                })}
              </>
            )}

            {/* SETTINGS */}
            {parentTab==="settings"&&(
              <>
                {/* Point value editor */}
                <div className="section-title">💰 Currency & Point Value</div>
                <div className="card" style={{marginBottom:20}}>
                  {/* Currency selector */}
                  <div style={{fontWeight:800,marginBottom:8}}>Currency</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:6,marginBottom:16}}>
                    {CURRENCIES.map(cur=>(
                      <div key={cur.code}
                        onClick={()=>doUpdate(d=>({...d,settings:{...d.settings,currency:cur.code}}))}
                        style={{
                          display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,cursor:"pointer",
                          border: currency===cur.code ? "2px solid var(--blue)" : "2px solid #e2e8f0",
                          background: currency===cur.code ? "var(--sky)" : "#f8fafc",
                          fontWeight:700,fontSize:".82rem"
                        }}>
                        <span style={{fontSize:"1.2rem"}}>{cur.flag}</span>
                        <div>
                          <div style={{fontWeight:800,color:currency===cur.code?"var(--blue)":"var(--dark)"}}>{cur.code}</div>
                          <div style={{fontSize:".7rem",color:"var(--mid)",fontWeight:600}}>{cur.symbol} · {cur.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="divider" style={{margin:"12px 0"}}/>

                  {/* Point value */}
                  <div style={{fontWeight:800,marginBottom:8}}>How much is 1 point worth?</div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontWeight:700,fontSize:"1.1rem"}}>{CURRENCIES.find(c=>c.code===currency)?.symbol||"$"}</span>
                    <input className="form-input" type="number" min="0.01" step="0.05" style={{width:120}}
                      value={rate}
                      onChange={e=>doUpdate(d=>({...d,settings:{...d.settings,pointValue:+e.target.value}}))}/>
                    <span style={{fontWeight:600,color:"var(--mid)"}}>per point</span>
                  </div>
                  <div style={{marginTop:10,fontSize:".85rem",color:"var(--mid)",fontWeight:600}}>
                    Currently: 1 point = <strong>{money(1,rate,currency)}</strong> · 10 points = <strong>{money(10,rate,currency)}</strong>
                  </div>
                  <div style={{marginTop:6,fontSize:".8rem",color:"var(--mid)"}}>
                    Tip: This is a great way to teach kids the real value of money. Start at 50¢ and adjust as they grow.
                  </div>
                </div>

                <div className="section-title">⚙️ Parent Accounts</div>
                <div className="flex-between" style={{marginBottom:14}}>
                  <span style={{fontWeight:700,color:"var(--mid)"}}>Manage parents</span>
                  <button className="btn btn-blue btn-sm" onClick={()=>setModal("addParent")}>+ Add Parent</button>
                </div>
                {data.parents.map(parent=>(
                  <div key={parent.id} className="card" style={{marginBottom:12}}>
                    <div className="flex-between">
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        <Av photo={parent.photo} emoji={parent.avatar||"👤"} size={50}/>
                        <div><div style={{fontWeight:800,fontSize:"1.05rem"}}>{parent.name}</div><div style={{color:"var(--mid)",fontSize:".82rem",fontWeight:600}}>PIN: ••••</div></div>
                      </div>
                      {data.parents.length>1&&<button className="btn btn-red btn-sm" onClick={()=>doUpdate(d=>({...d,parents:d.parents.filter(p=>p.id!==parent.id)}))}>Remove</button>}
                    </div>
                    <EditParentInline parent={parent} onSave={upd=>doUpdate(d=>({...d,parents:d.parents.map(p=>p.id===parent.id?{...p,name:upd.name,photo:upd.photo,avatar:upd.avatar,...(upd.pin?{pin:upd.pin}:{})}:p)}))}/>
                  </div>
                ))}
                <div className="divider"/>
                <div className="section-title">📊 Family Stats</div>
                <div className="stats-row">
                  <div className="stat-box"><div className="stat-val">{data.children.length}</div><div className="stat-label">Children</div></div>
                  <div className="stat-box"><div className="stat-val">{data.chores.length}</div><div className="stat-label">Chores</div></div>
                  <div className="stat-box"><div className="stat-val">{data.choreRequests.filter(r=>r.status==="approved").length}</div><div className="stat-label">Approved</div></div>
                </div>
              </>
            )}

            {/* HELP */}
            {parentTab==="checklist"&&(
              <ChecklistManager data={data} doUpdate={doUpdate} children={data.children} rate={rate} currency={currency}/>
            )}

            {parentTab==="help"&&<HelpTab />}
          </div>
        </div>

        {/* Modals */}
        {approvalModal&&(()=>{
          const req=data.choreRequests.find(r=>r.id===approvalModal.reqId);
          const child=data.children.find(c=>c.id===req?.childId);
          const chore=data.chores.find(c=>c.id===req?.choreId);
          return req ? <ApprovalModal req={req} child={child} chore={chore} rate={rate} currency={currency}
            onApprove={(bonus,note)=>handleApprove(req.id,bonus,note)}
            onReject={note=>handleReject(req.id,note)}
            onClose={()=>setApprovalModal(null)}/> : null;
        })()}
        {modal==="addChore"&&<AddChoreModal children={data.children} onSave={f=>{doUpdate(d=>({...d,chores:[...d.chores,{...f,id:uid()}]}));setModal(null);}} onClose={()=>setModal(null)}/>}
        {modal==="addBank"&&selChild&&<AddBankModal childId={selChild} onSave={b=>{doUpdate(d=>({...d,banks:[...d.banks,{...b,id:uid()}]}));setModal(null);}} onClose={()=>setModal(null)}/>}
        {modal==="addChild"&&<AddChildModal onSave={c=>{doUpdate(d=>({...d,children:[...d.children,{...c,id:uid()}]}));setModal(null);}} onClose={()=>setModal(null)}/>}
        {modal==="addParent"&&<AddParentModal onSave={p=>{doUpdate(d=>({...d,parents:[...d.parents,{...p,id:uid()}]}));setModal(null);}} onClose={()=>setModal(null)}/>}

        {/* Gift Modal */}
        {giftChild&&(()=>{
          const child=data.children.find(c=>c.id===giftChild);
          return(
            <div className="modal-overlay"><div className="modal">
              <div style={{textAlign:"center",marginBottom:12}}><Av photo={child?.photo} emoji={child?.avatar} size={64}/></div>
              <div className="modal-title" style={{textAlign:"center"}}>🎁 Gift Points to {child?.name}</div>
              <div style={{background:"var(--yellow)",borderRadius:12,padding:12,marginBottom:18,fontSize:".88rem",fontWeight:700,color:"#92400e"}}>
                1 point = {money(1,rate,currency)} · Wallet: {child?.walletPoints} pts ({money(child?.walletPoints||0,rate,currency)})
              </div>
              <div className="form-group">
                <label className="form-label">Points to Gift</label>
                <input className="form-input" type="number" min="1" placeholder="e.g. 10" value={giftPts} onChange={e=>setGiftPts(e.target.value)}/>
                {giftPts>0&&<div style={{fontSize:".82rem",color:"var(--green)",fontWeight:700,marginTop:5}}>= {money(+giftPts,rate,currency)} added to wallet</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Note (optional)</label>
                <input className="form-input" placeholder="e.g. Birthday bonus 🎂" value={giftNote} onChange={e=>setGiftNote(e.target.value)}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn btn-amber" style={{flex:1}} onClick={handleGift} disabled={!giftPts||+giftPts<=0}>🎁 Give Points!</button>
                <button className="btn btn-ghost" onClick={()=>setGiftChild(null)}>Cancel</button>
              </div>
            </div></div>
          );
        })()}
      </>
    );
  }
  return null;
}
