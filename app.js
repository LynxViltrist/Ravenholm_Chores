const STORAGE_KEY = "chore-board-v2";
const TIER = { light: {label:"Light"}, moderate: {label:"Moderate"}, heavy: {label:"Heavy"} };
const FREQ = {
  daily: "Daily",
  eod: "Every other day",
  weekly: "Weekly",
  monthly: "Monthly",
  as_needed: "As needed",
  onetime: "One-time / pending"
};
const FREQ_ORDER = ["daily","eod","weekly","monthly"];

// --- Editable lists, synced in shared state: Shopping supplies + One-time/Pending todos ---
function uid(){ return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function defaultPending(){ return [
  { id:"remove_bookcase", label:"Remove the front hallway bookcase", done:false },
  { id:"replace_shoe_rack", label:"Replace the front hallway shoe rack", done:false },
  { id:"moxxie_list", label:"Moxxie: submit shared-space current vs. ideal list", done:false },
  { id:"lynx_bedroom_list", label:"Lynx: write up bedroom task list", done:false },
]; }
function defaultShopping(){ return [
  { id:"sh_dishsoap", label:"Dish soap / Dawn Powerwash (cleans without hot water)", done:false },
  { id:"sh_scrubbers", label:"Long-handled dish scrubbers", done:false },
  { id:"sh_stool", label:"Adjustable rolling stool with footrest (to reach the sink)", done:false },
  { id:"sh_dwdet", label:"Dishwasher detergent / pods", done:false },
  { id:"sh_sponges", label:"Sponges", done:false },
  { id:"sh_apc", label:"All-purpose surface cleaner", done:false },
  { id:"sh_wipes", label:"Disinfecting wipes", done:false },
  { id:"sh_microfiber", label:"Microfiber cloths", done:false },
  { id:"sh_papertowels", label:"Paper towels", done:false },
  { id:"sh_duster", label:"Extendable duster", done:false },
  { id:"sh_glass", label:"Glass cleaner (windows & mirrors)", done:false },
  { id:"sh_toiletcleaner", label:"Toilet bowl cleaner", done:false },
  { id:"sh_toiletbrush", label:"Toilet brush", done:false },
  { id:"sh_tubbrush", label:"Long-handled tub/shower scrub brush", done:false },
  { id:"sh_tubcleaner", label:"Tub & shower cleaner", done:false },
  { id:"sh_bathcleaner", label:"Bathroom sink/counter cleaner", done:false },
  { id:"sh_mop", label:"Mop + replacement pads (kitchen floor)", done:false },
  { id:"sh_broom", label:"Broom & dustpan (hallway sweeping)", done:false },
  { id:"sh_floorcleaner", label:"Floor cleaner (kitchen mopping)", done:false },
  { id:"sh_trashbags", label:"Trash bags / can liners", done:false },
  { id:"sh_litter", label:"Cat litter", done:false },
  { id:"sh_scoop", label:"Litter scoop", done:false },
  { id:"sh_wastebags", label:"Litter waste bags", done:false },
  { id:"sh_gloves", label:"Disposable gloves (for the cat boxes)", done:false },
  { id:"sh_n95", label:"N95 masks (for the cat boxes)", done:false },
  { id:"sh_detergent", label:"Laundry detergent", done:false },
  { id:"sh_dryer", label:"Dryer sheets / wool dryer balls", done:false },
  { id:"sh_steam", label:"Steam cleaner — heat-sanitizes, no harsh chemicals (to look into)", done:false },
]; }

// [id, label, tier, frequency]
const ZONES = [
  { id:"trash", name:"Trash", tasks:[
    ["empty_reline","Empty & reline all cans; sweep a trash check through every room","light","daily"],
    ["stage_bags","Stage bags by the front door","light","daily"],
    ["haul_dumpster","Load the Kia & haul to the dumpster","moderate","daily"],
  ]},
  { id:"dining", name:"Dining Room", tasks:[
    ["clear_main_table","Clear & wipe the main dining table, chairs pushed in","light","daily"],
    ["vacuum_chair_cushions","Vacuum the dining chair cushions","light","monthly"],
  ]},
  { id:"kitchen_dishes", name:"Kitchen — Dishes", tasks:[
    ["load_dw","Load & run the dishwasher","light","daily"],
    ["hand_wash","Hand-wash pots, knives, chopsticks, oversized items","moderate","daily"],
    ["dry_away","Dry & put dishes away","light","daily"],
    ["clean_cups","Clean the cups in use","light","daily"],
  ]},
  { id:"kitchen_surfaces", name:"Kitchen — Surfaces & Appliances", tasks:[
    ["counters","Clear & wipe counters","light","daily"],
    ["stove","Wipe down the stove","light","daily"],
    ["microwave","Clean the microwave","light","weekly"],
    ["fridge_toss","Toss expired fridge food & wipe spills","moderate","weekly"],
  ]},
  { id:"floors", name:"Floors (whole house)", tasks:[
    ["floors_clear","Keep floors clear so the robot vacuum can run","light","daily"],
    ["whole_house_vacuum","Whole-house vacuum/sweep + mop kitchen floor","moderate","weekly"],
    ["couch_vacuum","Vacuum the couch","moderate","weekly"],
    ["cat_tree_vacuum","Vacuum the cat trees","light","monthly"],
  ]},
  { id:"living", name:"Living Room", tasks:[
    ["dust_cords","Dust surfaces & tidy cords","light","monthly"],
  ]},
  { id:"hallway", name:"Front Hallway", tasks:[
    ["shoes_away","Shoes & stray items put away","light","daily"],
    ["robot_vacuum_clear","Clear the robot vacuum's path / empty its bin","light","eod"],
    ["sweep_hallway","Sweep the hallway","light","weekly"],
  ]},
  { id:"office", name:"Office", tasks:[
    ["sort_mail","Sort the mail — keep / recycle / needs action","light","daily"],
  ]},
  { id:"bath1", name:"Bathroom 1", tasks:[
    ["b1_daily_light","Clear surfaces, quick wipe sink, towels to laundry","light","daily"],
    ["b1_toilet","Scrub the toilet","moderate","weekly"],
    ["b1_tub","Scrub the tub/shower","heavy","weekly"],
    ["b1_sink_full","Clean sink/counter/mirror, sweep & mop, restock","moderate","weekly"],
  ]},
  { id:"bath2", name:"Bathroom 2", tasks:[
    ["b2_daily_light","Clear surfaces, quick wipe sink, towels to laundry","light","daily"],
    ["b2_toilet","Scrub the toilet","moderate","weekly"],
    ["b2_tub","Scrub the tub/shower","heavy","weekly"],
    ["b2_sink_full","Clean sink/counter/mirror, sweep & mop, restock","moderate","weekly"],
  ]},
  { id:"catbox_office", name:"Cat Box — Office", tasks:[
    ["office_scoop","Scoop the box","heavy","daily"],
    ["office_catbox_vacuum","Vacuum around the box","light","daily"],
    ["office_catbox_service","Full box service (dump/wash/refill)","heavy","weekly"],
  ]},
  { id:"catbox_andry", name:"Cat Box — Andry's Bedroom", tasks:[
    ["andry_scoop","Scoop the box","moderate","daily"],
    ["andry_catbox_vacuum","Vacuum around the box","moderate","daily"],
    ["andry_catbox_service","Full box service (dump/wash/refill)","heavy","weekly"],
  ]},
  { id:"catbox_lynx", name:"Cat Box — Lynx's Bedroom", tasks:[
    ["lynx_scoop","Scoop the box","light","daily"],
    ["lynx_catbox_service","Full box service (dump/wash/refill)","heavy","weekly"],
  ]},
  { id:"car", name:"Car (Kia)", tasks:[
    ["car_cleanout","Full cleanout","moderate","weekly"],
  ]},
  { id:"general", name:"General (whole house)", tasks:[
    ["general_wipe","General wipe-down/dusting — switches, handles, baseboards, shelves","light","monthly"],
  ]},
];
// (One-time/Pending and Shopping are now editable, synced lists — see defaultPending()/defaultShopping().)

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const PALETTE = [
  {bg:"#4B2E83", fg:"#EAE0FB"},
  {bg:"#2E6B52", fg:"#D6F5E6"},
  {bg:"#832E52", fg:"#FBE0EC"},
  {bg:"#2E4E83", fg:"#DCE7FB"},
  {bg:"#83672E", fg:"#FBECD0"},
  {bg:"#6B2E83", fg:"#F0E0FB"},
  {bg:"#2E837A", fg:"#D2FBF4"},
  {bg:"#832E3E", fg:"#FBDCE0"},
];

let state = { roster: [], tasks: {}, pending: [], shopping: [] };
let myName = "";
let activeFilter = "all";

function allTaskIds(){ const ids=[]; ZONES.forEach(z=>z.tasks.forEach(t=>ids.push(t[0]))); return ids; }
function taskMeta(id){ for(const z of ZONES) for(const t of z.tasks) if(t[0]===id) return {zone:z,id:t[0],label:t[1],tier:t[2],freq:t[3]}; return null; }
// The board's day runs 5am to 5am, not midnight to midnight — a chore ticked off
// at 1am still counts toward the day that just ended, and nothing rolls over on
// someone who's up late. Everything that asks "what day is it" goes through
// choreNow(), so this one number moves the whole boundary.
const DAY_ROLLOVER_HOUR = 5;
function choreNow(){ const d = new Date(); d.setHours(d.getHours() - DAY_ROLLOVER_HOUR); return d; }
function todayName(){ return DAYS[choreNow().getDay()]; }
function isoDate(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function todayISO(){ return isoDate(choreNow()); }
// The calendar date a given day-of-week falls on in the current Sun–Sat week.
function isoForDay(dayName){
  const now = choreNow();
  return isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + DAYS.indexOf(dayName)));
}
function monthKey(){ return todayISO().slice(0,7); }
// Check-offs are stamped with the date they were made, so they expire on their
// own instead of carrying into the next day already crossed off. How long a ✓
// stays good depends on the frequency: a daily or weekly ✓ belongs to the week
// it was made in, a monthly ✓ to the calendar month.
function dayDone(t, d, freq){
  if (!(t.doneDays && t.doneDays[d])) return false;
  const stamp = t.doneDates && t.doneDates[d];
  if (!stamp) return false;
  return freq === "monthly" ? stamp.slice(0,7) === monthKey() : stamp === isoForDay(d);
}
function setDayDone(t, d, checked, freq){
  if (!t.doneDays) t.doneDays = {};
  if (!t.doneDates) t.doneDates = {};
  t.doneDays[d] = checked;
  // Monthly ✓s are stamped with the day it was actually ticked, so one made late
  // in the month doesn't get backdated into the previous one.
  t.doneDates[d] = checked ? (freq === "monthly" ? todayISO() : isoForDay(d)) : null;
}
function dailyDone(t){ return !!t.done && t.doneDate === todayISO(); }
function setDailyDone(t, checked){ t.done = checked; t.doneDate = checked ? todayISO() : null; }
function clearMarks(t){
  t.done = false; t.doneDate = null;
  if (t.doneDays) DAYS.forEach(d => { t.doneDays[d] = false; });
  if (t.doneDates) DAYS.forEach(d => { t.doneDates[d] = null; });
}
function colorFor(name){
  const idx = state.roster.indexOf(name);
  if (idx < 0) return null;
  return PALETTE[idx % PALETTE.length];
}
function initialsOf(name){
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0,2).toUpperCase();
}
function dayCellsHtml(id, label, t){
  return DAYS.map(d => {
    const name = t.schedule ? t.schedule[d] : null;
    const isToday = d === todayName();
    const color = name ? colorFor(name) : null;
    const style = color ? ` style="background:${color.bg}; color:${color.fg}; border-color:${color.bg};"` : "";
    const isMine = myName && name === myName;
    const disabledAttr = myName ? "" : " disabled";
    let title;
    if (!myName) title = "Select who you are above first";
    else if (isMine) title = `${d}: assigned to ${myName} — click to unassign`;
    else if (name) title = `${d}: ${name} — click to take this day for ${myName}`;
    else title = `${d}: unassigned — click to take this day for ${myName}`;
    const display = name ? initialsOf(name) : d[0];
    const isDone = dayDone(t, d, "daily");
    return `<button type="button" class="day-bubble${isToday?' today':''}${name?' assigned':''}${isMine?' mine':''}${isDone?' day-complete':''}"${disabledAttr} data-task="${id}" data-day="${d}"${style} title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(display)}${isDone ? '<span class="day-done" aria-hidden="true">✓</span>' : ''}</button>`;
  }).join("");
}

