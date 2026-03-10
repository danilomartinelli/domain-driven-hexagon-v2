-- V6__resilience.sql
CREATE TABLE "idempotency_keys" (
  "key" character varying NOT NULL,
  "responseStatus" integer NOT NULL,
  "responseBody" jsonb,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT "PK_idempotency_keys" PRIMARY KEY ("key")
);
CREATE INDEX "IDX_idempotency_expiresAt" ON "idempotency_keys" ("expiresAt");

CREATE TABLE "failed_events" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "eventName" character varying NOT NULL,
  "payload" jsonb NOT NULL,
  "error" text NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "maxAttempts" integer NOT NULL DEFAULT 5,
  "nextRetryAt" TIMESTAMP WITH TIME ZONE,
  "status" character varying NOT NULL DEFAULT 'pending_retry',
  CONSTRAINT "PK_failed_events" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_failed_events_status" ON "failed_events" ("status", "nextRetryAt");
