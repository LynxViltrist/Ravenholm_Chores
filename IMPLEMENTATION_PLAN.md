# Household Chore Board — Implementation Plan

**Stack:** static frontend on **GitHub Pages** + shared state in **Supabase** (hosted Postgres).
**Cost:** $0/month at this scale, permanently.
**Access:** reachable from any device, anywhere, over HTTPS, behind a shared household login.
**Deploy/update workflow:** `git push` → GitHub Pages redeploys. Data lives in Supabase, separate from code, so deploys never wipe it.

---

## 1. Guiding principle: change the two storage methods, nothing else

The entire prototype persists through exactly two calls:

```js
window.storage.get(key, shared)          // -> { value: "<json string>" } | null
window.storage.set(key, value, shared)   // -> void
```

across a handful of keys:

| Key | Scope | Holds |
|---|---|---|
| `chore-board-v2` | shared | roster + all household board task state |
| `bedroom-<roomId>-v1` | shared | each bedroom/closet tab's task state |
| `laundry-schedule-v1` | shared | the 7-day laundry rotation |
| `my-name` | **personal** | the "I am ___" selection (stays per-device) |

Total data: a few KB of JSON. So we **reimplement only `window.storage`** — a ~30-line shim — and leave all tested logic (`renderAll`, `bedRenderAll`, `laundryRenderAll`, `ZONES`, `ensureTask`, day-bubbles, My Chores aggregation) byte-for-byte intact.

- `shared: true` keys → Supabase `kv` table.
- `shared: false` (`my-name`) → stays in browser `localStorage`. This is correct: identity is intentionally per-device.

---

## 2. Architecture

```
        ┌─────────────────────────────┐
        │  GitHub Pages (static site) │   the app shell: HTML/CSS/JS + image
        │  https://<user>.github.io/… │   same for everyone; push to deploy
        └──────────────┬──────────────┘
                       │  browser loads supabase-js from CDN
                       ▼
        ┌─────────────────────────────┐
        │  Supabase (free project)    │
        │  • Auth: 1 shared login     │   household passphrase = this user's password
        │  • Postgres: `kv` table     │   the shared board/bedroom/laundry state
        │  • Realtime on `kv`         │   other people's changes appear live
        └─────────────────────────────┘
```

- **No backend code we run.** The browser talks to Supabase directly via its client library. Supabase *is* the server.
- **Privacy / "no public exposure":** the site shell is public, but the data is behind a **real login** (a single shared Supabase Auth user). Row-Level Security blocks all anonymous reads/writes, so knowing the URL isn't enough — you need the shared passphrase. Per-person accounts are deliberately *not* built; the lightweight "I am" selector stays the identity model, consistent with the design docs.

---

## 3. Repository layout (this repo)

Split the 7 MB single-file prototype into cacheable static files:

```
/ (repo root — served by GitHub Pages)
  index.html              # markup + <script> tags in load order
  styles.css              # extracted from the prototype <style> block
  app.js                  # the prototype JS, unchanged logic (init gated by auth)
  storage.js              # NEW: window.storage shim + auth gate + realtime
  config.js               # NEW: Supabase URL + anon key (public-safe, committed)
  assets/
    forest.jpg            # the mushroom background, as a real file (not base64)
  .github/workflows/
    keepalive.yml         # daily ping so the free Supabase project never pauses
  IMPLEMENTATION_PLAN.md  # this file
  README.md
```

**Load order in `index.html`** (classic scripts, no build step):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="config.js"></script>   <!-- SUPABASE_URL, SUPABASE_ANON_KEY -->
<script src="storage.js"></script>  <!-- creates window.storage + handles login -->
<script src="app.js"></script>      <!-- defines init(); storage.js calls it post-login -->
```

Using the **UMD build** of supabase-js (global `supabase`) keeps `app.js` a plain classic script — no ES-module scope changes, lowest-risk port. The 7 MB base64 image drops out; the page becomes ~30 KB + one cached image.

**Nothing secret is committed.** The anon key is designed to be public (RLS protects the data). The household passphrase is *never* in the repo — it's typed into the login screen at runtime.

---

## 4. Supabase setup (one-time, in the Supabase dashboard)

### 4.1 Create the project
1. Create a Supabase account and a new project (free tier). Pick a region near you.
2. From **Project Settings → API**, copy the **Project URL** and the **anon public** key. These go in `config.js`. (Do **not** use or commit the `service_role` key.)

### 4.2 Create the table + security (SQL Editor → run once)

```sql
-- one generic key/value table, mirrors the prototype's storage contract
create table public.kv (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

-- lock it down: no anonymous access
alter table public.kv enable row level security;

-- only a logged-in (shared household) session can read/write
create policy "household read"  on public.kv for select to authenticated using (true);
create policy "household write" on public.kv for insert to authenticated with check (true);
create policy "household update" on public.kv for update to authenticated using (true) with check (true);

-- deliver live changes to logged-in clients
alter publication supabase_realtime add table public.kv;
```

### 4.3 Create the single shared login
1. **Authentication → Providers → Email:** enable email login, and **disable "Allow new users to sign up"** (so nobody can self-register).
2. **Authentication → Users → Add user:** create one user, e.g. `household@ravenholm.local`, with a password = the shared passphrase. Mark it auto-confirmed.
3. Everyone in the household signs in on their device with that one email + passphrase. The session persists locally, so it's a one-time login per device.

> This is the "simple password gate" from the design notes, done properly: the gate is enforced by Postgres RLS, not just hidden in the client.

---

## 5. The storage shim + auth gate (`storage.js`)

```js
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- storage shim: exact same contract the prototype expects ---
window.storage = {
  async get(key, shared) {
    if (!shared) {                                   // personal → localStorage
      const v = localStorage.getItem(key);
      return v == null ? null : { value: v };
    }
    const { data, error } = await sb
      .from('kv').select('value').eq('key', key).maybeSingle();
    if (error) { console.error(error); return null; }
    return data ? { value: data.value } : null;
  },
  async set(key, value, shared) {
    if (!shared) { localStorage.setItem(key, value); return; }
    const { error } = await sb.from('kv')
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) console.error(error);
  }
};

