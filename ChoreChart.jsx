import { useState, useRef } from "react";

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "chorechart_data_v2";

const defaultData = {
  parents: [{ id: "p1", name: "Parent", pin: "1234", photo: null, avatar: "👤" }],
  children: [
    { id: "c1", name: "Alex", avatar: "🦊", photo: null, walletPoints: 0, pin: null },
    { id: "c2", name: "Sam",  avatar: "🐨", photo: null, walletPoints: 0, pin: null },
  ],
  chores: [
    { id: "ch1", title: "Wash Dishes",       points: 2, icon: "🍽️", requiresPhoto: false, assignedTo: "all", recurring: true },
    { id: "ch2", title: "Vacuum Living Room", points: 3, icon: "🧹", requiresPhoto: true,  assignedTo: "all", recurring: true },
    { id: "ch3", title: "Take Out Trash",     points: 2, icon: "🗑️", requiresPhoto: false, assignedTo: "all", recurring: true },
    { id: "ch4", title: "Clean Bedroom",      points: 4, icon: "🛏️", requiresPhoto: true,  assignedTo: "all", recurring: true },
  ],
  banks: [
    { id: "b1", childId: "c1", name: "Screen Time", icon: "📱", type: "recurring", costPoints: 5,  reward: "15 min screen time", savedPoints: 0 },
    { id: "b2", childId: "c1", name: "New Toy",      icon: "🎮", type: "goal",      costPoints: 20, reward: "LEGO Set",           savedPoints: 0 },
    { id: "b3", childId: "c2", name: "Screen Time",  icon: "📱", type: "recurring", costPoints: 5,  reward: "15 min screen time", savedPoints: 0 },
  ],
  choreRequests: [],
  transactions: [],
};

function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : defaultData; }
  catch { return defaultData; }
}
function saveData(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pts   = n => `${n} pt${n !== 1 ? "s" : ""}`;
const money = p => `$${(p * 0.5).toFixed(2)}`;
const uid   = () => Math.random().toString(36).slice(2, 10);
const now   = () => new Date().toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" });
const readFile = file => new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); });

// ─── Avatar component ─────────────────────────────────────────────────────────
function Av({ photo, emoji, size = 40 }) {
  if (photo) return <img src={photo} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block" }} />;
  return <span style={{ fontSize: size * 0.58, lineHeight: 1, display: "block", textAlign: "center" }}>{emoji || "👤"}</span>;
}

