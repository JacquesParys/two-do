-- ============================================================================
-- Two-Do — Supabase / Postgres schema
-- Translates docs/two-do-build-plan.md §1 (data model) into Postgres.
-- Decisions baked in: single `item` table + type discriminator, soft-delete,
-- `kind` on the spine, summed goal contributions.
--
-- Taxonomy (see docs/two-do-build-plan.md §1):
-- - `type` is the item's PRIMARY NATURE (capture default / icon), NOT a view
--   filter. Which views show an item is FIELD-DRIVEN: it appears on the board
--   if it has `column_id`, on the calendar if it has `start_at`/`due_at`, and
--   in a list if it has `list_id`. One item can satisfy several at once
--   (a dated task is both a card and a calendar entry) — "one thing, 3 views".
-- - `parent_item_id` is the single mechanism for both a task's break-it-down
--   subtasks AND a checklist/list attached to a card or event: child items of
--   a parent. (Standalone lists still use the `list` table via `list_id`.)
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type lane_slot        as enum ('partner_a', 'partner_b', 'shared');
create type item_type        as enum ('task', 'event', 'shopping', 'expense');
create type item_kind        as enum ('routine', 'exciting');
create type task_state       as enum ('open', 'done', 'parked');
create type column_role      as enum ('none', 'done', 'someday');
create type cost_attribution as enum ('partner_a', 'partner_b', 'split');
create type bill_frequency   as enum ('weekly', 'monthly', 'quarterly', 'yearly');
create type label_style      as enum ('me_you_us', 'this_that_both', 'custom', 'players');