// --- auth gate: show login until a valid session exists, then start the app ---
async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) { hideLogin(); init(); subscribeRealtime(); }   // init() is defined in app.js
  else showLogin();
}

async function doLogin(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { showLoginError(error.message); return; }
  hideLogin(); init(); subscribeRealtime();
}

// --- realtime: when anyone changes a shared key, reload + re-render ---
let syncTimer;
function subscribeRealtime() {
  sb.channel('kv-sync')
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'kv' },
        () => {                       // debounce; data is tiny, just reload all groups
          clearTimeout(syncTimer);
          syncTimer = setTimeout(reloadEverything, 250);
        })
    .subscribe();
}

async function reloadEverything() {
  await loadState();        renderAll();          // board
  await bedLoadState();     bedRenderAll();       // bedrooms/closet
  await laundryLoadState(); laundryRenderAll();   // laundry
}
```

**One small edit to `app.js`:** the prototype's trailing `(async function init(){ … })()` IIFE becomes a named `async function init(){ … }` that is *not* self-invoked — `storage.js` calls `init()` after login instead. That's the only structural change to the ported logic.

**Login UI:** a small parchment card overlay (email + passphrase + "Enter") styled with the existing design tokens. Session persists, so it appears once per device.

---

## 6. Deploy to GitHub Pages

1. Push the files to `main` in this repo.
2. **Repo → Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/ (root)` → Save.**
3. GitHub serves it at `https://<username>.github.io/<repo>/` within a minute. Every later `git push` to `main` redeploys automatically — no Actions, no build step.

### Keep-alive (`.github/workflows/keepalive.yml`)
Free Supabase projects pause after ~7 days of *zero* activity. A daily-used board won't hit that, but this makes it a non-issue:

```yaml
name: keepalive
on:
  schedule: [{ cron: "17 9 * * *" }]   # once a day
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -sS "$SUPABASE_URL/rest/v1/kv?select=key&limit=1" \
            -H "apikey: $SUPABASE_ANON_KEY" -o /dev/null
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

(Store the two values as repo **Actions secrets**. They're public-safe anyway; secrets just keep the YAML clean.)

---

## 7. Verification (do this explicitly — the design notes insist)

1. **Cross-device sync:** open the site on two devices, log in on both. Claim a task / tap a day bubble on device A → it appears on device B within a second or two without a manual refresh. This is the single most important check; the previous `localStorage` rebuild silently failed exactly here.
2. **Auth gate:** open the site in a private window with no session → you see the login screen and cannot read data. Confirm the raw Supabase REST endpoint rejects anonymous reads (RLS working).
3. **Persistence across deploy:** make a claim, push a trivial code change (redeploy), reload → the claim is still there (data lives in Supabase, not the deploy).
4. **`my-name` stays local:** set "I am" on device A; device B is unaffected. Correct — identity is per-device.
5. **Accessibility carry-over:** native checkboxes/`<select>`, 44px touch targets, tier conveyed by label+color (not color alone), `prefers-reduced-motion`, visible focus — all preserved from the prototype.

---

## 8. Data safety & operations

- **Backups:** data is a few KB. Supabase's dashboard can export, and we can add a one-click "Export board as JSON" admin button as a belt-and-suspenders download. Reconstructing by hand is also trivial (3 names + re-claims).
- **No migration from the prototype:** the old data lived in Claude artifact storage and isn't portable. The board starts empty on first launch; re-add the roster and it's ready. (Expected, not a bug.)
- **Last-write-wins:** the `upsert` on a primary key handles concurrent edits exactly as the prototype did. No conflict resolution needed for a household of three.

---

## 9. Making updates later (the workflow you wanted)

- **Change tasks/tiers/frequencies/zones:** edit the data arrays (`ZONES`, room task lists, laundry) in `app.js` and `git push`. No schema change, no Supabase change — task *definitions* are code, task *state* is data.
- **Restyle:** edit `styles.css`, push.
- **Add a whole new tab/room:** add a data entry + (if needed) a render call; push.

The `kv` table never changes shape as tasks evolve — new task ids just start writing new rows lazily via `ensureTask`, exactly like the prototype's lazy-init pattern.

---

## 10. Phasing

| Phase | Work | Depends on you |
|---|---|---|
| **0. Accounts** | Create Supabase project; give me the Project URL + anon key; pick the shared passphrase (you set it, I never see it). | ✅ you do this |
| **1. Scaffold** | Split prototype into the file layout above; wire load order; extract the image. | — |
| **2. Supabase** | Run the SQL; create the shared login; disable signups. | you click through §4 |
| **3. Shim + gate** | Add `storage.js` (shim, login, realtime); rename `init`. | — |
| **4. Deploy** | Enable Pages; add keep-alive Action. | you flip the Pages toggle |
| **5. Verify** | Run the §7 checks, especially cross-device sync. | — |
| **6. Content revisions** | Apply the pending task edits (below). Pure data, no architecture impact. | some items blocked on household input |

### Pending content revisions (Phase 6 — tracked, not yet applied)
From your latest notes — all data edits to the task arrays, queued for after the platform is standing:
- Bed **airs out daily** (blankets pulled back), not "made."
- Bedding split: sheets + top blanket **weekly/every-other-week**, full wash incl. topper **monthly** — no separate "glass to clean."
- Clean laundry (clothes **and** towels) needs a defined home — not the bed / hanging chair.
- Tables = **two** tasks: small/standing tables **put away daily**, main table **cleared daily** (chairs pushed in). No tablecloths anywhere.
- Dishes are **daily** (handwashing daily-ideal but backlog-tolerant); microwave **weekly**; "clean the cups in use" (not "wash old containers"); fridge toss/spills **weekly moderate**. Kitchen **floors weekly**, likely their own section.
- Vacuuming = **one** consistent task (remove redundant per-area vacuum tasks); couch **weekly**; cords/dusting **monthly**; cat trees **monthly**; dining chair cushions **monthly**.
- **Cat boxes (3):** daily light-scoop + **daily targeted vacuum of just that spot** per box; boxes themselves serviced **at most every other day**. Flagged as a critical backlog concern needing special handling.
- **Front hallway:** swept **weekly**; shoes/stuff away **daily**; robot vacuum kept functional (floor clear) and emptied **every other day**. (Patio + front walkway remain out of scope.)
- **Trash:** add "pick up assorted trash from all rooms / spot check."
- **Office:** define a **mail process**; everything else there drops.
- **Bathrooms:** most tasks **weekly** except light daily; buy a long-handled scrub brush.
- **Laundry area:** reframed as *process/rules*, not per-person chores — clear washer/dryer top + lint trap every use, remove clothes after. Next prototype needs a clear split between **daily tasks / weekly tasks / standing rules & expectations**.
- **Car (Kia):** add a **weekly cleanout**; standing rule "don't leave stuff in the car."
- **Monthly:** whole-house general wipe-down/dusting.
- **Reference notes to capture (not tasks):** disability tooling for dishes (long-handled scrubbers, Dawn Powerwash, adjustable rolling stool w/ footrest), cat-box PPE (disposable gloves + N95; ammonia-sensitive / immune-deficient), vacuuming only in short bursts without moving/lifting, and a **steam-cleaner** wishlist item (heat-sanitizes, avoids chemical reactions & most scrubbing).
- **Still blocked:** Andry & Moxxie to submit current-vs-ideal for shared spaces; Lynx to write up her bedroom list. Task set isn't complete until these arrive — the data-driven structure makes appending them a non-event.

---

## 11. Honest trade-offs

- **Realtime on reload-all:** on any remote change we reload all three small state groups and re-render (debounced). Simple and robust for KB-sized data; if it ever felt heavy we'd reload only the changed key. Your own writes echo back once — harmless.
- **Soft claiming:** anyone logged in can reassign anyone's task (shared login, no per-person identity). This matches the design's accepted "honor-system" model. A real backend makes "only unclaim your own" easy to add later if wanted, but it's out of scope now.
- **Public site shell:** the app's HTML is publicly served; only the *data* is gated. That's fine — there's nothing sensitive in the shell, and the passphrase gate + RLS protect the actual board.
