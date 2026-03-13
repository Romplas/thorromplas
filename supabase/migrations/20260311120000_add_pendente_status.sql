-- Add 'pendente' to ticket_status enum (before aberto)
ALTER TYPE ticket_status RENAME TO ticket_status_old;
CREATE TYPE ticket_status AS ENUM ('pendente', 'aberto', 'em_progresso', 'fechado');

ALTER TABLE chamados
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE text USING status::text;

ALTER TABLE chamados
  ALTER COLUMN status TYPE ticket_status USING status::ticket_status,
  ALTER COLUMN status SET DEFAULT 'aberto'::ticket_status;

DROP TYPE ticket_status_old;
