DO $$
DECLARE
  user_role_type oid := to_regtype('"UserRole"');
BEGIN
  IF user_role_type IS NULL THEN
    RAISE EXCEPTION 'UserRole enum is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OWNER' AND enumtypid = user_role_type) THEN
    ALTER TYPE "UserRole" ADD VALUE 'OWNER';
  END IF;
END
$$;
