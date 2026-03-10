INSERT INTO
  wallets (id, "createdAt", "updatedAt", balance, "userId")
SELECT
  gen_random_uuid(),
  now(),
  now(),
  0,
  'f59d0748-d455-4465-b0a8-8d8260b1c877'
WHERE NOT EXISTS (
  SELECT 1 FROM wallets WHERE "userId" = 'f59d0748-d455-4465-b0a8-8d8260b1c877'
);