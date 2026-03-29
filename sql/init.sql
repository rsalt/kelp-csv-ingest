CREATE TABLE IF NOT EXISTS public.users (
  id serial4 PRIMARY KEY,
  name varchar NOT NULL,
  age int4 NOT NULL,
  address jsonb NULL,
  additional_info jsonb NULL
);
