-- Fill missing lead codes so uniqueness constraint can be enforced safely
UPDATE "leads"
SET "code" = 'LEAD-' || "id"
WHERE "code" IS NULL;

ALTER TABLE "leads"
  ALTER COLUMN "code" SET NOT NULL;
