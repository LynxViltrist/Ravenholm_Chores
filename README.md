# Household Chore Board

A shared, witchy-grimoire chore board for the household (Lynx, Andry, Moxxie).
Static frontend on **GitHub Pages** + shared live state in **Supabase**. No build step.

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the full design and
[SETUP.md](SETUP.md) for the one-time Supabase steps.

## Files
| File | What it is |
|---|---|
| `index.html` | Page markup + the login gate + script tags (load order matters). |
| `styles.css` | The full "witchy forest grimoire" design system, including the login gate. |
| `app.js` | The tested chore-board logic, unchanged. Ends with `init()` (called after login). |
| `storage.js` | Supabase-backed `window.storage` shim + shared login + realtime sync. |
| `config.js` | Supabase URL + anon/public key (safe to commit; RLS protects the data). |
| `assets/forest.jpg` | The mushroom-forest background (was 7 MB of inline base64). |
| `.github/workflows/keepalive.yml` | Daily ping so the free Supabase project never pauses. |

## How it works
- Shared state (board, bedrooms, laundry) lives in a single Supabase `kv` table,
  reached directly from the browser. The `my-name` "I am" setting stays in this
  device's `localStorage` (intentionally per-device).
- Access is gated by one shared household login (Supabase Auth user), enforced by
  Row-Level Security — knowing the URL is not enough.
- When anyone changes something, Supabase realtime pushes it and every open board
  reloads and re-renders. Last-write-wins.

## Deploy
Push to `main`, then repo **Settings → Pages → Deploy from a branch → `main` / root**.
Every later push redeploys. Data lives in Supabase, so deploys never reset the board.

## Updating tasks later
Task *definitions* are data in `app.js` (`ZONES`, `ROOM_TASKS`, laundry). Edit and push —
no schema change. Task *state* is the only thing stored in Supabase.
