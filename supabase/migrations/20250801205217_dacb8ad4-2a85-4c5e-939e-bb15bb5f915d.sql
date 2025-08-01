-- Discovery – which tables lack date?
with tables as (
  select unnest(array[
    'meals',
    'user_fluids',
    'exercise_sets',
    'exercise_sessions',
    'sleep_tracking',
    'supplement_intake_log',
    'weight_history',
    'body_measurements'
  ]) as tbl
)
select t.tbl,
       case when c.column_name is null
            then '❌  missing'
            else '✅  exists' end as date_column
from tables t
left join information_schema.columns c
       on c.table_name = t.tbl
      and c.column_name = 'date';

-- Patch – add a generated date column where needed
do
$$
declare
  _tbl text;
  _source_col text;
begin
  -- (table, timestamp-column) pairs that miss a date column
  for _tbl, _source_col in
    select * from (values
      ('meals'              , 'created_at'),
      ('user_fluids'        , 'consumed_at'),
      ('exercise_sets'      , 'created_at'),
      ('supplement_intake_log', 'taken_at')
    ) as t(tbl, src)
  loop
    -- add only if the column is absent
    if not exists (
      select 1
      from information_schema.columns
      where table_name = _tbl
        and column_name = 'date'
    )
    then
      execute format(
        'alter table %I add column date date
         generated always as (%I::date) stored;',
        _tbl, _source_col
      );
      raise notice 'Added generated date column on %', _tbl;
    end if;
  end loop;
end;
$$ language plpgsql;

-- Trigger to auto-fill native date columns
create or replace function fill_date_col() returns trigger as
$$
begin
  -- Any column named exactly `date`
  if (new.date is null) then
    -- Prefer explicit timestamp columns per table
    if (TG_TABLE_NAME = 'exercise_sessions')          then new.date := new.date;
    elsif (TG_TABLE_NAME = 'sleep_tracking')          then new.date := new.date;
    elsif (TG_TABLE_NAME = 'weight_history')          then new.date := new.date;
    elsif (TG_TABLE_NAME = 'body_measurements')       then new.date := new.date;
    else
      -- generic fallback: cast created_at/consumed_at/taken_at to date
      if (new.created_at is not null)   then new.date := new.created_at::date;
      elsif (new.consumed_at is not null) then new.date := new.consumed_at::date;
      elsif (new.taken_at is not null) then new.date := new.taken_at::date;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- attach to the tables that already *own* a real date column
do
$$
declare _tbl text;
begin
  foreach _tbl in array
    ['exercise_sessions', 'sleep_tracking', 'weight_history', 'body_measurements']
  loop
    execute format(
      'drop trigger if exists autofill_date on %I; 
       create trigger autofill_date
       before insert or update on %I
       for each row execute function fill_date_col();',
      _tbl, _tbl
    );
  end loop;
end;
$$;