async function loadState(){
  try{
    const res = await window.storage.get(STORAGE_KEY, true);
    if (res && res.value){
      const parsed = JSON.parse(res.value);
      state.roster = parsed.roster || [];
      state.tasks = parsed.tasks || {};
      state.pending = Array.isArray(parsed.pending) ? parsed.pending : defaultPending();
      state.shopping = Array.isArray(parsed.shopping) ? parsed.shopping : defaultShopping();
    } else {
      state.pending = defaultPending();
      state.shopping = defaultShopping();
    }
  } catch(e){
    if (!state.pending || !state.pending.length) state.pending = defaultPending();
    if (!state.shopping || !state.shopping.length) state.shopping = defaultShopping();
  }
  try{
    const me = await window.storage.get("my-name", false);
    if (me && me.value) myName = me.value;
  } catch(e){}
}
async function saveState(){
  try{ await window.storage.set(STORAGE_KEY, JSON.stringify(state), true); } catch(e){ console.error("Save failed", e); }
}
async function saveMyName(){
  try{ await window.storage.set("my-name", myName, false); } catch(e){ console.error(e); }
}
function ensureTask(id){
  if(!state.tasks[id]) state.tasks[id] = { claimedBy:null, done:false };
  const t = state.tasks[id];
  const meta = taskMeta(id);
  if (meta && meta.freq === "daily"){
    if (!t.schedule){ t.schedule = {}; DAYS.forEach(d => { t.schedule[d] = null; }); }
    if (!t.doneDays){ t.doneDays = {}; DAYS.forEach(d => { t.doneDays[d] = false; }); }
    if (!t.doneDates){ t.doneDates = {}; DAYS.forEach(d => { t.doneDates[d] = null; }); }
  }
  return t;
}
function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function renderMeSelect(){
  const sel = document.getElementById("me-select");
  sel.innerHTML = "";
  const noneOpt = document.createElement("option");
  noneOpt.value = ""; noneOpt.textContent = "— select —";
  sel.appendChild(noneOpt);
  state.roster.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name; opt.textContent = name;
    if (name === myName) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = async () => { myName = sel.value; await saveMyName(); renderAll(); };
}

