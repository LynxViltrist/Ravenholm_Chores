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
    async set(key, value, shared) {
      if (!shared) { localStorage.setItem(key, value); return; }
      const { error } = await sb.from("kv")
        .upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) console.error("storage.set failed:", key, error.message);
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
  // When anyone changes a shared key, reload the three state groups and re-render.
  // Data is a few KB, so reloading all of it on any change is simple and safe.
  let syncTimer;
  function subscribeRealtime() {
    sb.channel("kv-sync")
      .on("postgres_changes",
          { event: "*", schema: "public", table: "kv" },
          () => { clearTimeout(syncTimer); syncTimer = setTimeout(reloadEverything, 300); })
      .subscribe();
  }
  async function reloadEverything() {
    try {
      await loadState();        renderAll();
      await bedLoadState();     bedRenderAll();
      await laundryLoadState(); laundryRenderAll();
    } catch (e) { console.error("realtime reload failed:", e); }
  }

  // ---- boot: skip the gate if this device already has a session -----------
  (async function boot() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) startApp(); else gate.hidden = false;
  })();
})();
