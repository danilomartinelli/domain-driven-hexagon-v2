-- V5__auth.sql
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';

CREATE TABLE "refresh_tokens" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "userId" character varying NOT NULL,
  "tokenHash" character varying NOT NULL,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "revokedAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
  CONSTRAINT "FK_refresh_tokens_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId");
CREATE INDEX "IDX_refresh_tokens_tokenHash" ON "refresh_tokens" ("tokenHash");