function renderRoster(){
  const grid = document.getElementById("roster-grid");
  grid.innerHTML = "";
  if (state.roster.length === 0){
    grid.innerHTML = '<p class="empty-roster">Add everyone in the house above to start claiming tasks.</p>';
    return;
  }
  state.roster.forEach(name => {
    const counts = { light:0, moderate:0, heavy:0 };
    let total = 0;
    Object.entries(state.tasks).forEach(([id, t]) => {
      const meta = taskMeta(id);
      if (!meta || meta.freq === "onetime") return;
      if (meta.freq === "daily"){
        if (t.schedule){
          DAYS.forEach(d => { if (t.schedule[d] === name){ counts[meta.tier]++; total++; } });
        }
      } else if (t.claimedBy === name){
        counts[meta.tier]++; total++;
      }
    });
    const points = counts.light*1 + counts.moderate*2 + counts.heavy*3;
    const card = document.createElement("div");
    card.className = "roster-card";
    const lightW = points>0 ? (counts.light*1/points)*100 : 0;
    const modW = points>0 ? (counts.moderate*2/points)*100 : 0;
    const heavyW = points>0 ? (counts.heavy*3/points)*100 : 0;
    card.innerHTML = `
      <div class="roster-name">
        <span>${escapeHtml(name)}</span>
        <button class="ghost small" data-remove="${escapeHtml(name)}" aria-label="Remove ${escapeHtml(name)} from roster">Remove</button>
      </div>
      <div class="load-bar">
        ${points>0 ? `
          <div class="load-seg light" style="width:${lightW}%"></div>
          <div class="load-seg moderate" style="width:${modW}%"></div>
          <div class="load-seg heavy" style="width:${heavyW}%"></div>
        ` : ""}
      </div>
      <div class="roster-count">${total} occurrence${total===1?"":"s"}/wk &middot; L${counts.light} / M${counts.moderate} / H${counts.heavy}</div>
    `;
    grid.appendChild(card);
  });
  grid.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const name = btn.getAttribute("data-remove");
      state.roster = state.roster.filter(n => n !== name);
      Object.values(state.tasks).forEach(t => {
        if (t.claimedBy === name) t.claimedBy = null;
        if (t.schedule){ DAYS.forEach(d => { if (t.schedule[d] === name) t.schedule[d] = null; }); }
      });
      if (myName === name){ myName = ""; await saveMyName(); }
      await saveState();
      renderAll();
    });
  });
}

function renderFilters(){
  const row = document.getElementById("filter-row");
  row.innerHTML = "";
  const options = [["all","All"], ...FREQ_ORDER.map(f => [f, FREQ[f]])];
  options.forEach(([key,label]) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (activeFilter===key ? " active" : "");
    btn.textContent = label;
    btn.addEventListener("click", () => { activeFilter = key; renderZones(); renderFilters(); });
    row.appendChild(btn);
  });
}

function zoneVisibleTasks(zone){ return zone.tasks.filter(t => activeFilter==="all" || t[3]===activeFilter); }
function zoneProgress(zone, visibleTasks){
  const total = visibleTasks.length;
  const today = todayName();
  const done = visibleTasks.filter(t => {
    const st = state.tasks[t[0]];
    if (!st) return false;
    if (t[3] === "daily") return dayDone(st, today, "daily");
    return !!st.done;
  }).length;
  return `${done}/${total}`;
}

