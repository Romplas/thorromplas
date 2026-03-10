
-- Step 1: Rename old enum
ALTER TYPE ticket_status RENAME TO ticket_status_old;

-- Step 2: Create new enum
CREATE TYPE ticket_status AS ENUM ('aberto', 'em_progresso', 'fechado');

-- Step 3: Update column to text, fix values, then cast to new enum
ALTER TABLE chamados 
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE text USING status::text;

UPDATE chamados SET status = 'fechado' WHERE status IN ('finalizado', 'aguardando');

ALTER TABLE chamados 
  ALTER COLUMN status TYPE ticket_status USING status::ticket_status,
  ALTER COLUMN status SET DEFAULT 'aberto'::ticket_status;

-- Step 4: Drop old enum
DROP TYPE ticket_status_old;
