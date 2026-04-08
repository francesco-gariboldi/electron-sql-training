-- Schema used by the container to enable schema visualization via pgAdmin

-- Create table to store DDL events.
-- pgAdmin will read this table (polled view) to show recent changes.
CREATE TABLE IF NOT EXISTS public.schema_events (
  id bigserial PRIMARY KEY,
  happened_at timestamptz NOT NULL DEFAULT now(),
  username text NOT NULL DEFAULT current_user,
  ddl_tag text NOT NULL,
  object_type text,
  schema_name text,
  object_identity text,
  command text
);

-- Trigger function captures DDL.
CREATE OR REPLACE FUNCTION public.log_ddl_event()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
    INSERT INTO public.schema_events(
      ddl_tag,
      object_type,
      schema_name,
      object_identity,
      command
    ) VALUES (
      TG_TAG,
      rec.object_type,
      rec.schema_name,
      rec.object_identity,
      rec.command_tag
    );
  END LOOP;
END;
$$;

-- Event trigger fires on DDL end.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_event_trigger WHERE evtname = 'on_ddl_end_log'
  ) THEN
    CREATE EVENT TRIGGER on_ddl_end_log
    ON ddl_command_end
    EXECUTE FUNCTION public.log_ddl_event();
  END IF;
END $$;
