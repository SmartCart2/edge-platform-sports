-- EDGE Platform — Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable Row Level Security on all tables
-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  display_name text,
  tier text default 'free' check (tier in ('free', 'pro', 'admin')),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, split_part(new.email, '@', 1), split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Signals table — every logged pick
create table public.signals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  -- Game info
  sport text not null,
  game text not null,
  game_date date not null,
  -- Pick
  market text not null,  -- 'Totals O/U', 'Spreads ATS', 'Moneyline', 'Player Prop'
  pick text not null,    -- e.g. 'Under 8.5', 'SEA -1.5', 'J.Verlander Over 6.5 K'
  line numeric,
  odds integer,          -- American odds, e.g. -110
  book text,
  -- Signal basis
  signal_source text,    -- e.g. 'SEA home under 69% (2026 season)'
  confidence text check (confidence in ('High', 'Medium', 'Low')),
  -- Result
  result text default 'Pending' check (result in ('Pending', 'Win', 'Loss', 'Push', 'No Action')),
  -- Metadata
  notes text,
  is_public boolean default true,
  created_at timestamptz default now(),
  graded_at timestamptz
);
alter table public.signals enable row level security;
create policy "Public signals visible to all" on public.signals for select using (is_public = true or auth.uid() = user_id);
create policy "Users can insert own signals" on public.signals for insert with check (auth.uid() = user_id);
create policy "Users can update own signals" on public.signals for update using (auth.uid() = user_id);
create policy "Users can delete own signals" on public.signals for delete using (auth.uid() = user_id);

-- Indexes for fast filtering
create index signals_user_id_idx on public.signals(user_id);
create index signals_sport_idx on public.signals(sport);
create index signals_result_idx on public.signals(result);
create index signals_game_date_idx on public.signals(game_date desc);

-- Computed stats view — win rate and ROI per user
create or replace view public.signal_stats as
select
  user_id,
  count(*) filter (where result in ('Win','Loss','Push')) as graded,
  count(*) filter (where result = 'Win') as wins,
  count(*) filter (where result = 'Loss') as losses,
  count(*) filter (where result = 'Push') as pushes,
  count(*) filter (where result = 'Pending') as pending,
  round(
    count(*) filter (where result = 'Win')::numeric /
    nullif(count(*) filter (where result in ('Win','Loss')), 0) * 100
  , 1) as win_pct,
  -- Flat -110 ROI calculation
  round(
    (
      sum(case when result = 'Win' then
        case when odds > 0 then odds::numeric/100
             else 100.0/abs(odds)
        end
      else 0 end) -
      count(*) filter (where result = 'Loss')
    ) / nullif(count(*) filter (where result in ('Win','Loss','Push')), 0)
  , 3) as roi_per_unit
from public.signals
group by user_id;

-- Platform-wide leaderboard view
create or replace view public.leaderboard as
select
  p.username,
  p.display_name,
  s.graded,
  s.wins,
  s.losses,
  s.win_pct,
  s.roi_per_unit,
  s.pending
from public.signal_stats s
join public.profiles p on p.id = s.user_id
where s.graded >= 10
order by s.roi_per_unit desc nulls last;
