-- Optional demo data for your space. Run in the Supabase SQL editor AFTER you've
-- signed in once (so your space + people + seeded columns/lists exist).
-- The SQL editor runs as a privileged role, so RLS doesn't block these inserts.
-- Safe to re-run: it just adds more rows (delete the space's items first if you
-- want a clean slate).
do $$
declare
  s uuid; pa uuid; pb uuid;
  c_someday uuid; c_soon uuid; c_today uuid; c_done uuid;
  l_groc uuid; l_house uuid;
  st_metro uuid; st_hd uuid;
  i_japan uuid; g uuid;
begin
  select id into s from space order by created_at limit 1;
  select id into pa from person where space_id = s and slot = 'partner_a';
  select id into pb from person where space_id = s and slot = 'partner_b';
  select id into c_someday from board_column where space_id = s and label = 'Someday';
  select id into c_soon    from board_column where space_id = s and label = 'Soon';
  select id into c_today   from board_column where space_id = s and label = 'Today';
  select id into c_done    from board_column where space_id = s and label = 'Done';
  select id into l_groc    from list where space_id = s and name = 'Groceries';
  select id into l_house   from list where space_id = s and name = 'House';

  insert into store (space_id, name) values (s, 'Metro') returning id into st_metro;
  insert into store (space_id, name) values (s, 'Home Depot') returning id into st_hd;

  -- Board cards (some dated → also on the calendar; one custom color, one exciting)
  insert into item (space_id, type, title, lane, kind, column_id, ord, due_at)
    values (s, 'task', 'Book dentist appointment', 'partner_a', 'routine', c_today, 0, date_trunc('day', now()) + interval '10 hours');
  insert into item (space_id, type, title, lane, kind, column_id, ord)
    values (s, 'task', 'Email the accountant', 'partner_a', 'routine', c_today, 1);
  insert into item (space_id, type, title, lane, kind, column_id, ord)
    values (s, 'task', 'Fix the leaky tap', 'partner_b', 'routine', c_soon, 1);
  insert into item (space_id, type, title, lane, kind, column_id, ord, color, emoji)
    values (s, 'task', 'Plan summer holiday', 'shared', 'exciting', c_someday, 0, '#E8C16B', '✈️');
  insert into item (space_id, type, title, lane, kind, column_id, ord, state)
    values (s, 'task', 'Pay car insurance', 'partner_a', 'routine', c_done, 0, 'done');

  -- Card with subtasks (Japan research → 1/3 done)
  insert into item (space_id, type, title, lane, kind, column_id, ord, emoji)
    values (s, 'task', 'Japan trip research', 'shared', 'exciting', c_someday, 1, '🇯🇵') returning id into i_japan;
  insert into item (space_id, type, title, lane, kind, parent_item_id, ord, state) values
    (s, 'task', 'Compare flight prices', 'shared', 'routine', i_japan, 0, 'done'),
    (s, 'task', 'Shortlist ryokan',      'shared', 'routine', i_japan, 1, 'open'),
    (s, 'task', 'Rough itinerary',       'shared', 'routine', i_japan, 2, 'open');

  -- Events (Standup repeats daily; Date night is exciting with a countdown)
  insert into item (space_id, type, title, lane, kind, start_at, end_at, recur_freq) values
    (s, 'event', 'Standup', 'shared', 'routine',
       date_trunc('day', now()) + interval '9 hours', date_trunc('day', now()) + interval '9 hours 30 minutes', 'daily');
  insert into item (space_id, type, title, lane, kind, start_at, end_at) values
    (s, 'event', 'Team sync', 'shared', 'routine',
       date_trunc('day', now()) + interval '11 hours', date_trunc('day', now()) + interval '12 hours');
  insert into item (space_id, type, title, lane, kind, start_at, end_at, emoji, countdown) values
    (s, 'event', 'Date night', 'shared', 'exciting',
       date_trunc('day', now()) + interval '3 days 19 hours', date_trunc('day', now()) + interval '3 days 22 hours', '💕', true);

  -- A dated task with no time-span → minimum-size timeline block
  insert into item (space_id, type, title, lane, kind, due_at)
    values (s, 'task', 'Water the plants', 'shared', 'routine', date_trunc('day', now()) + interval '8 hours');

  -- Shopping in Groceries (one already checked → Done section)
  insert into item (space_id, type, title, lane, kind, list_id, store_id, qty, checked) values
    (s, 'shopping', 'Cat food', 'shared', 'routine', l_groc, st_metro, 'x2', false),
    (s, 'shopping', 'Eggs',     'shared', 'routine', l_groc, st_metro, 'x12', false),
    (s, 'shopping', 'Oat milk', 'partner_a', 'routine', l_groc, st_metro, null, false),
    (s, 'shopping', 'Sourdough','shared', 'routine', l_groc, null, null, true);
  insert into item (space_id, type, title, lane, kind, list_id, store_id) values
    (s, 'shopping', 'Light bulbs', 'shared', 'routine', l_house, st_hd);

  -- A card that references the standing Groceries list (linked, shown inline)
  insert into item (space_id, type, title, lane, kind, column_id, ord, linked_list_ids)
    values (s, 'task', 'Weekend errands', 'shared', 'routine', c_soon, 0, array[l_groc]);

  -- Finance: bills, a savings goal with contributions, and split expenses (Owe Snap)
  insert into bill (space_id, name, amount, frequency, next_due_at) values
    (s, 'Rent',    1200,  'monthly', now() + interval '13 days'),
    (s, 'Netflix', 10.99, 'monthly', now() + interval '2 days');
  insert into savings_goal (space_id, name, emoji, target) values (s, 'Japan 2027', '🇯🇵', 4000) returning id into g;
  insert into goal_contribution (goal_id, amount, by) values (g, 1240, pa), (g, 800, pb);
  insert into item (space_id, type, title, lane, amount, paid_by, cost_attribution, spent_at) values
    (s, 'expense', 'Groceries', 'shared', 60, pb, 'split', now() - interval '4 days'),
    (s, 'expense', 'Cinema',    'shared', 25, pa, 'split', now() - interval '6 days');
end $$;
