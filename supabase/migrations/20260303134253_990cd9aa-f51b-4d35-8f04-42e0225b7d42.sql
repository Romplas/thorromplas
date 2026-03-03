
-- Delete the redundant supervisor_representante link for DAYANA
DELETE FROM supervisor_representante WHERE supervisor_id = '824c208c-8e43-469c-a3fe-4d8f4f04448a';

-- Delete the duplicate DAYANA supervisor record
DELETE FROM supervisores WHERE id = '824c208c-8e43-469c-a3fe-4d8f4f04448a';