function renderZones(){
  const container = document.getElementById("zones");
  container.innerHTML = "";
  ZONES.forEach(zone => {
    const visible = zoneVisibleTasks(zone);
    if (visible.length === 0) return;
    const zoneEl = document.createElement("div");
    zoneEl.className = "zone";
    const bodyId = `body-${zone.id}`;
    zoneEl.innerHTML = `
      <button class="zone-head" data-toggle="${bodyId}" aria-expanded="true" aria-controls="${bodyId}">
        <span class="zone-title"><h3>${escapeHtml(zone.name)}</h3></span>
        <span class="zone-progress">${zoneProgress(zone, visible)} <span class="chevron">▾</span></span>
      </button>
      <div class="zone-body" id="${bodyId}"></div>
    `;
    const body = zoneEl.querySelector(".zone-body");
    visible.forEach(([id, label, tier, freq]) => {
      const t = ensureTask(id);
      const row = document.createElement("div");
      if (freq === "daily"){
        row.className = "task-row";
        const todayAssignee = t.schedule ? t.schedule[todayName()] : null;
        row.innerHTML = `
          <span class="tier-tag ${tier}">${TIER[tier].label}</span>
          <span class="freq-tag">${FREQ[freq]}</span>
          <span class="task-main">
            <span class="task-label">${escapeHtml(label)}</span>
            <span class="today-badge${todayAssignee ? "" : " unassigned"}">${todayAssignee ? `Today: ${escapeHtml(todayAssignee)}` : "Today: unassigned"}</span>
          </span>
          <div class="day-row" role="group" aria-label="Assign days for '${escapeHtml(label)}'">
            ${dayCellsHtml(id, label, t)}
          </div>
        `;
      } else {
        row.className = "task-row" + (t.done ? " done" : "");
        const rosterOptions = ["", ...state.roster].map(n =>
          `<option value="${escapeHtml(n)}" ${t.claimedBy===n?"selected":""}>${n===""?"Unclaimed":escapeHtml(n)}</option>`
        ).join("");
        const isMineClaim = myName && t.claimedBy === myName;
        const quickDisabled = myName ? "" : " disabled";
        const quickTitle = myName ? `Quick-claim for ${myName}` : "Select who you are above first";
        row.innerHTML = `
          <input type="checkbox" class="task-check" ${t.done?"checked":""} aria-label="Mark '${escapeHtml(label)}' done" data-task="${id}">
          <span class="tier-tag ${tier}">${TIER[tier].label}</span>
          <span class="freq-tag">${FREQ[freq]}</span>
          <span class="task-main"><span class="task-label">${escapeHtml(label)}</span></span>
          <select class="claim-select" aria-label="Who's doing '${escapeHtml(label)}'" data-task="${id}">
            ${rosterOptions}
          </select>
          <button type="button" class="ghost small claim-quick${isMineClaim?' active':''}"${quickDisabled} data-task="${id}" title="${escapeHtml(quickTitle)}">${isMineClaim ? "✓ Mine" : "Mine"}</button>
        `;
      }
      body.appendChild(row);
    });
    container.appendChild(zoneEl);
  });

  container.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const body = document.getElementById(btn.getAttribute("data-toggle"));
      const isHidden = body.hasAttribute("hidden");
      if (isHidden) body.removeAttribute("hidden"); else body.setAttribute("hidden","");
      btn.setAttribute("aria-expanded", isHidden ? "true" : "false");
      btn.querySelector(".chevron").textContent = isHidden ? "▾" : "▸";
    });
  });
  container.querySelectorAll(".task-check").forEach(cb => {
    cb.addEventListener("change", async () => {
      const id = cb.getAttribute("data-task");
      ensureTask(id).done = cb.checked;
      await saveState();
      renderAll();
    });
  });
  container.querySelectorAll(".claim-select").forEach(sel => {
    sel.addEventListener("change", async () => {
      const id = sel.getAttribute("data-task");
      ensureTask(id).claimedBy = sel.value || null;
      await saveState();
      renderAll();
    });
  });
  container.querySelectorAll(".day-bubble").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!myName) return;
      const id = btn.getAttribute("data-task");
      const day = btn.getAttribute("data-day");
      const t = ensureTask(id);
      t.schedule[day] = (t.schedule[day] === myName) ? null : myName;
      await saveState();
      renderAll();
    });
  });
  container.querySelectorAll(".claim-quick").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!myName) return;
      const id = btn.getAttribute("data-task");
      const t = ensureTask(id);
      t.claimedBy = (t.claimedBy === myName) ? null : myName;
      await saveState();
      renderAll();
    });
  });
}

function renderAll(){ const _y = window.scrollY; renderMeSelect(); renderRoster(); renderFilters(); renderZones(); renderPending(); renderShopping(); renderMyChores(); if (window.scrollY !== _y) window.scrollTo(0, _y); }

// --- Editable lists: One-time/Pending (household board) + Shopping (own tab) ---
function editListFor(kind){ return kind === "shopping" ? state.shopping : state.pending; }
function renderEditList(containerId, kind){
  const el = document.getElementById(containerId);
  if (!el) return;
  const items = editListFor(kind) || [];
  if (!items.length){
    el.innerHTML = `<li class="edit-empty">Nothing here yet — add something below.</li>`;
    return;
  }
  el.innerHTML = items.map(it => `
    <li class="edit-item${it.done ? ' done' : ''}">
      <input type="checkbox" class="edit-check" data-kind="${kind}" data-id="${escapeHtml(it.id)}" ${it.done ? 'checked' : ''} aria-label="Mark done">
      <span class="edit-label">${escapeHtml(it.label)}</span>
      <button type="button" class="edit-remove" data-kind="${kind}" data-id="${escapeHtml(it.id)}" title="Remove" aria-label="Remove ${escapeHtml(it.label)}">✕</button>
    </li>`).join("");
}
function renderPending(){ renderEditList("pending-list", "pending"); }
function renderShopping(){ renderEditList("shopping-list", "shopping"); }

async function addEditItem(kind, label){
  label = (label || "").trim();
  if (!label) return;
  editListFor(kind).push({ id: uid(), label, done: false });
  await saveState(); renderAll();
}
async function toggleEditItem(kind, id, done){
  const it = editListFor(kind).find(x => x.id === id);
  if (it) it.done = done;
  await saveState(); renderAll();
}
async function removeEditItem(kind, id){
  const arr = editListFor(kind);
  const i = arr.findIndex(x => x.id === id);
  if (i >= 0) arr.splice(i, 1);
  await saveState(); renderAll();
}