-- ----------------------------------------------------------------------------
-- Space — the shared two-person container
-- ----------------------------------------------------------------------------
create table space (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  label_style   label_style not null default 'me_you_us',
  custom_labels jsonb,                       -- { partner_a, partner_b, shared } when label_style='custom'
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Person — exactly two per space, mapped to a neutral slot
-- ----------------------------------------------------------------------------
create table person (
  id            uuid primary key default gen_random_uuid(),
  space_id      uuid not null references space(id) on delete cascade,
  slot          lane_slot not null,
  display_name  text not null,
  lane_color    text not null default '#6BB5E8',
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint person_slot_is_partner check (slot in ('partner_a', 'partner_b')),
  constraint person_one_per_slot unique (space_id, slot)
);

-- ----------------------------------------------------------------------------
-- Board columns (kanban) — editable label, protected role
-- ----------------------------------------------------------------------------
create table board_column (
  id        uuid primary key default gen_random_uuid(),
  space_id  uuid not null references space(id) on delete cascade,
  label     text not null,
  ord       int  not null default 0,
  role      column_role not null default 'none'
);

-- ----------------------------------------------------------------------------
-- Lists (shopping / task lists) and Stores
-- ----------------------------------------------------------------------------
create table list (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references space(id) on delete cascade,
  name       text not null,
  emoji      text,
  has_stores boolean not null default false,
  ord        int not null default 0
);

create table store (
  id        uuid primary key default gen_random_uuid(),
  space_id  uuid not null references space(id) on delete cascade,
  name      text not null,
  color     text
);

-- ----------------------------------------------------------------------------
-- Recurrence (shared by tasks and events)
-- ----------------------------------------------------------------------------
create table recurrence (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references space(id) on delete cascade,
  rule       text not null,        -- RRULE-style or structured string
  until      timestamptz,
  exceptions jsonb                 -- supports "this occurrence only" edits
);

-- ----------------------------------------------------------------------------
-- Item — the shared spine; one wide table discriminated by `type`.
-- Type-specific columns are nullable. Light CHECKs guard the essentials
-- without blocking fast capture (title + lane is always enough).
-- ----------------------------------------------------------------------------
create table item (
  id            uuid primary key default gen_random_uuid(),
  space_id      uuid not null references space(id) on delete cascade,
  type          item_type not null,
  title         text not null,
  lane          lane_slot not null,
  kind          item_kind not null default 'routine',
  claimed_by    uuid references person(id) on delete set null,
  notes         text,
  emoji         text,
  created_by    uuid references person(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,                        -- soft-delete
  parent_item_id uuid references item(id) on delete cascade,  -- subtask step / member of a list attached to this card or event

  -- task fields
  due_at                timestamptz,
  location_context      text,                       -- @home / @out / @work / custom
  column_id             uuid references board_column(id) on delete set null,
  ord                   int not null default 0,   -- kanban position within a column
  state                 task_state default 'open',
  persistent_until_done boolean default false,
  countdown             boolean default false,    -- show the sleeps countdown

  -- event fields
  start_at      timestamptz,
  end_at        timestamptz,

  -- list membership (general: any item type can be filed into a list) + shopping fields
  list_id        uuid references list(id) on delete set null,
  qty            text,
  price_estimate numeric(12,2),
  store_id       uuid references store(id) on delete set null,
  checked        boolean default false,
  checked_at     timestamptz,

  -- expense fields
  amount                numeric(12,2),
  paid_by               uuid references person(id) on delete set null,
  cost_attribution      cost_attribution,
  category              text,
  spent_at              timestamptz,
  from_shopping_item_id uuid references item(id) on delete set null,

  -- recurrence (tasks/events)
  recurrence_id uuid references recurrence(id) on delete set null,

  constraint item_event_has_start check (type <> 'event' or start_at is not null),
  constraint item_expense_has_amount check (type <> 'expense' or amount is not null)
);

create index item_space_type_idx on item (space_id, type)     where deleted_at is null;
create index item_column_idx     on item (column_id)          where deleted_at is null;
create index item_list_idx       on item (list_id)            where deleted_at is null;
create index item_due_idx        on item (due_at)             where deleted_at is null;
create index item_start_idx      on item (start_at)           where deleted_at is null;
create index item_parent_idx     on item (parent_item_id)     where deleted_at is null;

-- Subtasks / break-it-down steps are NOT a separate table — they are child
-- `item` rows (see `parent_item_id` above), the same mechanism as a checklist
-- attached to a card or event. Progress = done children / total children.

-- ----------------------------------------------------------------------------
-- Finance: bills, goals, contributions, settlements
-- ----------------------------------------------------------------------------
create table bill (
  id                  uuid primary key default gen_random_uuid(),
  space_id            uuid not null references space(id) on delete cascade,
  name                text not null,
  amount              numeric(12,2) not null,
  frequency           bill_frequency not null default 'monthly',
  next_due_at         timestamptz,
  auto_create_expense boolean not null default false
);

create table savings_goal (
  id             uuid primary key default gen_random_uuid(),
  space_id       uuid not null references space(id) on delete cascade,
  name           text not null,
  emoji          text,
  target         numeric(12,2) not null,
  linked_item_id uuid references item(id) on delete set null
);

create table goal_contribution (
  id       uuid primary key default gen_random_uuid(),
  goal_id  uuid not null references savings_goal(id) on delete cascade,
  amount   numeric(12,2) not null,
  at       timestamptz not null default now(),
  by       uuid references person(id) on delete set null
);

create table settlement (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references space(id) on delete cascade,
  amount     numeric(12,2) not null,
  from_person uuid references person(id) on delete set null,
  to_person   uuid references person(id) on delete set null,
  at         timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Reminder settings (Phase 2 — defined now so the model is ready)
-- ----------------------------------------------------------------------------
create table reminder_setting (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references item(id) on delete cascade,
  nudge_at   timestamptz,
  persistent boolean not null default false,
  channel    text not null default 'in_app'   -- 'in_app' | 'push'
);

-- ----------------------------------------------------------------------------
-- updated_at trigger for item
-- ----------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

create trigger trg_item_touch before update on item
  for each row execute function touch_updated_at();

-- ----------------------------------------------------------------------------
-- Seed defaults when a space is created (4 columns + starter lists)
-- ----------------------------------------------------------------------------
create or replace function seed_space() returns trigger
language plpgsql as $$
begin
  insert into board_column (space_id, label, ord, role) values
    (new.id, 'Today',   0, 'none'),
    (new.id, 'Soon',    1, 'none'),
    (new.id, 'Someday', 2, 'someday'),
    (new.id, 'Done',    3, 'done');
  insert into list (space_id, name, emoji, has_stores, ord) values
    (new.id, 'Groceries',       '🛒', true,  0),
    (new.id, 'House',           '🏠', true,  1),
    (new.id, 'Keep forgetting', '🤔', false, 2);
  return new;
end; $$;

create trigger trg_seed_space after insert on space
  for each row execute function seed_space();

-- ----------------------------------------------------------------------------
-- Row-Level Security — everything is scoped to the caller's space
-- ----------------------------------------------------------------------------
-- Resolves the space the logged-in auth user belongs to.
create or replace function app_space_id() returns uuid
language sql stable security definer set search_path = public as $$
  select space_id from person where auth_user_id = auth.uid() limit 1;
$$;

alter table space             enable row level security;
alter table person            enable row level security;
alter table board_column      enable row level security;
alter table list              enable row level security;
alter table store             enable row level security;
alter table recurrence        enable row level security;
alter table item              enable row level security;
alter table bill              enable row level security;
alter table savings_goal      enable row level security;
alter table goal_contribution enable row level security;
alter table settlement        enable row level security;
alter table reminder_setting  enable row level security;

-- Space-scoped tables: row's space_id must match the caller's space.
create policy sp_space on space             using (id = app_space_id())       with check (id = app_space_id());
create policy sp_person on person           using (space_id = app_space_id()) with check (space_id = app_space_id());
create policy sp_col on board_column        using (space_id = app_space_id()) with check (space_id = app_space_id());
create policy sp_list on list               using (space_id = app_space_id()) with check (space_id = app_space_id());
create policy sp_store on store             using (space_id = app_space_id()) with check (space_id = app_space_id());
create policy sp_rec on recurrence          using (space_id = app_space_id()) with check (space_id = app_space_id());
create policy sp_item on item               using (space_id = app_space_id()) with check (space_id = app_space_id());
create policy sp_bill on bill               using (space_id = app_space_id()) with check (space_id = app_space_id());
create policy sp_goal on savings_goal       using (space_id = app_space_id()) with check (space_id = app_space_id());
create policy sp_settle on settlement       using (space_id = app_space_id()) with check (space_id = app_space_id());

-- Child items carry their own space_id, so the sp_item policy already covers
-- them — no separate subtask policy needed.

-- Child tables without space_id: scope through the parent.
create policy sp_contrib on goal_contribution using (
  exists (select 1 from savings_goal g where g.id = goal_contribution.goal_id and g.space_id = app_space_id())
) with check (
  exists (select 1 from savings_goal g where g.id = goal_contribution.goal_id and g.space_id = app_space_id())
);

create policy sp_reminder on reminder_setting using (
  exists (select 1 from item i where i.id = reminder_setting.item_id and i.space_id = app_space_id())
) with check (
  exists (select 1 from item i where i.id = reminder_setting.item_id and i.space_id = app_space_id())
);

-- ============================================================================
-- Notes
-- - Me/You/Us is NOT stored — derived client-side from the viewer's slot.
-- - Views are field-driven, not type-filtered: board = `column_id`, calendar =
--   `start_at`/`due_at`, list = `list_id`. `type` is the primary-nature hint.
-- - Subtasks and card/event-attached checklists are both child items via
--   `parent_item_id`; top-level view queries exclude children.
-- - The who-owes-who balance is derived from `item` (expenses) + `settlement`.
-- - To go live: run this in the Supabase SQL editor, then enable Realtime on
--   the tables you subscribe to (item, list, board_column, etc.).
-- ============================================================================
