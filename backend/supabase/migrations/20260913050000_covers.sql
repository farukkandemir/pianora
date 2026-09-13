-- Generated cover images, one row per distinct piece (title + composer).
-- Only the Edge Function touches this table, through the service role.
create table if not exists public.covers (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,          -- sha256 of normalised title|composer
  install_id  text not null,                 -- anonymous app install that first asked
  title       text not null,
  composer    text,
  model       text not null,                 -- which image model produced it
  path        text not null,                 -- object path inside the covers bucket
  created_at  timestamptz not null default now()
);

alter table public.covers enable row level security;
-- No policies on purpose: the publishable key gets nothing; the function uses the service role.

-- Public-read bucket for the PNGs. Writes go through the service role only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- The one-sentence art brief the painter was given, kept so a cover can be re-made or corrected.
alter table public.covers add column if not exists brief text;