document.addEventListener("change", (e) => {
  const cb = e.target.closest(".edit-check");
  if (cb) toggleEditItem(cb.getAttribute("data-kind"), cb.getAttribute("data-id"), cb.checked);
});
document.addEventListener("click", (e) => {
  const rm = e.target.closest(".edit-remove");
  if (rm) removeEditItem(rm.getAttribute("data-kind"), rm.getAttribute("data-id"));
});
["pending","shopping"].forEach(kind => {
  const btn = document.getElementById(kind + "-add-btn");
  const input = document.getElementById(kind + "-add-input");
  if (btn && input){
    btn.addEventListener("click", () => { addEditItem(kind, input.value); input.value = ""; input.focus(); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter"){ e.preventDefault(); btn.click(); } });
  }
});

document.getElementById("add-name-btn").addEventListener("click", async () => {
  const input = document.getElementById("new-name");
  const name = input.value.trim();
  if (!name) return;
  if (!state.roster.includes(name)) state.roster.push(name);
  input.value = "";
  myName = name;
  await saveMyName();
  await saveState();
  renderAll();
});
document.getElementById("new-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("add-name-btn").click();
});

document.getElementById("reset-daily-btn").addEventListener("click", async () => {
  if (!confirm("Clear this week's daily check-offs? (Day-of-week assignments stay as-is.)")) return;
  allTaskIds().forEach(id => {
    const meta = taskMeta(id);
    if (meta && meta.freq === "daily") clearMarks(ensureTask(id));
  });
  await saveState();
  renderAll();
});
document.getElementById("reset-all-btn").addEventListener("click", async () => {
  if (!confirm("Clear this week's daily check-offs and reset every every-other-day, weekly, and monthly claim? Daily day-of-week assignments, one-time/pending items, and as-needed items are left as-is.")) return;
  allTaskIds().forEach(id => {
    const meta = taskMeta(id);
    if (!meta || meta.freq === "onetime" || meta.freq === "as_needed") return;
    if (meta.freq === "daily"){
      clearMarks(ensureTask(id));
    } else {
      state.tasks[id] = { claimedBy: null, done: false };
    }
  });
  await saveState();
  renderAll();
});

// --- Bedrooms & storage spaces (per-room tabs) ---
// Note: trash, whole-house vacuuming, and switches/handles/baseboards are left out here
// since they're already covered by the Trash, Floors, and General zones above.
const ROOM_IDS = ["lynx", "andry_moxxie", "closet_moxxie"];
const ROOM_TASKS = {
  lynx: {
    daily: [
      ["make_bed", "Make the bed", "light"],
      ["clear_surfaces", "Clear nightstand & dresser \u2014 stray items back where they belong", "light"],
      ["hamper", "Dirty clothes into the hamper, not the floor", "light"],
      ["floor_scan", "Quick floor scan \u2014 pick up anything left out", "light"],
      ["tidy_makeup", "Tidy up the makeup table", "light"],
    ],
    weekly: [
      ["laundry", "Wash a load and put it away \u2014 folded/hung, not left in the basket", "moderate"],
      ["dust", "Dust surfaces: dresser, nightstand, shelves", "light"],
      ["mirror", "Wipe down the mirror & any glass surfaces", "light"],
      ["closet", "Straighten the closet \u2014 hang up anything stray", "moderate"],
      ["bedding", "Wash all bedding \u2014 sheets, pillowcases, blanket", "moderate"],
      ["clean_altar", "Clean the altar", "light"],
      ["repile_squish", "Re-pile the squishmallow pile", "light"],
    ],
    monthly: [
      ["under_bed", "Clean out under the bed", "moderate"],
      ["declutter", "Declutter one drawer, shelf, or surface \u2014 rotate which one each month", "moderate"],
      ["mattress", "Vacuum the mattress", "moderate"],
      ["windows", "Clean windows & window sills", "moderate"],
      ["donate_pass", "Donate/toss pass \u2014 anything untouched in months", "heavy"],
    ],
  },
  andry_moxxie: {
    daily: [
      ["make_bed", "Air out the bed \u2014 blankets pulled back, not made", "light"],
      ["clear_surfaces", "Clear nightstand & dresser \u2014 stray items back where they belong", "light"],
      ["hamper", "Dirty clothes into the hamper, not the floor", "light"],
      ["clean_laundry_away", "Put clean laundry (clothes & towels) away in its spot \u2014 not on the bed or the hanging chair", "light"],
      ["floor_scan", "Quick floor scan \u2014 pick up anything left out", "light"],
    ],
    weekly: [
      ["laundry", "Wash, dry & put away the shared towels", "light"],
      ["dust", "Dust surfaces: dresser, nightstand, shelves", "light"],
      ["closet", "Straighten the closet \u2014 hang up anything stray", "moderate"],
      ["bedding", "Change the sheets & top blanket", "moderate"],
      ["remake_squish", "Remake the squishmallow pile", "light"],
    ],
    monthly: [
      ["bedding_full", "Full bedding wash \u2014 sheets, blanket & the topper", "moderate"],
      ["under_bed", "Clean out under the bed", "moderate"],
      ["declutter", "Declutter one drawer, shelf, or surface \u2014 rotate which one each month", "moderate"],
      ["mattress", "Vacuum the mattress", "moderate"],
      ["windows", "Clean windows & window sills", "moderate"],
      ["donate_pass", "Donate/toss pass \u2014 anything untouched in months", "heavy"],
    ],
  },
  closet_moxxie: {
    daily: [
      ["clear_floor", "Clear the floor \u2014 nothing left sitting on it", "light"],
      ["hamper_or_hang", "Worn clothes into the hamper or back on a hanger \u2014 not draped over things", "light"],
      ["quick_shelve", "Quick scan \u2014 anything grabbed today back on its shelf or hook", "light"],
    ],
    weekly: [
      ["fold_put_away", "Fold & put away clean laundry \u2014 nothing left sitting in a basket", "moderate"],
      ["straighten_shelves", "Straighten shelves & hanging rods \u2014 everything back in its spot", "moderate"],
      ["dust_shelves", "Dust shelves & surfaces", "light"],
      ["sweep_floor", "Sweep or vacuum the closet floor", "light"],
    ],
    monthly: [
      ["declutter_pass", "Full declutter pass \u2014 rotate through one shelf or bin at a time", "moderate"],
      ["donate_pass", "Donate/toss pass \u2014 anything unused in months", "heavy"],
      ["seasonal_check", "Check stored/seasonal items for anything that needs washing before it goes back", "light"],
      ["wipe_bins", "Wipe down shelves & storage bins", "light"],
    ],
  },
};

let bedState = {};
ROOM_IDS.forEach(id => { bedState[id] = { daily:{}, weekly:{}, monthly:{} }; });

function bedKey(roomId){ return `bedroom-${roomId}-v1`; }

async function bedLoadState(){
  for (const roomId of ROOM_IDS){
    try{
      const res = await window.storage.get(bedKey(roomId), true);
      if (res && res.value){
        const parsed = JSON.parse(res.value);
        bedState[roomId] = { daily: parsed.daily||{}, weekly: parsed.weekly||{}, monthly: parsed.monthly||{} };
      }
    } catch(e){ /* no saved state yet */ }
  }
}
async function bedSaveState(roomId){
  try{ await window.storage.set(bedKey(roomId), JSON.stringify(bedState[roomId]), true); } catch(e){ console.error("Save failed", e); }
}
// Shared spaces run on a day-of-week rotation across every section, so you can see
// who took which day and tick it off. Lynx's room is one person's, so it stays on
// plain checkboxes.
const BED_ASSIGNABLE_ROOMS = ["andry_moxxie", "closet_moxxie"];
const BED_ROOM_LABELS = {
  lynx: "Lynx Bedroom",
  andry_moxxie: "Andry & Moxxie Bedroom",
  closet_moxxie: "Moxxie Closet",
};
function bedRotates(roomId){ return BED_ASSIGNABLE_ROOMS.includes(roomId); }
function ensureBedTask(roomId, freq, id){
  let t = bedState[roomId][freq][id];
  if (!t || typeof t !== "object"){
    t = { done: !!t };
    bedState[roomId][freq][id] = t;
  }
  if (bedRotates(roomId)){
    if (!t.schedule){ t.schedule = {}; DAYS.forEach(d => { t.schedule[d] = null; }); }
    if (!t.doneDays){ t.doneDays = {}; DAYS.forEach(d => { t.doneDays[d] = false; }); }
    if (!t.doneDates){ t.doneDates = {}; DAYS.forEach(d => { t.doneDates[d] = null; }); }
  }
  return t;
}
// Whether the task reads as done right now. On a rotating room a daily task is
// judged by today's bubble, while weekly/monthly count as done once any day has
// been ticked inside the current week or month.
function bedTaskDone(roomId, freq, t){
  if (!bedRotates(roomId)) return freq === "daily" ? dailyDone(t) : !!t.done;
  if (freq === "daily") return dayDone(t, todayName(), freq);
  return DAYS.some(d => dayDone(t, d, freq));
}
// The day whose ✓ is currently standing, for the "done Wed by Moxxie" badge.
function bedDoneDay(t, freq){ return DAYS.find(d => dayDone(t, d, freq)) || null; }
function bedDayCellsHtml(roomId, freq, id, label, t){
  return DAYS.map(d => {
    const name = t.schedule ? t.schedule[d] : null;
    const isToday = d === todayName();
    const color = name ? colorFor(name) : null;
    const style = color ? ` style="background:${color.bg}; color:${color.fg}; border-color:${color.bg};"` : "";
    const isMine = myName && name === myName;
    const disabledAttr = myName ? "" : " disabled";
    let title;
    if (!myName) title = "Set who you are on the Household Board tab first";
    else if (isMine) title = `${d}: assigned to ${myName} — click to unassign`;
    else if (name) title = `${d}: ${name} — click to take this day for ${myName}`;
    else title = `${d}: unassigned — click to take this day for ${myName}`;
    const display = name ? initialsOf(name) : d[0];
    const isDone = dayDone(t, d, freq);
    const bubble = `<button type="button" class="day-bubble${isToday?' today':''}${name?' assigned':''}${isMine?' mine':''}${isDone?' day-complete':''}"${disabledAttr} data-bedroom="${roomId}" data-bedfreq="${freq}" data-bedtaskid="${id}" data-day="${d}"${style} title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(display)}</button>`;
    // The ✓ only appears once someone has taken the day — that's what makes it a
    // record of who did it rather than just that it happened.
    if (!name) return `<span class="day-cell">${bubble}</span>`;
    const tickTitle = isDone
      ? `${d}: done by ${name} — click to un-check`
      : `${d}: mark done for ${name}`;
    const tick = `<button type="button" class="day-done${isDone?'':' pending'}" data-beddone="${roomId}" data-bedfreq="${freq}" data-bedtaskid="${id}" data-day="${d}" title="${escapeHtml(tickTitle)}" aria-label="${escapeHtml(tickTitle)}" aria-pressed="${isDone?'true':'false'}">✓</button>`;
    return `<span class="day-cell">${bubble}${tick}</span>`;
  }).join("");
}
// Sits under the task name: who's on today for dailies, and for weekly/monthly
// whether it's been done yet in the current week or month.
function bedBadgeHtml(freq, t){
  if (freq === "daily"){
    const who = t.schedule ? t.schedule[todayName()] : null;
    return `<span class="today-badge${who?"":" unassigned"}">${who ? `Today: ${escapeHtml(who)}` : "Today: unassigned"}</span>`;
  }
  const doneDay = bedDoneDay(t, freq);
  if (doneDay){
    const who = t.schedule && t.schedule[doneDay];
    return `<span class="today-badge">${who ? `Done ${doneDay} · ${escapeHtml(who)}` : `Done ${doneDay}`}</span>`;
  }
  const period = freq === "weekly" ? "week" : "month";
  const taken = t.schedule ? DAYS.filter(d => t.schedule[d]) : [];
  return `<span class="today-badge unassigned">${taken.length ? `Planned ${escapeHtml(taken.join(", "))} — not done this ${period}` : `Unassigned this ${period}`}</span>`;
}
function bedRenderSection(roomId, freq){
  const body = document.querySelector(`[data-bedbody="${roomId}-${freq}"]`);
  if (!body) return;
  const tasks = ROOM_TASKS[roomId];
  if (!tasks) return;
  body.innerHTML = "";
  tasks[freq].forEach(([id, label, tier]) => {
    const t = ensureBedTask(roomId, freq, id);
    const row = document.createElement("div");
    if (bedRotates(roomId)){
      row.className = "task-row" + (bedTaskDone(roomId, freq, t) ? " done" : "");
      row.innerHTML = `
        <span class="tier-tag ${tier}">${TIER[tier].label}</span>
        <span class="task-main">
          <span class="task-label">${escapeHtml(label)}</span>
          ${bedBadgeHtml(freq, t)}
        </span>
        <div class="day-row" role="group" aria-label="Assign days for '${escapeHtml(label)}'">
          ${bedDayCellsHtml(roomId, freq, id, label, t)}
        </div>
      `;
    } else {
      const isDone = bedTaskDone(roomId, freq, t);
      row.className = "task-row" + (isDone ? " done" : "");
      row.innerHTML = `
        <input type="checkbox" class="task-check" ${isDone?"checked":""} aria-label="Mark '${escapeHtml(label)}' done" data-bedperson="${roomId}" data-bedsection="${freq}" data-bedid="${id}">
        <span class="tier-tag ${tier}">${TIER[tier].label}</span>
        <span class="task-label">${escapeHtml(label)}</span>
      `;
    }
    body.appendChild(row);
  });
}
function bedRenderProgress(roomId){
  const tasks = ROOM_TASKS[roomId];
  if (!tasks) return;
  let doneCount = 0, total = 0;
  Object.entries(tasks).forEach(([freq, items]) => {
    items.forEach(([id]) => {
      total++;
      if (bedTaskDone(roomId, freq, ensureBedTask(roomId, freq, id))) doneCount++;
    });
  });
  const el = document.getElementById(`bed-progress-${roomId}`);
  if (el) el.textContent = `${doneCount} of ${total} checked across all sections`;
}
function bedRenderAll(){
  const _y = window.scrollY;
  ROOM_IDS.forEach(roomId => {
    ["daily","weekly","monthly"].forEach(freq => bedRenderSection(roomId, freq));
    bedRenderProgress(roomId);
  });
  renderMyChores();
  if (window.scrollY !== _y) window.scrollTo(0, _y);
}
document.addEventListener("change", async (e) => {
  const el = e.target;
  if (el.matches(".task-check[data-bedperson]")){
    const roomId = el.getAttribute("data-bedperson");
    const freq = el.getAttribute("data-bedsection");
    const id = el.getAttribute("data-bedid");
    const t = ensureBedTask(roomId, freq, id);
    if (freq === "daily") setDailyDone(t, el.checked); else t.done = el.checked;
    await bedSaveState(roomId);
    bedRenderAll();
    return;
  }
});
document.addEventListener("click", async (e) => {
  const resetBtn = e.target.closest("[data-bedreset]");
  if (resetBtn){
    const roomId = resetBtn.getAttribute("data-bedperson");
    const freq = resetBtn.getAttribute("data-bedreset");
    if (!confirm(`Clear ${freq} checkmarks for this space? (Who/day assignments stay as-is.)`)) return;
    ROOM_TASKS[roomId][freq].forEach(([id]) => {
      clearMarks(ensureBedTask(roomId, freq, id));
    });
    await bedSaveState(roomId);
    bedRenderAll();
    return;
  }
  const doneTick = e.target.closest(".day-done[data-beddone]");
  if (doneTick){
    const roomId = doneTick.getAttribute("data-beddone");
    const freq = doneTick.getAttribute("data-bedfreq");
    const id = doneTick.getAttribute("data-bedtaskid");
    const day = doneTick.getAttribute("data-day");
    const t = ensureBedTask(roomId, freq, id);
    setDayDone(t, day, !dayDone(t, day, freq), freq);
    await bedSaveState(roomId);
    bedRenderAll();
    return;
  }
  const dayBubble = e.target.closest(".day-bubble[data-bedroom]");
  if (dayBubble){
    if (!myName) return;
    const roomId = dayBubble.getAttribute("data-bedroom");
    const freq = dayBubble.getAttribute("data-bedfreq");
    const id = dayBubble.getAttribute("data-bedtaskid");
    const day = dayBubble.getAttribute("data-day");
    const t = ensureBedTask(roomId, freq, id);
    // Releasing a day drops its ✓ too — an unassigned day has nobody to credit.
    const taking = t.schedule[day] !== myName;
    t.schedule[day] = taking ? myName : null;
    if (!taking) setDayDone(t, day, false, freq);
    await bedSaveState(roomId);
    bedRenderAll();
    return;
  }
});

// --- My Chores (summary of everything assigned to the current "I am") ---
function computeMyChores(){
  const today = [], week = [], month = [];
  if (!myName) return { today, week, month };

  allTaskIds().forEach(id => {
    const meta = taskMeta(id);
    if (!meta) return;
    const t = state.tasks[id];
    if (!t) return;
    const ref = { kind: "board", id };
    if (meta.freq === "daily"){
      const td = todayName();
      if (t.schedule && t.schedule[td] === myName) today.push({ label: meta.label, source: meta.zone.name, ref: { kind: "board", id, day: td }, done: dayDone(t, td, "daily") });
      const myDays = t.schedule ? DAYS.filter(d => t.schedule[d] === myName) : [];
      if (myDays.length) week.push({ label: meta.label, source: meta.zone.name, days: myDays });
    } else if (meta.freq === "eod"){
      if (t.claimedBy === myName) week.push({ label: meta.label, source: meta.zone.name, note: "every other day", ref, done: !!t.done });
    } else if (meta.freq === "weekly"){
      if (t.claimedBy === myName) week.push({ label: meta.label, source: meta.zone.name, ref, done: !!t.done });
    } else if (meta.freq === "monthly"){
      if (t.claimedBy === myName) month.push({ label: meta.label, source: meta.zone.name, ref, done: !!t.done });
    }
  });

  // Rotating rooms: every section is day-assigned, so pull in whichever days are mine.
  BED_ASSIGNABLE_ROOMS.forEach(roomId => {
    const source = BED_ROOM_LABELS[roomId] || roomId;
    ["daily","weekly","monthly"].forEach(freq => {
      ROOM_TASKS[roomId][freq].forEach(([id, label]) => {
        const t = ensureBedTask(roomId, freq, id);
        const myDays = t.schedule ? DAYS.filter(d => t.schedule[d] === myName) : [];
        if (!myDays.length) return;
        if (freq === "daily"){
          const td = todayName();
          if (t.schedule[td] === myName){
            today.push({ label, source, ref: { kind: "bed", roomId, freq, id, day: td }, done: dayDone(t, td, freq) });
          }
          week.push({ label, source, days: myDays });
        } else {
          // Ticking here marks the first day I took; the room tab can credit a specific day.
          const bucket = freq === "weekly" ? week : month;
          bucket.push({ label, source, days: myDays, ref: { kind: "bed", roomId, freq, id, day: myDays[0] }, done: bedTaskDone(roomId, freq, t) });
        }
      });
    });
  });

  if (laundryState.schedule[todayName()] === myName) today.push({ label: "Laundry", source: "Laundry" });
  const laundryDays = DAYS.filter(d => laundryState.schedule[d] === myName);
  if (laundryDays.length) week.push({ label: "Laundry", source: "Laundry", days: laundryDays });

  return { today, week, month };
}
function mychoresListHtml(items, emptyText){
  if (!items.length) return `<p class="panel-sub">${escapeHtml(emptyText)}</p>`;
  return `<ul class="mychores-list">` + items.map(it => {
    const note = it.days ? ` <span class="mychores-days">(${escapeHtml(it.days.join(", "))})</span>`
      : (it.note ? ` <span class="mychores-days">(${escapeHtml(it.note)})</span>` : "");
    const check = it.ref
      ? `<input type="checkbox" class="mychores-check" ${it.done ? "checked" : ""} data-refkind="${it.ref.kind}" data-id="${escapeHtml(it.ref.id)}"${it.ref.roomId ? ` data-room="${escapeHtml(it.ref.roomId)}" data-freq="${escapeHtml(it.ref.freq)}"` : ""}${it.ref.day ? ` data-day="${escapeHtml(it.ref.day)}"` : ""} aria-label="Mark done">`
      : `<span class="mychores-nocheck"></span>`;
    return `<li class="mychores-item${it.done ? " done" : ""}">${check}<span class="mychores-label">${escapeHtml(it.label)}</span><span class="mychores-source">${escapeHtml(it.source)}</span>${note}</li>`;
  }).join("") + `</ul>`;
}
// Crossing off in My Chores toggles the underlying task's done and reflects everywhere.
document.addEventListener("change", (e) => {
  const cb = e.target.closest(".mychores-check");
  if (!cb) return;
  const kind = cb.getAttribute("data-refkind");
  const day = cb.getAttribute("data-day");
  if (kind === "board"){
    const t = ensureTask(cb.getAttribute("data-id"));
    if (day) setDayDone(t, day, cb.checked, "daily"); else t.done = cb.checked;
    saveState();
  } else if (kind === "bed"){
    const room = cb.getAttribute("data-room"), freq = cb.getAttribute("data-freq"), id = cb.getAttribute("data-id");
    const t = ensureBedTask(room, freq, id);
    if (day) setDayDone(t, day, cb.checked, freq);
    else if (freq === "daily") setDailyDone(t, cb.checked);
    else t.done = cb.checked;
    bedSaveState(room);
  }
  renderAll(); bedRenderAll();
});
function renderMyChores(){
  const panel = document.getElementById("mychores-content");
  if (!panel) return;
  if (!myName){
    panel.innerHTML = `<section class="panel"><p class="panel-sub">Set who you are on the Household Board tab to see your chores here.</p></section>`;
    return;
  }
  const { today, week, month } = computeMyChores();
  panel.innerHTML = `
    <section class="panel">
      <h2>Today</h2>
      ${mychoresListHtml(today, "Nothing assigned to you today.")}
    </section>
    <section class="panel">
      <h2>This Week</h2>
      ${mychoresListHtml(week, "Nothing assigned to you this week.")}
    </section>
    <section class="panel">
      <h2>This Month</h2>
      ${mychoresListHtml(month, "Nothing assigned to you this month.")}
    </section>
  `;
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected","false"); });
    btn.classList.add("active"); btn.setAttribute("aria-selected","true");
    document.querySelectorAll(".tab-panel").forEach(p => p.setAttribute("hidden",""));
    document.querySelector(`.tab-panel[data-tabpanel="${btn.getAttribute("data-tab")}"]`).removeAttribute("hidden");
  });
});