// ─── AvatarPicker ─────────────────────────────────────────────────────────────
function AvatarPicker({ photo, emoji, emojiList, onPhoto, onEmoji }) {
  const ref = useRef();
  return (
    <div className="form-group">
      <label className="form-label">Avatar — tap ring to upload a photo, or pick an emoji below</label>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 10 }}>
        <div onClick={() => ref.current.click()} style={{ width: 72, height: 72, borderRadius: "50%", border: "3px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", flexShrink: 0, background: "#f8fafc", position: "relative" }}>
          {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Av emoji={emoji} size={52} />}
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.4)", color: "white", fontSize: ".65rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", opacity: 0, transition: "opacity .2s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
            📷 Upload
          </div>
        </div>
        <div style={{ fontSize: ".8rem", color: "var(--mid)", fontWeight: 600 }}>Upload a photo<br/>or choose an emoji →</div>
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
          onChange={async e => { if (e.target.files[0]) { onPhoto(await readFile(e.target.files[0])); } }} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {emojiList.map(av => (
          <div key={av} onClick={() => { onEmoji(av); onPhoto(null); }}
            style={{ fontSize: "1.5rem", cursor: "pointer", padding: 6, borderRadius: 10,
              background: !photo && emoji === av ? "#dbeafe" : "#f1f5f9",
              border: !photo && emoji === av ? "2px solid #3b82f6" : "2px solid transparent" }}>
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
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --sky:#e0f2fe; --mint:#d1fae5; --peach:#ffe4cc; --lavender:#ede9fe; --yellow:#fef9c3;
    --blue:#3b82f6; --green:#10b981; --orange:#f97316; --purple:#8b5cf6; --amber:#f59e0b;
    --red:#ef4444; --dark:#1e293b; --mid:#64748b; --white:#ffffff;
    --radius:16px; --shadow:0 4px 24px rgba(0,0,0,.08); --shadow-lg:0 8px 40px rgba(0,0,0,.14);
  }
  body { font-family:'Nunito',sans-serif; background:var(--sky); color:var(--dark); min-height:100vh; }
  .app { min-height:100vh; display:flex; flex-direction:column; }

  .nav { background:var(--white); padding:12px 20px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 12px rgba(0,0,0,.06); position:sticky; top:0; z-index:100; }
  .nav-logo { font-family:'Fredoka One',cursive; font-size:1.35rem; color:var(--blue); display:flex; align-items:center; gap:10px; }
  .nav-right { display:flex; gap:10px; align-items:center; }
  .nav-badge { background:var(--sky); border-radius:20px; padding:6px 14px; font-weight:700; font-size:.85rem; color:var(--blue); }
  .nav-btn { background:var(--dark); color:white; border:none; border-radius:12px; padding:8px 16px; font-family:'Nunito',sans-serif; font-weight:700; font-size:.85rem; cursor:pointer; }
  .nav-btn.ghost { background:transparent; color:var(--mid); border:2px solid #e2e8f0; }

  .main { flex:1; padding:24px 20px; max-width:900px; margin:0 auto; width:100%; }
  .section-title { font-family:'Fredoka One',cursive; font-size:1.35rem; color:var(--dark); margin-bottom:16px; display:flex; align-items:center; gap:8px; }

  .card { background:var(--white); border-radius:var(--radius); padding:20px; box-shadow:var(--shadow); margin-bottom:16px; }
  .card-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:14px; margin-bottom:24px; }

  .chore-card { background:var(--white); border-radius:var(--radius); padding:18px; box-shadow:var(--shadow); display:flex; flex-direction:column; gap:10px; border:2px solid transparent; transition:all .2s; }
  .chore-card:hover { border-color:var(--blue); transform:translateY(-2px); }
  .chore-icon { font-size:2.2rem; }
  .chore-title { font-weight:800; }
  .chore-pts { color:var(--amber); font-weight:800; font-size:.9rem; }
  .chore-tags { display:flex; gap:6px; flex-wrap:wrap; }
  .tag { border-radius:20px; padding:3px 10px; font-size:.75rem; font-weight:700; }
  .tag-photo { background:var(--peach); color:var(--orange); }
  .tag-recurring { background:var(--mint); color:var(--green); }
  .tag-oneoff { background:var(--lavender); color:var(--purple); }

  .bank-card { background:var(--white); border-radius:var(--radius); padding:18px; box-shadow:var(--shadow); display:flex; flex-direction:column; gap:10px; }
  .bank-progress { height:8px; background:#e2e8f0; border-radius:99px; overflow:hidden; }
  .bank-progress-fill { height:100%; border-radius:99px; background:linear-gradient(90deg,var(--blue),var(--purple)); transition:width .4s; }
  .bank-name { font-weight:800; }
  .bank-reward { font-size:.8rem; color:var(--mid); font-weight:600; }
  .bank-saved { font-weight:800; color:var(--green); font-size:.9rem; }

  .request-card { background:var(--white); border-radius:var(--radius); padding:16px 20px; box-shadow:var(--shadow); display:flex; align-items:center; gap:14px; margin-bottom:12px; border-left:4px solid var(--amber); }
  .request-card.approved { border-left-color:var(--green); }
  .request-card.rejected { border-left-color:var(--red); }
  .request-info { flex:1; }
  .request-child { font-size:.8rem; color:var(--mid); font-weight:600; display:flex; align-items:center; gap:5px; }
  .request-chore { font-weight:800; }
  .request-time { font-size:.75rem; color:var(--mid); }

  .btn { border:none; border-radius:12px; padding:10px 18px; font-family:'Nunito',sans-serif; font-weight:800; font-size:.9rem; cursor:pointer; transition:all .2s; }
  .btn:hover { opacity:.88; transform:translateY(-1px); }
  .btn:active { transform:translateY(0); }
  .btn-blue   { background:var(--blue);   color:white; }
  .btn-green  { background:var(--green);  color:white; }
  .btn-red    { background:var(--red);    color:white; }
  .btn-purple { background:var(--purple); color:white; }
  .btn-amber  { background:var(--amber);  color:white; }
  .btn-ghost  { background:#f1f5f9; color:var(--dark); }
  .btn-sm  { padding:6px 12px; font-size:.8rem; border-radius:8px; }
  .btn-lg  { padding:14px 28px; font-size:1rem; border-radius:14px; width:100%; }

  .wallet-card { background:linear-gradient(135deg,#667eea,#764ba2); color:white; border-radius:20px; padding:28px; box-shadow:0 8px 32px rgba(102,126,234,.4); margin-bottom:24px; position:relative; overflow:hidden; }
  .wallet-card::before { content:''; position:absolute; top:-40px; right:-40px; width:140px; height:140px; border-radius:50%; background:rgba(255,255,255,.1); }
  .wallet-label { font-size:.85rem; opacity:.85; font-weight:600; text-transform:uppercase; letter-spacing:1px; }
  .wallet-pts { font-family:'Fredoka One',cursive; font-size:3rem; line-height:1; }
  .wallet-money { font-size:1.1rem; opacity:.85; font-weight:700; }

  .tabs { display:flex; gap:8px; margin-bottom:24px; background:white; padding:6px; border-radius:14px; box-shadow:var(--shadow); flex-wrap:wrap; }
  .tab { flex:1; padding:10px 6px; border:none; border-radius:10px; font-family:'Nunito',sans-serif; font-weight:700; font-size:.8rem; cursor:pointer; transition:all .2s; background:transparent; color:var(--mid); white-space:nowrap; }
  .tab.active { background:var(--blue); color:white; }

  .child-selector { display:flex; gap:10px; margin-bottom:24px; flex-wrap:wrap; }
  .child-pill { display:flex; align-items:center; gap:8px; padding:10px 18px; border-radius:99px; border:2px solid #e2e8f0; background:white; font-weight:700; cursor:pointer; transition:all .2s; font-family:'Nunito',sans-serif; font-size:.9rem; }
  .child-pill.active { border-color:var(--blue); background:var(--sky); color:var(--blue); }

  .screen-select { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:24px; background:linear-gradient(160deg,#e0f2fe 0%,#ede9fe 100%); padding:40px 20px; }
  .screen-select-title { font-family:'Fredoka One',cursive; font-size:2.4rem; color:var(--dark); text-align:center; }
  .screen-select-sub { color:var(--mid); font-weight:600; text-align:center; }
  .profile-cards { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; }
  .profile-card { background:white; border-radius:20px; padding:24px 20px; box-shadow:var(--shadow-lg); text-align:center; cursor:pointer; transition:all .25s; border:3px solid transparent; min-width:120px; display:flex; flex-direction:column; align-items:center; gap:8px; }
  .profile-card:hover { transform:translateY(-4px); border-color:var(--blue); }
  .profile-card .profile-name { font-weight:800; font-size:1rem; }
  .profile-card .profile-role { font-size:.78rem; color:var(--mid); font-weight:600; }
  .profile-card.parent-card { background:linear-gradient(135deg,#1e293b,#334155); color:white; }
  .profile-card.parent-card .profile-role { color:#94a3b8; }

  .pin-display { display:flex; gap:12px; justify-content:center; margin:20px 0; }
  .pin-dot { width:16px; height:16px; border-radius:50%; background:#e2e8f0; transition:background .2s; }
  .pin-dot.filled { background:var(--blue); }
  .pin-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; max-width:240px; margin:0 auto; }
  .pin-key { padding:18px; border:2px solid #e2e8f0; border-radius:14px; background:white; font-family:'Fredoka One',cursive; font-size:1.4rem; cursor:pointer; transition:all .15s; text-align:center; }
  .pin-key:hover { background:var(--sky); border-color:var(--blue); }
  .pin-key:active { transform:scale(.95); }
  .pin-error { color:var(--red); font-weight:700; text-align:center; font-size:.9rem; }

  .stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
  .stat-box { background:white; border-radius:14px; padding:16px; text-align:center; box-shadow:var(--shadow); }
  .stat-val { font-family:'Fredoka One',cursive; font-size:1.6rem; color:var(--blue); }
  .stat-label { font-size:.75rem; color:var(--mid); font-weight:700; text-transform:uppercase; letter-spacing:.5px; }

  .empty { text-align:center; padding:40px 20px; color:var(--mid); }
  .empty-icon { font-size:3rem; margin-bottom:12px; }
  .empty-text { font-weight:700; font-size:1rem; }
  .empty-sub { font-size:.85rem; margin-top:4px; }

  .status { display:inline-block; border-radius:20px; padding:3px 12px; font-size:.75rem; font-weight:800; }
  .status-pending  { background:var(--yellow); color:#92400e; }
  .status-approved { background:var(--mint);   color:#065f46; }
  .status-rejected { background:#fee2e2;        color:#991b1b; }

  .distribute-row { display:flex; align-items:center; gap:12px; padding:14px; background:#f8fafc; border-radius:12px; margin-bottom:10px; }
  .distribute-info { flex:1; }
  .distribute-input { width:80px; padding:8px 10px; border:2px solid #e2e8f0; border-radius:10px; font-family:'Nunito',sans-serif; font-weight:700; text-align:center; font-size:.95rem; outline:none; }
  .distribute-input:focus { border-color:var(--blue); }

  .photo-upload { border:2px dashed #e2e8f0; border-radius:14px; padding:24px; text-align:center; cursor:pointer; transition:border-color .2s; }
  .photo-upload:hover { border-color:var(--blue); }
  .photo-preview { max-width:100%; border-radius:10px; margin-top:10px; }

  .notif-dot { background:var(--red); color:white; border-radius:50%; width:20px; height:20px; font-size:.7rem; font-weight:900; display:inline-flex; align-items:center; justify-content:center; }

  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
  .modal { background:white; border-radius:20px; padding:28px; width:100%; max-width:480px; box-shadow:var(--shadow-lg); max-height:90vh; overflow-y:auto; }
  .modal-title { font-family:'Fredoka One',cursive; font-size:1.4rem; margin-bottom:20px; }

  .form-group { margin-bottom:16px; }
  .form-label { font-weight:700; font-size:.85rem; color:var(--mid); margin-bottom:6px; display:block; }
  .form-input { width:100%; padding:12px 14px; border:2px solid #e2e8f0; border-radius:12px; font-family:'Nunito',sans-serif; font-size:.95rem; font-weight:600; outline:none; transition:border-color .2s; color:var(--dark); }
  .form-input:focus { border-color:var(--blue); }
  .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .checkbox-label { display:flex; align-items:center; gap:10px; font-weight:700; cursor:pointer; }
  .checkbox-label input { width:18px; height:18px; cursor:pointer; }

  .divider { height:1px; background:#f1f5f9; margin:20px 0; }
  .flex-between { display:flex; justify-content:space-between; align-items:center; }
  .mb-0 { margin-bottom:0; }
  .text-mid { color:var(--mid); }
  .text-sm { font-size:.85rem; }
`;

// ─── PinModal (parent) ────────────────────────────────────────────────────────
function PinModal({ user, onSuccess, onCancel }) {
  const [pin, setPin] = useState(""); const [err, setErr] = useState(false);
  const press = k => {
    if (k === "del") { setPin(p => p.slice(0,-1)); setErr(false); return; }
    const n = pin + k; if (n.length > 4) return; setPin(n);
    if (n.length === 4) { if (n === user.pin) onSuccess(); else { setErr(true); setTimeout(() => { setPin(""); setErr(false); }, 600); } }
  };
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ textAlign:"center" }}>
        <div style={{ marginBottom:12 }}><Av photo={user.photo} emoji={user.avatar || "👤"} size={60} /></div>
        <div className="modal-title">Parent Portal</div>
        <div className="text-sm text-mid" style={{ marginBottom:16, fontWeight:600 }}>PIN for {user.name}</div>
        <div className="pin-display">{[0,1,2,3].map(i => <div key={i} className={`pin-dot ${pin.length > i ? "filled" : ""}`} />)}</div>
        {err && <div className="pin-error" style={{ marginBottom:8 }}>Incorrect PIN</div>}
        <div className="pin-grid">{["1","2","3","4","5","6","7","8","9","","0","del"].map((k,i) => <div key={i} className="pin-key" onClick={() => k && press(k)}>{k==="del"?"⌫":k}</div>)}</div>
        <button className="btn btn-ghost" style={{ marginTop:20, width:"100%" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ─── ChildPinModal ────────────────────────────────────────────────────────────
function ChildPinModal({ child, onSuccess, onCancel }) {
  const [pin, setPin] = useState(""); const [err, setErr] = useState(false);
  const press = k => {
    if (k === "del") { setPin(p => p.slice(0,-1)); setErr(false); return; }
    const n = pin + k; if (n.length > 4) return; setPin(n);
    if (n.length === 4) { if (n === child.pin) onSuccess(); else { setErr(true); setTimeout(() => { setPin(""); setErr(false); }, 600); } }
  };
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ textAlign:"center" }}>
        <div style={{ marginBottom:12 }}><Av photo={child.photo} emoji={child.avatar} size={64} /></div>
        <div className="modal-title">Hi {child.name}! 👋</div>
        <div className="text-sm text-mid" style={{ marginBottom:16, fontWeight:600 }}>Enter your PIN</div>
        <div className="pin-display">{[0,1,2,3].map(i => <div key={i} className={`pin-dot ${pin.length > i ? "filled" : ""}`} />)}</div>
        {err && <div className="pin-error" style={{ marginBottom:8 }}>Wrong PIN, try again!</div>}
        <div className="pin-grid">{["1","2","3","4","5","6","7","8","9","","0","del"].map((k,i) => <div key={i} className="pin-key" onClick={() => k && press(k)}>{k==="del"?"⌫":k}</div>)}</div>
        <button className="btn btn-ghost" style={{ marginTop:20, width:"100%" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ─── AddChoreModal ────────────────────────────────────────────────────────────
function AddChoreModal({ children, onSave, onClose }) {
  const [f, setF] = useState({ title:"", icon:"⭐", points:2, requiresPhoto:false, assignedTo:"all", recurring:true });
  const icons = ["⭐","🍽️","🧹","🗑️","🛏️","🪴","🐕","🚗","👕","🧺","🪣","🪟","🍳","🧼","📚"];
  const set = (k,v) => setF(p => ({...p,[k]:v}));
  return (
    <div className="modal-overlay"><div className="modal">
      <div className="modal-title">✨ New Chore</div>
      <div className="form-group">
        <label className="form-label">Icon</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {icons.map(ic => <div key={ic} onClick={() => set("icon",ic)} style={{ fontSize:"1.6rem", cursor:"pointer", padding:6, borderRadius:10, background:f.icon===ic?"#dbeafe":"#f1f5f9", border:f.icon===ic?"2px solid #3b82f6":"2px solid transparent" }}>{ic}</div>)}
        </div>
      </div>
      <div className="form-group"><label className="form-label">Chore Name</label><input className="form-input" value={f.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. Wash Dishes" /></div>
      <div className="form-row">
        <div className="form-group mb-0"><label className="form-label">Points</label><input className="form-input" type="number" min="1" max="50" value={f.points} onChange={e=>set("points",+e.target.value)} /></div>
        <div className="form-group mb-0"><label className="form-label">Assigned To</label>
          <select className="form-input" value={f.assignedTo} onChange={e=>set("assignedTo",e.target.value)}>
            <option value="all">All Children</option>
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:"flex", gap:20, marginTop:16, marginBottom:16 }}>
        <label className="checkbox-label"><input type="checkbox" checked={f.requiresPhoto} onChange={e=>set("requiresPhoto",e.target.checked)} />📸 Photo Required</label>
        <label className="checkbox-label"><input type="checkbox" checked={f.recurring} onChange={e=>set("recurring",e.target.checked)} />🔄 Recurring</label>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button className="btn btn-blue" style={{ flex:1 }} onClick={() => f.title && onSave(f)}>Save Chore</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ─── AddBankModal ─────────────────────────────────────────────────────────────
function AddBankModal({ childId, onSave, onClose }) {
  const [f, setF] = useState({ name:"", icon:"🏦", type:"recurring", costPoints:5, reward:"" });
  const icons = ["🏦","📱","🎮","🎬","🍦","🎪","📚","🚲","👟","🎁","✈️","🎨","🎵","🏀","⭐"];
  const set = (k,v) => setF(p => ({...p,[k]:v}));
  return (
    <div className="modal-overlay"><div className="modal">
      <div className="modal-title">🏦 New Savings Bank</div>
      <div className="form-group">
        <label className="form-label">Icon</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {icons.map(ic => <div key={ic} onClick={() => set("icon",ic)} style={{ fontSize:"1.6rem", cursor:"pointer", padding:6, borderRadius:10, background:f.icon===ic?"#dbeafe":"#f1f5f9", border:f.icon===ic?"2px solid #3b82f6":"2px solid transparent" }}>{ic}</div>)}
        </div>
      </div>
      <div className="form-group"><label className="form-label">Bank Name</label><input className="form-input" value={f.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Screen Time" /></div>
      <div className="form-group"><label className="form-label">Reward Description</label><input className="form-input" value={f.reward} onChange={e=>set("reward",e.target.value)} placeholder="e.g. 15 min screen time" /></div>
      <div className="form-row">
        <div className="form-group mb-0"><label className="form-label">Points Needed</label><input className="form-input" type="number" min="1" value={f.costPoints} onChange={e=>set("costPoints",+e.target.value)} /></div>
        <div className="form-group mb-0"><label className="form-label">Type</label>
          <select className="form-input" value={f.type} onChange={e=>set("type",e.target.value)}>
            <option value="recurring">🔄 Recurring</option>
            <option value="goal">🎯 One-off Goal</option>
          </select>
        </div>
      </div>
      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <button className="btn btn-purple" style={{ flex:1 }} onClick={() => f.name && f.reward && onSave({...f, childId, savedPoints:0})}>Save Bank</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ─── AddChildModal ────────────────────────────────────────────────────────────
function AddChildModal({ onSave, onClose }) {
  const [name, setName] = useState(""); const [emoji, setEmoji] = useState("🦁");
  const [photo, setPhoto] = useState(null); const [pin, setPin] = useState("");
  const emojiList = ["🦁","🐯","🦊","🐨","🐼","🐸","🦄","🐙","🦋","🐬","🦖","🐧","🦅","🐻","🦝"];
  return (
    <div className="modal-overlay"><div className="modal">
      <div className="modal-title">👦 Add Child</div>
      <AvatarPicker photo={photo} emoji={emoji} emojiList={emojiList} onPhoto={setPhoto} onEmoji={setEmoji} />
      <div className="form-group"><label className="form-label">Child's Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Alex" /></div>
      <div className="form-group">
        <label className="form-label">PIN — 4 digits (optional)</label>
        <input className="form-input" type="password" maxLength={4} placeholder="Leave blank for no PIN" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} />
        <div style={{ fontSize:".8rem", color:"var(--mid)", fontWeight:600, marginTop:4 }}>If set, child must enter PIN to log in.</div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button className="btn btn-green" style={{ flex:1 }} onClick={() => name && onSave({ name, avatar:emoji, photo, walletPoints:0, pin:pin.length===4?pin:null })}>Add Child</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ─── AddParentModal ───────────────────────────────────────────────────────────
function AddParentModal({ onSave, onClose }) {
  const [name, setName] = useState(""); const [pin, setPin] = useState("");
  const [emoji, setEmoji] = useState("👤"); const [photo, setPhoto] = useState(null);
  const emojiList = ["👤","👨","👩","🧔","👴","👵","🧑","👨‍💼","👩‍💼","🦸","🦹","🧙","🧑‍🍳","👮","🧑‍🏫"];
  return (
    <div className="modal-overlay"><div className="modal">
      <div className="modal-title">👤 Add Parent</div>
      <AvatarPicker photo={photo} emoji={emoji} emojiList={emojiList} onPhoto={setPhoto} onEmoji={setEmoji} />
      <div className="form-group"><label className="form-label">Parent Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Mum" /></div>
      <div className="form-group"><label className="form-label">4-Digit PIN</label><input className="form-input" type="password" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="••••" /></div>
      <div style={{ display:"flex", gap:10 }}>
        <button className="btn btn-blue" style={{ flex:1 }} onClick={() => name && pin.length===4 && onSave({ name, pin, photo, avatar:emoji })}>Add Parent</button>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div></div>
  );
}

// ─── ApprovalCard ─────────────────────────────────────────────────────────────
function ApprovalCard({ req, child, chore, onApprove, onReject }) {
  const [showPhoto, setShowPhoto] = useState(false);
  return (
    <div className={`request-card ${req.status}`}>
      <div style={{ fontSize:"2rem" }}>{chore?.icon||"📋"}</div>
      <div className="request-info">
        <div className="request-child"><Av photo={child?.photo} emoji={child?.avatar} size={18} />{child?.name}</div>
        <div className="request-chore">{chore?.title||"Unknown chore"}</div>
        <div className="request-time">{req.time} · <span className={`status status-${req.status}`}>{req.status}</span></div>
        {req.photo && <div style={{ fontSize:".8rem", color:"#3b82f6", fontWeight:700, cursor:"pointer", marginTop:4 }} onClick={() => setShowPhoto(true)}>📸 View Photo</div>}
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontWeight:800, color:"#f59e0b", marginBottom:8 }}>{pts(chore?.points||0)}</div>
        {req.status==="pending" && (
          <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
            <button className="btn btn-green btn-sm" onClick={onApprove}>✓ Yes</button>
            <button className="btn btn-red btn-sm" onClick={onReject}>✗ No</button>
          </div>
        )}
      </div>
      {showPhoto && req.photo && (
        <div className="modal-overlay" onClick={() => setShowPhoto(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">📸 Photo Evidence</div>
            <img src={req.photo} alt="Evidence" className="photo-preview" />
            <button className="btn btn-ghost btn-lg" style={{ marginTop:16 }} onClick={() => setShowPhoto(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EditParentInline ─────────────────────────────────────────────────────────
function EditParentInline({ parent, onSave }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(parent.name);
  const [emoji, setEmoji] = useState(parent.avatar || "👤");
  const [photo, setPhoto] = useState(parent.photo || null);
  const [curPin, setCur] = useState(""); const [newPin, setNew] = useState(""); const [conf, setConf] = useState("");
  const [err, setErr] = useState(""); const [ok, setOk] = useState(false);
  const emojiList = ["👤","👨","👩","🧔","👴","👵","🧑","👨‍💼","👩‍💼","🦸","🦹","🧙","🧑‍🍳","👮","🧑‍🏫"];

  const save = () => {
    setErr("");
    if (!name.trim()) { setErr("Name can't be empty."); return; }
    let finalPin = undefined;
    if (newPin || curPin || conf) {
      const stored = loadData().parents.find(p => p.id === parent.id);
      if (curPin !== stored?.pin) { setErr("Current PIN is incorrect."); return; }
      if (newPin.length !== 4)   { setErr("New PIN must be 4 digits."); return; }
      if (newPin !== conf)        { setErr("PINs don't match."); return; }
      finalPin = newPin;
    }
    onSave({ name: name.trim(), photo, avatar: emoji, pin: finalPin });
    setOk(true); setTimeout(() => { setOpen(false); setOk(false); setCur(""); setNew(""); setConf(""); }, 900);
  };

  if (!open) return <button className="btn btn-ghost btn-sm" style={{ width:"100%", marginTop:10 }} onClick={() => setOpen(true)}>✏️ Edit Profile & PIN</button>;

  return (
    <div style={{ background:"#f8fafc", borderRadius:12, padding:16, marginTop:10 }}>
      <div style={{ fontWeight:800, marginBottom:12 }}>✏️ Edit Profile</div>
      <AvatarPicker photo={photo} emoji={emoji} emojiList={emojiList} onPhoto={setPhoto} onEmoji={setEmoji} />
      <div className="form-group"><label className="form-label">Display Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} /></div>
      <div style={{ fontWeight:700, fontSize:".85rem", color:"var(--mid)", marginBottom:10 }}>Change PIN (leave blank to keep current)</div>
      <div className="form-row" style={{ marginBottom:10 }}>
        <div><label className="form-label">Current PIN</label><input className="form-input" type="password" maxLength={4} placeholder="••••" value={curPin} onChange={e=>setCur(e.target.value.replace(/\D/g,"").slice(0,4))} /></div>
        <div><label className="form-label">New PIN</label><input className="form-input" type="password" maxLength={4} placeholder="••••" value={newPin} onChange={e=>setNew(e.target.value.replace(/\D/g,"").slice(0,4))} /></div>
      </div>
      <div className="form-group"><label className="form-label">Confirm New PIN</label><input className="form-input" type="password" maxLength={4} placeholder="••••" value={conf} onChange={e=>setConf(e.target.value.replace(/\D/g,"").slice(0,4))} /></div>
      {err && <div style={{ color:"var(--red)", fontWeight:700, fontSize:".85rem", marginBottom:8 }}>{err}</div>}
      {ok  && <div style={{ color:"var(--green)", fontWeight:700, fontSize:".85rem", marginBottom:8 }}>✅ Saved!</div>}
      <div style={{ display:"flex", gap:8 }}>
        <button className="btn btn-blue btn-sm" onClick={save}>Save</button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setErr(""); }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── EditChildInline ──────────────────────────────────────────────────────────
function EditChildInline({ child, onSave }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(child.name);
  const [emoji, setEmoji] = useState(child.avatar);
  const [photo, setPhoto] = useState(child.photo || null);
  const [newPin, setNew] = useState(""); const [conf, setConf] = useState("");
  const [err, setErr] = useState(""); const [ok, setOk] = useState(false);
  const emojiList = ["🦁","🐯","🦊","🐨","🐼","🐸","🦄","🐙","🦋","🐬","🦖","🐧","🦅","🐻","🦝"];

  const save = () => {
    setErr("");
    if (!name.trim()) { setErr("Name can't be empty."); return; }
    let pin = child.pin;
    if (newPin || conf) {
      if (newPin.length !== 4) { setErr("PIN must be 4 digits."); return; }
      if (newPin !== conf)     { setErr("PINs don't match."); return; }
      pin = newPin;
    }
    onSave({ name: name.trim(), avatar: emoji, photo, pin });
    setOk(true); setTimeout(() => { setOpen(false); setOk(false); setNew(""); setConf(""); }, 900);
  };

  if (!open) return <button className="btn btn-ghost btn-sm" style={{ marginTop:10 }} onClick={() => setOpen(true)}>✏️ Edit / Manage PIN</button>;

  return (
    <div style={{ background:"#f8fafc", borderRadius:12, padding:16, marginTop:10 }}>
      <div style={{ fontWeight:800, marginBottom:12 }}>✏️ Edit {child.name}</div>
      <AvatarPicker photo={photo} emoji={emoji} emojiList={emojiList} onPhoto={setPhoto} onEmoji={setEmoji} />
      <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={name} onChange={e=>setName(e.target.value)} /></div>
      <div style={{ fontWeight:700, fontSize:".85rem", marginBottom:8 }}>
        Child's PIN — {child.pin ? <span style={{ color:"var(--green)" }}>🔒 Active</span> : <span style={{ color:"var(--mid)" }}>No PIN set</span>}
      </div>
      <div className="form-row" style={{ marginBottom:10 }}>
        <div><label className="form-label">{child.pin ? "New PIN" : "Set PIN"}</label><input className="form-input" type="password" maxLength={4} placeholder="••••" value={newPin} onChange={e=>setNew(e.target.value.replace(/\D/g,"").slice(0,4))} /></div>
        <div><label className="form-label">Confirm PIN</label><input className="form-input" type="password" maxLength={4} placeholder="••••" value={conf} onChange={e=>setConf(e.target.value.replace(/\D/g,"").slice(0,4))} /></div>
      </div>
      {err && <div style={{ color:"var(--red)", fontWeight:700, fontSize:".85rem", marginBottom:8 }}>{err}</div>}
      {ok  && <div style={{ color:"var(--green)", fontWeight:700, fontSize:".85rem", marginBottom:8 }}>✅ Saved!</div>}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        <button className="btn btn-blue btn-sm" onClick={save}>Save</button>
        {child.pin && <button className="btn btn-amber btn-sm" onClick={() => { onSave({ name:child.name, avatar:child.avatar, photo:child.photo, pin:null }); setOpen(false); }}>Remove PIN</button>}
        <button className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setErr(""); }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData]             = useState(loadData);
  const [screen, setScreen]         = useState("home");
  const [activeUser, setActiveUser] = useState(null);
  const [pendingLogin, setPending]  = useState(null);
  const [childTab, setChildTab]     = useState("chores");
  const [parentTab, setParentTab]   = useState("approvals");
  const [selChild, setSelChild]     = useState(null);
  const [modal, setModal]           = useState(null);
  const [claimChore, setClaimChore] = useState(null);
  const [claimPhoto, setClaimPhoto] = useState(null);
  const [distAmts, setDistAmts]     = useState({});
  const [giftChild, setGiftChild]   = useState(null);
  const [giftPts, setGiftPts]       = useState("");
  const [giftNote, setGiftNote]     = useState("");

  const doUpdate = fn => {
    let next;
    setData(d => { next = fn(d); saveData(next); return next; });
    // sync active user
    setTimeout(() => {
      if (!next || !activeUser) return;
      if (screen === "child") { const c = next.children.find(x => x.id === activeUser.id); if (c) setActiveUser(c); }
      if (screen === "parent") { const p = next.parents.find(x => x.id === activeUser.id); if (p) setActiveUser(p); }
    }, 0);
  };

  // Derived
  const myChores  = activeUser && screen==="child" ? data.chores.filter(c => c.assignedTo==="all" || c.assignedTo===activeUser.id) : [];
  const myBanks   = activeUser && screen==="child" ? data.banks.filter(b => b.childId===activeUser.id) : [];
  const myHistory = activeUser && screen==="child" ? data.choreRequests.filter(r => r.childId===activeUser.id) : [];
  const childBanks = selChild ? data.banks.filter(b => b.childId===selChild) : [];

  // Login
  const handleSelectParent = p => { setPending({ type:"parent", user:p }); setModal("pin"); };
  const handleSelectChild  = c => {
    if (c.pin) { setPending({ type:"child", user:c }); setModal("childPin"); }
    else { setActiveUser(c); setScreen("child"); setChildTab("chores"); }
  };
  const handleParentPinOk = () => {
    const fresh = loadData().parents.find(p => p.id===pendingLogin.user.id) || pendingLogin.user;
    setActiveUser(fresh); setScreen("parent"); setModal(null); setPending(null);
    setSelChild(data.children[0]?.id || null);
  };
  const handleChildPinOk = () => {
    const fresh = loadData().children.find(c => c.id===pendingLogin.user.id) || pendingLogin.user;
    setActiveUser(fresh); setScreen("child"); setChildTab("chores"); setModal(null); setPending(null);
  };

  // Chore claim
  const handleClaimChore = chore => { setClaimChore(chore); setClaimPhoto(null); setModal("claimChore"); };
  const handleSubmitClaim = () => {
    if (!claimChore) return;
    doUpdate(d => ({ ...d, choreRequests:[{ id:uid(), childId:activeUser.id, choreId:claimChore.id, status:"pending", time:now(), photo:claimPhoto }, ...d.choreRequests] }));
    setModal(null); setClaimChore(null); setClaimPhoto(null);
  };

  // Approve / reject
  const handleApprove = reqId => doUpdate(d => {
    const req = d.choreRequests.find(r => r.id===reqId);
    const chore = d.chores.find(c => c.id===req?.choreId);
    if (!req || !chore) return d;
    return { ...d, choreRequests:d.choreRequests.map(r => r.id===reqId ? {...r,status:"approved"} : r), children:d.children.map(c => c.id===req.childId ? {...c,walletPoints:c.walletPoints+chore.points} : c), transactions:[{id:uid(),childId:req.childId,type:"earn",points:chore.points,label:chore.title,time:now()},...d.transactions] };
  });
  const handleReject = reqId => doUpdate(d => ({ ...d, choreRequests:d.choreRequests.map(r => r.id===reqId ? {...r,status:"rejected"} : r) }));

  // Distribute
  const handleDistribute = () => {
    const child = data.children.find(c => c.id===activeUser.id);
    const total = Object.values(distAmts).reduce((a,b) => a+(+b||0), 0);
    if (total > child.walletPoints || total <= 0) return;
    doUpdate(d => {
      const banks = d.banks.map(b => { const add = +distAmts[b.id]||0; return add>0 ? {...b,savedPoints:b.savedPoints+add} : b; });
      const txs = Object.entries(distAmts).filter(([,v])=>+v>0).map(([bid,v]) => { const b=d.banks.find(x=>x.id===bid); return {id:uid(),childId:activeUser.id,type:"save",points:-v,label:`→ ${b?.name}`,time:now()}; });
      return { ...d, banks, children:d.children.map(c => c.id===activeUser.id ? {...c,walletPoints:c.walletPoints-total} : c), transactions:[...txs,...d.transactions] };
    });
    setDistAmts({});
  };

  // Redeem
  const handleRedeemBank = bankId => {
    const bank = data.banks.find(b => b.id===bankId);
    if (!bank || bank.savedPoints < bank.costPoints) return;
    doUpdate(d => ({ ...d, banks:d.banks.map(b => b.id===bankId ? {...b,savedPoints:b.type==="recurring"?b.savedPoints-b.costPoints:0} : b), transactions:[{id:uid(),childId:bank.childId,type:"redeem",points:-bank.costPoints,label:`🎉 ${bank.reward}`,time:now()},...d.transactions] }));
  };

  // Gift
  const handleGift = () => {
    const p = +giftPts; if (!giftChild || p <= 0) return;
    doUpdate(d => ({ ...d, children:d.children.map(c => c.id===giftChild ? {...c,walletPoints:c.walletPoints+p} : c), transactions:[{id:uid(),childId:giftChild,type:"gift",points:p,label:`🎁 ${giftNote||"Gift from Parent"}`,time:now()},...d.transactions] }));
    setGiftChild(null); setGiftPts(""); setGiftNote("");
  };

  const photoInput = async e => { if (e.target.files[0]) setClaimPhoto(await readFile(e.target.files[0])); };

  // ══ HOME ══════════════════════════════════════════════════════════════════════
  if (screen === "home") return (
    <>
      <style>{styles}</style>
      <div className="screen-select">
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"4rem", marginBottom:8 }}>⭐</div>
          <div className="screen-select-title">ChoreChart</div>
          <div className="screen-select-sub">Earn points · Build good habits · Save for what you love</div>
        </div>
        <div className="profile-cards">
          {data.children.map(child => (
            <div key={child.id} className="profile-card" onClick={() => handleSelectChild(child)}>
              <Av photo={child.photo} emoji={child.avatar} size={56} />
              <div className="profile-name">{child.name}</div>
              <div className="profile-role">{child.pin ? "🔒 PIN protected" : "Tap to enter"}</div>
              <div className="profile-role">⭐ {child.walletPoints} pts</div>
            </div>
          ))}
          {data.parents.map(parent => (
            <div key={parent.id} className="profile-card parent-card" onClick={() => handleSelectParent(parent)}>
              <Av photo={parent.photo} emoji={parent.avatar||"👤"} size={56} />
              <div className="profile-name">{parent.name}</div>
              <div className="profile-role">🔒 Parent Portal</div>
            </div>
          ))}
        </div>
        {modal==="pin" && pendingLogin && <PinModal user={pendingLogin.user} onSuccess={handleParentPinOk} onCancel={() => { setModal(null); setPending(null); }} />}
        {modal==="childPin" && pendingLogin && <ChildPinModal child={pendingLogin.user} onSuccess={handleChildPinOk} onCancel={() => { setModal(null); setPending(null); }} />}
      </div>
    </>
  );

  // ══ CHILD ═════════════════════════════════════════════════════════════════════
  if (screen === "child") {
    const child = data.children.find(c => c.id===activeUser.id) || activeUser;
    return (
      <>
        <style>{styles}</style>
        <div className="app">
          <nav className="nav">
            <div className="nav-logo"><Av photo={child.photo} emoji={child.avatar} size={32} />{child.name}</div>
            <div className="nav-right">
              <div className="nav-badge">⭐ {child.walletPoints} pts</div>
              <button className="nav-btn ghost" onClick={() => setScreen("home")}>← Switch</button>
            </div>
          </nav>
          <div className="main">
            <div className="wallet-card">
              <div className="wallet-label">My Wallet</div>
              <div className="wallet-pts">{child.walletPoints} <span style={{ fontSize:"1.5rem" }}>pts</span></div>
              <div className="wallet-money">{money(child.walletPoints)} value</div>
            </div>
            <div className="tabs">
              {[["chores","🧹 Chores"],["wallet","💰 Distribute"],["banks","🏦 Banks"],["history","📋 History"]].map(([t,l]) => (
                <button key={t} className={`tab ${childTab===t?"active":""}`} onClick={() => setChildTab(t)}>{l}</button>
              ))}
            </div>

            {/* CHORES */}
            {childTab==="chores" && (
              <>
                <div className="section-title">🧹 Available Chores</div>
                {myChores.length===0 && <div className="empty"><div className="empty-icon">🎉</div><div className="empty-text">No chores assigned!</div></div>}
                <div className="card-grid">
                  {myChores.map(chore => {
                    const pend = data.choreRequests.find(r => r.childId===child.id && r.choreId===chore.id && r.status==="pending");
                    return (
                      <div key={chore.id} className="chore-card">
                        <div className="chore-icon">{chore.icon}</div>
                        <div className="chore-title">{chore.title}</div>
                        <div className="chore-pts">⭐ {pts(chore.points)} · {money(chore.points)}</div>
                        <div className="chore-tags">
                          {chore.requiresPhoto && <span className="tag tag-photo">📸 Photo</span>}
                          <span className={`tag ${chore.recurring?"tag-recurring":"tag-oneoff"}`}>{chore.recurring?"🔄 Recurring":"🎯 One-off"}</span>
                        </div>
                        {pend ? <button className="btn btn-ghost btn-sm" disabled style={{ opacity:.6 }}>⏳ Pending</button>
                               : <button className="btn btn-blue btn-sm" onClick={() => handleClaimChore(chore)}>Claim Chore</button>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* DISTRIBUTE */}
            {childTab==="wallet" && (
              <>
                <div className="section-title">💰 Distribute Points</div>
                {myBanks.length===0 && <div className="empty"><div className="empty-icon">🏦</div><div className="empty-text">No banks yet</div><div className="empty-sub">Ask a parent to create savings banks!</div></div>}
                {myBanks.map(bank => {
                  const pct = Math.min(100,(bank.savedPoints/bank.costPoints)*100);
                  return (
                    <div key={bank.id} className="distribute-row">
                      <div style={{ fontSize:"1.8rem" }}>{bank.icon}</div>
                      <div className="distribute-info">
                        <div style={{ fontWeight:800 }}>{bank.name}</div>
                        <div style={{ fontSize:".8rem", color:"var(--mid)", fontWeight:600 }}>{bank.savedPoints}/{bank.costPoints} pts</div>
                        <div className="bank-progress" style={{ marginTop:4 }}><div className="bank-progress-fill" style={{ width:`${pct}%` }} /></div>
                      </div>
                      <input className="distribute-input" type="number" min="0" placeholder="0" value={distAmts[bank.id]||""} onChange={e=>setDistAmts(a=>({...a,[bank.id]:e.target.value}))} />
                    </div>
                  );
                })}
                {myBanks.length>0 && (
                  <div style={{ marginTop:16 }}>
                    <div style={{ marginBottom:10, fontWeight:700, color:"var(--mid)" }}>
                      Moving: {Object.values(distAmts).reduce((a,b)=>a+(+b||0),0)} pts · Wallet after: {child.walletPoints - Object.values(distAmts).reduce((a,b)=>a+(+b||0),0)} pts
                    </div>
                    <button className="btn btn-purple btn-lg" onClick={handleDistribute}>💸 Distribute Points</button>
                  </div>
                )}
              </>
            )}

            {/* BANKS */}
            {childTab==="banks" && (
              <>
                <div className="section-title">🏦 My Banks</div>
                {myBanks.length===0 && <div className="empty"><div className="empty-icon">🏦</div><div className="empty-text">No banks yet</div></div>}
                <div className="card-grid">
                  {myBanks.map(bank => {
                    const pct = Math.min(100,(bank.savedPoints/bank.costPoints)*100);
                    return (
                      <div key={bank.id} className="bank-card">
                        <div style={{ display:"flex", justifyContent:"space-between" }}>
                          <div style={{ fontSize:"2rem" }}>{bank.icon}</div>
                          <span className={`tag ${bank.type==="recurring"?"tag-recurring":"tag-oneoff"}`}>{bank.type==="recurring"?"🔄":"🎯"}</span>
                        </div>
                        <div className="bank-name">{bank.name}</div>
                        <div className="bank-reward">🎁 {bank.reward}</div>
                        <div className="bank-progress"><div className="bank-progress-fill" style={{ width:`${pct}%` }} /></div>
                        <div className="flex-between">
                          <div className="bank-saved">{bank.savedPoints}/{bank.costPoints} pts</div>
                          <div style={{ fontSize:".8rem", color:"var(--mid)", fontWeight:600 }}>{pct.toFixed(0)}%</div>
                        </div>
                        {bank.savedPoints>=bank.costPoints && <button className="btn btn-green btn-sm" onClick={() => handleRedeemBank(bank.id)}>🎉 Redeem!</button>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* HISTORY */}
            {childTab==="history" && (
              <>
                <div className="section-title">📋 History</div>
                {myHistory.length===0 && data.transactions.filter(t=>t.childId===child.id&&t.type==="gift").length===0 && <div className="empty"><div className="empty-icon">📋</div><div className="empty-text">No history yet</div></div>}
                {/* Gifts */}
                {data.transactions.filter(t=>t.childId===child.id&&t.type==="gift").map(t => (
                  <div key={t.id} className="request-card approved">
                    <div style={{ fontSize:"1.8rem" }}>🎁</div>
                    <div className="request-info"><div className="request-chore">{t.label}</div><div className="request-time">{t.time}</div></div>
                    <div style={{ fontWeight:800, color:"var(--green)" }}>+{pts(t.points)}</div>
                  </div>
                ))}
                {myHistory.map(req => {
                  const chore = data.chores.find(c => c.id===req.choreId);
                  return (
                    <div key={req.id} className={`request-card ${req.status}`}>
                      <div style={{ fontSize:"1.8rem" }}>{chore?.icon||"📋"}</div>
                      <div className="request-info">
                        <div className="request-chore">{chore?.title||"Chore"}</div>
                        <div className="request-time">{req.time}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontWeight:800, color:"#f59e0b", marginBottom:6 }}>+{pts(chore?.points||0)}</div>
                        <span className={`status status-${req.status}`}>{req.status}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Claim modal */}
        {modal==="claimChore" && claimChore && (
          <div className="modal-overlay">
            <div className="modal">
              <div style={{ fontSize:"3rem", textAlign:"center", marginBottom:12 }}>{claimChore.icon}</div>
              <div className="modal-title" style={{ textAlign:"center" }}>{claimChore.title}</div>
              <div style={{ textAlign:"center", color:"var(--amber)", fontWeight:800, fontSize:"1.1rem", marginBottom:20 }}>⭐ {pts(claimChore.points)} · {money(claimChore.points)}</div>
              {claimChore.requiresPhoto && (
                <div className="form-group">
                  <label className="form-label">📸 Photo Evidence Required</label>
                  <label className="photo-upload">
                    {claimPhoto ? <img src={claimPhoto} alt="" className="photo-preview" /> : <div><div style={{ fontSize:"2rem" }}>📷</div><div style={{ fontWeight:700, marginTop:8 }}>Tap to upload photo</div></div>}
                    <input type="file" accept="image/*" style={{ display:"none" }} onChange={photoInput} />
                  </label>
                </div>
              )}
              <div style={{ display:"flex", gap:10 }}>
                <button className="btn btn-blue" style={{ flex:1 }} onClick={handleSubmitClaim} disabled={claimChore.requiresPhoto && !claimPhoto}>✅ Submit for Approval</button>
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ══ PARENT ════════════════════════════════════════════════════════════════════
  if (screen === "parent") {
    const allPending = data.choreRequests.filter(r => r.status==="pending");
    return (
      <>
        <style>{styles}</style>
        <div className="app">
          <nav className="nav">
            <div className="nav-logo"><Av photo={activeUser.photo} emoji={activeUser.avatar||"👤"} size={32} />{activeUser.name}</div>
            <div className="nav-right">
              {allPending.length>0 && <span className="notif-dot">{allPending.length}</span>}
              <button className="nav-btn ghost" onClick={() => setScreen("home")}>← Switch</button>
            </div>
          </nav>
          <div className="main">
            <div className="tabs">
              {[
                ["approvals",`✅ Approvals${allPending.length>0?` (${allPending.length})`:""}`],
                ["chores","🧹 Chores"],["banks","🏦 Banks"],["children","👦 Children"],["settings","⚙️ Settings"],
              ].map(([t,l]) => <button key={t} className={`tab ${parentTab===t?"active":""}`} onClick={() => setParentTab(t)} style={{ fontSize:".78rem" }}>{l}</button>)}
            </div>

            {/* APPROVALS */}
            {parentTab==="approvals" && (
              <>
                <div className="section-title">✅ Pending Approvals</div>
                {allPending.length===0 && <div className="empty"><div className="empty-icon">🎉</div><div className="empty-text">All caught up!</div></div>}
                {allPending.map(req => { const child=data.children.find(c=>c.id===req.childId); const chore=data.chores.find(c=>c.id===req.choreId); return <ApprovalCard key={req.id} req={req} child={child} chore={chore} onApprove={() => handleApprove(req.id)} onReject={() => handleReject(req.id)} />; })}
                {data.choreRequests.filter(r=>r.status!=="pending").length>0 && (<>
                  <div className="divider" /><div className="section-title">📋 Recent History</div>
                  {data.choreRequests.filter(r=>r.status!=="pending").slice(0,10).map(req => { const child=data.children.find(c=>c.id===req.childId); const chore=data.chores.find(c=>c.id===req.choreId); return <ApprovalCard key={req.id} req={req} child={child} chore={chore} onApprove={() => {}} onReject={() => {}} />; })}
                </>)}
              </>
            )}

            {/* CHORES */}
            {parentTab==="chores" && (
              <>
                <div className="flex-between" style={{ marginBottom:16 }}>
                  <div className="section-title" style={{ marginBottom:0 }}>🧹 Manage Chores</div>
                  <button className="btn btn-blue btn-sm" onClick={() => setModal("addChore")}>+ Add Chore</button>
                </div>
                {data.chores.length===0 && <div className="empty"><div className="empty-icon">🧹</div><div className="empty-text">No chores yet</div></div>}
                <div className="card-grid">
                  {data.chores.map(chore => (
                    <div key={chore.id} className="chore-card">
                      <div className="chore-icon">{chore.icon}</div>
                      <div className="chore-title">{chore.title}</div>
                      <div className="chore-pts">⭐ {pts(chore.points)}</div>
                      <div className="chore-tags">
                        {chore.requiresPhoto && <span className="tag tag-photo">📸 Photo</span>}
                        <span className={`tag ${chore.recurring?"tag-recurring":"tag-oneoff"}`}>{chore.recurring?"🔄":"🎯"}</span>
                      </div>
                      <div style={{ fontSize:".8rem", color:"var(--mid)", fontWeight:600 }}>{chore.assignedTo==="all"?"All children":data.children.find(c=>c.id===chore.assignedTo)?.name}</div>
                      <button className="btn btn-red btn-sm" onClick={() => doUpdate(d=>({...d,chores:d.chores.filter(c=>c.id!==chore.id)}))}>🗑 Remove</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* BANKS */}
            {parentTab==="banks" && (
              <>
                <div className="child-selector">
                  {data.children.map(child => (
                    <div key={child.id} className={`child-pill ${selChild===child.id?"active":""}`} onClick={() => setSelChild(child.id)}>
                      <Av photo={child.photo} emoji={child.avatar} size={24} />{child.name}
                    </div>
                  ))}
                </div>
                {selChild && (
                  <>
                    <div className="flex-between" style={{ marginBottom:16 }}>
                      <div className="section-title" style={{ marginBottom:0 }}>🏦 {data.children.find(c=>c.id===selChild)?.name}'s Banks</div>
                      <button className="btn btn-purple btn-sm" onClick={() => setModal("addBank")}>+ Add Bank</button>
                    </div>
                    {childBanks.length===0 && <div className="empty"><div className="empty-icon">🏦</div><div className="empty-text">No banks yet</div></div>}
                    <div className="card-grid">
                      {childBanks.map(bank => {
                        const pct = Math.min(100,(bank.savedPoints/bank.costPoints)*100);
                        return (
                          <div key={bank.id} className="bank-card">
                            <div style={{ display:"flex", justifyContent:"space-between" }}>
                              <div style={{ fontSize:"2rem" }}>{bank.icon}</div>
                              <span className={`tag ${bank.type==="recurring"?"tag-recurring":"tag-oneoff"}`}>{bank.type==="recurring"?"🔄":"🎯"}</span>
                            </div>
                            <div className="bank-name">{bank.name}</div>
                            <div className="bank-reward">🎁 {bank.reward}</div>
                            <div className="bank-progress"><div className="bank-progress-fill" style={{ width:`${pct}%` }} /></div>
                            <div className="flex-between">
                              <div className="bank-saved">{bank.savedPoints}/{bank.costPoints} pts</div>
                              <div style={{ fontSize:".8rem", color:"var(--mid)", fontWeight:600 }}>{money(bank.costPoints)}</div>
                            </div>
                            <button className="btn btn-red btn-sm" onClick={() => doUpdate(d=>({...d,banks:d.banks.filter(b=>b.id!==bank.id)}))}>🗑 Remove</button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* CHILDREN */}
            {parentTab==="children" && (
              <>
                <div className="flex-between" style={{ marginBottom:16 }}>
                  <div className="section-title" style={{ marginBottom:0 }}>👦 Children</div>
                  <button className="btn btn-green btn-sm" onClick={() => setModal("addChild")}>+ Add Child</button>
                </div>
                {data.children.map(child => {
                  const earned = data.transactions.filter(t=>t.childId===child.id&&t.type==="earn").reduce((a,t)=>a+t.points,0);
                  return (
                    <div key={child.id} className="card">
                      <div className="flex-between">
                        <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                          <Av photo={child.photo} emoji={child.avatar} size={52} />
                          <div>
                            <div style={{ fontWeight:800, fontSize:"1.1rem" }}>{child.name}</div>
                            <div style={{ color:"var(--mid)", fontSize:".85rem", fontWeight:600 }}>Wallet: {child.walletPoints} pts · Earned: {earned} pts</div>
                            <div style={{ fontSize:".8rem", marginTop:2 }}>{child.pin ? <span style={{ color:"var(--green)", fontWeight:700 }}>🔒 PIN active</span> : <span style={{ color:"var(--mid)", fontWeight:600 }}>No PIN</span>}</div>
                          </div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                          <button className="btn btn-amber btn-sm" onClick={() => { setGiftChild(child.id); setGiftPts(""); setGiftNote(""); }}>🎁 Gift Points</button>
                          <button className="btn btn-red btn-sm" onClick={() => doUpdate(d=>({...d,children:d.children.filter(c=>c.id!==child.id)}))}>Remove</button>
                        </div>
                      </div>
                      <EditChildInline child={child} onSave={upd => doUpdate(d=>({...d,children:d.children.map(c=>c.id===child.id?{...c,...upd}:c)}))} />
                    </div>
                  );
                })}
              </>
            )}

            {/* SETTINGS */}
            {parentTab==="settings" && (
              <>
                <div className="section-title">⚙️ Parent Accounts</div>
                <div className="flex-between" style={{ marginBottom:16 }}>
                  <span style={{ fontWeight:700, color:"var(--mid)" }}>Manage parents</span>
                  <button className="btn btn-blue btn-sm" onClick={() => setModal("addParent")}>+ Add Parent</button>
                </div>
                {data.parents.map(parent => (
                  <div key={parent.id} className="card" style={{ marginBottom:12 }}>
                    <div className="flex-between">
                      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                        <Av photo={parent.photo} emoji={parent.avatar||"👤"} size={52} />
                        <div>
                          <div style={{ fontWeight:800, fontSize:"1.1rem" }}>{parent.name}</div>
                          <div style={{ color:"var(--mid)", fontSize:".85rem", fontWeight:600 }}>PIN: ••••</div>
                        </div>
                      </div>
                      {data.parents.length>1 && <button className="btn btn-red btn-sm" onClick={() => doUpdate(d=>({...d,parents:d.parents.filter(p=>p.id!==parent.id)}))}>Remove</button>}
                    </div>
                    <EditParentInline parent={parent} onSave={upd => doUpdate(d=>({...d,parents:d.parents.map(p=>p.id===parent.id?{...p,name:upd.name,photo:upd.photo,avatar:upd.avatar,...(upd.pin?{pin:upd.pin}:{})}:p)}))} />
                  </div>
                ))}
                <div className="divider" />
                <div className="section-title">📊 Family Stats</div>
                <div className="stats-row">
                  <div className="stat-box"><div className="stat-val">{data.children.length}</div><div className="stat-label">Children</div></div>
                  <div className="stat-box"><div className="stat-val">{data.chores.length}</div><div className="stat-label">Chores</div></div>
                  <div className="stat-box"><div className="stat-val">{data.choreRequests.filter(r=>r.status==="approved").length}</div><div className="stat-label">Approved</div></div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modals */}
        {modal==="addChore" && <AddChoreModal children={data.children} onSave={f=>{doUpdate(d=>({...d,chores:[...d.chores,{...f,id:uid()}]}));setModal(null);}} onClose={() => setModal(null)} />}
        {modal==="addBank" && selChild && <AddBankModal childId={selChild} onSave={b=>{doUpdate(d=>({...d,banks:[...d.banks,{...b,id:uid()}]}));setModal(null);}} onClose={() => setModal(null)} />}
        {modal==="addChild" && <AddChildModal onSave={c=>{doUpdate(d=>({...d,children:[...d.children,{...c,id:uid()}]}));setModal(null);}} onClose={() => setModal(null)} />}
        {modal==="addParent" && <AddParentModal onSave={p=>{doUpdate(d=>({...d,parents:[...d.parents,{...p,id:uid()}]}));setModal(null);}} onClose={() => setModal(null)} />}

        {/* Gift Modal */}
        {giftChild && (() => {
          const child = data.children.find(c => c.id===giftChild);
          return (
            <div className="modal-overlay">
              <div className="modal">
                <div style={{ textAlign:"center", marginBottom:14 }}><Av photo={child?.photo} emoji={child?.avatar} size={68} /></div>
                <div className="modal-title" style={{ textAlign:"center" }}>🎁 Gift Points to {child?.name}</div>
                <div style={{ background:"var(--yellow)", borderRadius:12, padding:14, marginBottom:20, fontSize:".9rem", fontWeight:700, color:"#92400e" }}>
                  1 point = 50¢ · Current wallet: {child?.walletPoints} pts ({money(child?.walletPoints||0)})
                </div>
                <div className="form-group">
                  <label className="form-label">Points to Gift</label>
                  <input className="form-input" type="number" min="1" placeholder="e.g. 10" value={giftPts} onChange={e=>setGiftPts(e.target.value)} />
                  {giftPts>0 && <div style={{ fontSize:".85rem", color:"var(--mid)", fontWeight:700, marginTop:6 }}>= {money(+giftPts)} value added to wallet</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Note (optional)</label>
                  <input className="form-input" placeholder="e.g. Birthday bonus 🎂, Great behaviour today!" value={giftNote} onChange={e=>setGiftNote(e.target.value)} />
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button className="btn btn-amber" style={{ flex:1 }} onClick={handleGift} disabled={!giftPts||+giftPts<=0}>🎁 Give Points!</button>
                  <button className="btn btn-ghost" onClick={() => setGiftChild(null)}>Cancel</button>
                </div>
              </div>
            </div>
          );
        })()}
      </>
    );
  }

  return null;
}
