// storage.js — replaces the Claude-artifact `window.storage` with a Supabase-backed
// implementation, adds the shared-login gate, and keeps devices in sync via realtime.
//
// Contract preserved exactly so app.js is untouched:
//   window.storage.get(key, shared) -> { value: "<string>" } | null
//   window.storage.set(key, value, shared) -> void
// shared === true  -> Supabase `kv` table (synced across the household)
// shared === false -> browser localStorage (the per-device "I am" name)
//
// Load order (see index.html): supabase-js, config.js, app.js, then this file.
(function () {
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.sb = sb;

  // Last value THIS device wrote for each key. Used to ignore the realtime
  // "echo" of our own changes — without this, every click triggers a full
  // reload (desktop lag) and can race the write on mobile, reverting the
  // assignment you just made.
  const localWrites = new Map();

  // ---- storage shim -------------------------------------------------------
  window.storage = {
    async get(key, shared) {
      if (!shared) {
        const v = localStorage.getItem(key);
        return v == null ? null : { value: v };
      }
      const { data, error } = await sb
        .from("kv").select("value").eq("key", key).maybeSingle();
      if (error) { console.error("storage.get failed:", key, error.message); return null; }
      return data ? { value: data.value } : null;
    },
    // Fire-and-forget: resolves immediately so the UI updates without waiting
    // on the network round-trip. The write still goes out; errors are logged.
    // Last-write-wins, exactly as the prototype behaved.
    async set(key, value, shared) {
      if (!shared) { localStorage.setItem(key, value); return; }
      localWrites.set(key, value);
      sb.from("kv")
        .upsert({ key, value, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error("storage.set failed:", key, error.message); });
    }
  };

  // ---- login gate ---------------------------------------------------------
  const gate = document.getElementById("login-gate");
  const form = document.getElementById("login-form");
  const emailEl = document.getElementById("login-email");
  const passEl = document.getElementById("login-pass");
  const errEl = document.getElementById("login-error");

  function showError(msg) { errEl.textContent = msg; errEl.hidden = false; }

  let started = false;
  async function startApp() {
    if (started) return;            // init() must run only once
    started = true;
    gate.hidden = true;
    await window.init();            // defined in app.js
    subscribeRealtime();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.hidden = true;
    const { error } = await sb.auth.signInWithPassword({
      email: emailEl.value.trim(),
      password: passEl.value
    });
    if (error) { showError(error.message || "Sign-in failed."); return; }
    startApp();
  });

  // ---- realtime sync ------------------------------------------------------
  // Reload only the state group that actually changed, and only when the
  // change came from ANOTHER device (our own writes are already reflected
  // in memory, so their echoes are ignored).
  const pending = new Set();
  let timer;
  function subscribeRealtime() {
    sb.channel("kv-sync")
      .on("postgres_changes",
          { event: "*", schema: "public", table: "kv" },
          (payload) => {
            const isEcho = payload.new && localWrites.get(payload.new.key) === payload.new.value;
            if (isEcho) return;                       // our own change — skip
            const row = (payload.new && payload.new.key) ? payload.new : payload.old;
            if (!row || !row.key) return;
            pending.add(row.key);
            clearTimeout(timer);
            timer = setTimeout(flushReload, 200);
          })
      .subscribe();
  }
  async function flushReload() {
    const keys = [...pending]; pending.clear();
    try {
      if (keys.includes(STORAGE_KEY))               { await loadState();        renderAll(); }
      if (keys.some(k => k.startsWith("bedroom-")))  { await bedLoadState();     bedRenderAll(); }
      if (keys.includes(LAUNDRY_STORAGE_KEY))       { await laundryLoadState(); laundryRenderAll(); }
    } catch (e) { console.error("realtime reload failed:", e); }
  }

  // ---- boot: skip the gate if this device already has a session -----------
  (async function boot() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) startApp(); else gate.hidden = false;
  })();
})();
