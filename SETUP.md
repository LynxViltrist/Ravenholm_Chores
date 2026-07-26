# Supabase Setup — Click-by-Click (non-technical)

You only do this once. Three short missions. Everything happens at
https://supabase.com/dashboard (sign in, then click your project).

---

## Mission 1 — Get the "anon public" key (this unblocks Claude)

1. In your project, click the **gear icon** (Project Settings), bottom-left.
2. Click **API** (or **API Keys**).
3. Find the key labeled **`anon` `public`** (newer projects may call it
   **`publishable`**). It's a long string.
4. Click the copy button and paste it to Claude.

⚠️ Do **not** copy the `service_role` (or `secret`) key. That one is private.
The `anon`/`public` key is *designed* to be shared — it's safe.

---

## Mission 2 — Create the database table (one paste)

1. Left sidebar → **SQL Editor**.
2. Click **New query**.
3. Paste the whole block below.
4. Click **Run** (or press Ctrl+Enter). You should see "Success".

```sql
create table public.kv (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table public.kv enable row level security;

create policy "household read"   on public.kv for select to authenticated using (true);
create policy "household write"  on public.kv for insert to authenticated with check (true);
create policy "household update"  on public.kv for update to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.kv;
```

---

## Mission 3 — Create the one shared household login

1. Left sidebar → **Authentication** → **Users**.
2. Click **Add user** → **Create new user**.
3. Email: anything you'll remember, e.g. `household@ravenholm.local`
4. Password: pick the shared passphrase the household will type into the app.
   **Set it here yourself — don't send it to Claude.**
5. Turn ON **Auto Confirm User** (so it works right away).
6. Click **Create user**.

Then stop other people from signing up:

7. Left sidebar → **Authentication** → **Sign In / Providers** → **Email**.
8. Turn **OFF** "Allow new users to sign up" (wording may vary slightly).
   If you can't find this toggle, screenshot the screen and Claude will point at it.

---

## What Claude needs from you afterward
- ✅ The **anon public** key (Mission 1) — the only thing to paste.
- ✅ A thumbs-up that Missions 2 and 3 said "Success" / created the user.

The passphrase from Mission 3 stays with you and the household. Claude never needs it.
