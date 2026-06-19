-- Migration: tag the Soon / Today board columns with protected roles.
--
-- Why: date-driven card placement (events surfacing in Soon/Today, overdue
-- "keep reminding" tasks escalating to Soon/Someday) identifies columns by
-- their `role`, which survives the user renaming a column. Previously only
-- 'someday' and 'done' were roles; 'soon' and 'today' were plain 'none'.
--
-- Run this in the Supabase SQL editor as TWO SEPARATE executions. Postgres
-- refuses to USE a new enum value in the same transaction that ADDS it
-- (error 55P04: "New enum values must be committed before they can be used"),
-- and the editor runs a whole selection as one batch. So run STEP 1 by itself,
-- let it finish, then run STEP 2.

-- ===== STEP 1 — extend the enum. Select only these two lines and run. =====
alter type column_role add value if not exists 'soon';
alter type column_role add value if not exists 'today';

-- ===== STEP 2 — tag existing columns. Run this AFTER step 1 has finished. =====
update board_column set role = 'soon'  where role = 'none' and lower(label) = 'soon';
update board_column set role = 'today' where role = 'none' and lower(label) = 'today';
