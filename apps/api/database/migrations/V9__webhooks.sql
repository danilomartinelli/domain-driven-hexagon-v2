CREATE TABLE "webhook_subscriptions" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "url" text NOT NULL,
  "secret" character varying NOT NULL,
  "events" text[] NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "failureCount" integer NOT NULL DEFAULT 0,
  "lastFailureAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "PK_webhook_subscriptions" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_deliveries" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "subscriptionId" character varying NOT NULL,
  "eventName" character varying NOT NULL,
  "payload" jsonb NOT NULL,
  "status" character varying NOT NULL DEFAULT 'pending',
  "responseStatus" integer,
  "responseBody" text,
  "attempts" integer NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "PK_webhook_deliveries" PRIMARY KEY ("id"),
  CONSTRAINT "FK_webhook_deliveries_subscriptionId" FOREIGN KEY ("subscriptionId") REFERENCES "webhook_subscriptions"("id")
);
