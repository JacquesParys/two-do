-- Migration: tag the Soon / Today board columns with protected roles.
--
-- Why: date-driven card placement (events surfacing in Soon/Today, overdue
-- "keep reminding" tasks escalating to Soon/Someday) identifies columns by
-- their `role`, which survives the user renaming a column. Previously only
-- 'someday' and 'done' were roles; 'soon' and 'today' were plain 'none'.
--
-- Run this ONCE in the Supabase SQL editor. Postgres requires each
-- `alter type ... add value` to commit before the new value can be USED, so
-- run the two ALTERs first (let them commit), THEN the UPDATEs.

-- Step 1 — extend the enum (run these two, then continue):
alter type column_role add value if not exists 'soon';
alter type column_role add value if not exists 'today';

-- Step 2 — tag existing columns (run after step 1 has committed):
update board_column set role = 'soon'  where role = 'none' and lower(label) = 'soon';
update board_column set role = 'today' where role = 'none' and lower(label) = 'today';