// --- Laundry (weekly day-of-week rotation, shared washer/dryer loads) ---
const LAUNDRY_STORAGE_KEY = "laundry-schedule-v1";
let laundryState = { schedule: {} };
DAYS.forEach(d => { laundryState.schedule[d] = null; });

async function laundryLoadState(){
  try{
    const res = await window.storage.get(LAUNDRY_STORAGE_KEY, true);
    if (res && res.value){
      const parsed = JSON.parse(res.value);
      laundryState.schedule = parsed.schedule || {};
      DAYS.forEach(d => { if (!(d in laundryState.schedule)) laundryState.schedule[d] = null; });
    }
  } catch(e){ /* no saved state yet */ }
}
async function laundrySaveState(){
  try{ await window.storage.set(LAUNDRY_STORAGE_KEY, JSON.stringify(laundryState), true); } catch(e){ console.error("Save failed", e); }
}
function laundryChartHtml(){
  return DAYS.map(d => {
    const name = laundryState.schedule[d];
    const isToday = d === todayName();
    const color = name ? colorFor(name) : null;
    const style = color ? ` style="background:${color.bg}; color:${color.fg}; border-color:${color.bg};"` : "";
    const isMine = myName && name === myName;
    const disabledAttr = myName ? "" : " disabled";
    let title;
    if (!myName) title = "Set who you are on the Household Board tab first";
    else if (isMine) title = `${d}: assigned to ${myName} — click to unassign`;
    else if (name) title = `${d}: ${name} — click to take laundry for ${myName}`;
    else title = `${d}: unassigned — click to take laundry for ${myName}`;
    return `<button type="button" class="laundry-day${isToday?' today':''}${name?' assigned':''}"${disabledAttr} data-laundryday="${d}"${style} title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
      <span class="laundry-day-label">${d}</span>
      <span class="laundry-day-name${name?"":" empty"}">${name ? escapeHtml(name) : "Open"}</span>
    </button>`;
  }).join("");
}
function laundryRenderAll(){
  const chart = document.getElementById("laundry-chart");
  if (!chart) return;
  chart.innerHTML = laundryChartHtml();
  renderMyChores();
}
document.addEventListener("click", async (e) => {
  const cell = e.target.closest(".laundry-day[data-laundryday]");
  if (!cell || !myName) return;
  const day = cell.getAttribute("data-laundryday");
  laundryState.schedule[day] = (laundryState.schedule[day] === myName) ? null : myName;
  await laundrySaveState();
  laundryRenderAll();
});

// Renamed from a self-invoking IIFE: storage.js calls init() after a successful login.
async function init(){
  await loadState();
  allTaskIds().forEach(ensureTask);
  renderAll();
  await bedLoadState();
  bedRenderAll();
  await laundryLoadState();
  laundryRenderAll();
  watchDayRollover();
}
// Phones and tablets tend to leave this tab open for days. Without this, a device
// that was already open when the day turned over at 5am keeps showing yesterday's
// check-offs until someone reloads it.
function watchDayRollover(){
  let lastSeen = todayISO();
  setInterval(() => {
    const now = todayISO();
    if (now === lastSeen) return;
    lastSeen = now;
    renderAll(); bedRenderAll(); laundryRenderAll();
  }, 60 * 1000);
}
window.init = init;
