import { createPool, sql } from 'slonik';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as argon2 from 'argon2';

const envPath = path.resolve(
  __dirname,
  process.env.NODE_ENV === 'test' ? '../.env.test' : '../.env',
);
dotenv.config({ path: envPath });

const connectionUri = `postgres://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT ?? 5432}/${process.env.DB_NAME}`;

interface SeedUser {
  id: string;
  email: string;
  country: string;
  postalCode: string;
  street: string;
  role: string;
  password: string;
}

const seedUsers: SeedUser[] = [
  {
    id: 'f59d0748-d455-4465-b0a8-8d8260b1c877',
    email: 'john@gmail.com',
    country: 'England',
    postalCode: '24312',
    street: 'Road Avenue',
    role: 'guest',
    password: 'Password123!',
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    email: 'admin@example.com',
    country: 'United States',
    postalCode: '10001',
    street: 'Broadway',
    role: 'admin',
    password: 'AdminPass123!',
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    email: 'moderator@example.com',
    country: 'Germany',
    postalCode: '10115',
    street: 'Unter den Linden',
    role: 'moderator',
    password: 'ModPass123!',
  },
];

async function seedUsersTable(
  pool: ReturnType<typeof createPool> extends Promise<infer T> ? T : never,
): Promise<void> {
  console.log('Seeding users...');

  for (const user of seedUsers) {
    const passwordHash = await argon2.hash(user.password);

    await pool.query(
      sql.unsafe`
        INSERT INTO "users" ("id", "createdAt", "updatedAt", "email", "country", "postalCode", "street", "role", "passwordHash")
        VALUES (
          ${user.id},
          now(),
          now(),
          ${user.email},
          ${user.country},
          ${user.postalCode},
          ${user.street},
          ${user.role},
          ${passwordHash}
        )
        ON CONFLICT ("id") DO NOTHING
      `,
    );
    console.log(`  User seeded: ${user.email} (${user.role})`);
  }
}

async function seedWalletsTable(
  pool: ReturnType<typeof createPool> extends Promise<infer T> ? T : never,
): Promise<void> {
  console.log('Seeding wallets...');

  for (const user of seedUsers) {
    await pool.query(
      sql.unsafe`
        INSERT INTO "wallets" ("id", "createdAt", "updatedAt", "balance", "userId")
        SELECT gen_random_uuid(), now(), now(), 0, ${user.id}
        WHERE NOT EXISTS (
          SELECT 1 FROM "wallets" WHERE "userId" = ${user.id}
        )
      `,
    );
    console.log(`  Wallet seeded for user: ${user.email}`);
  }
}

async function runSeed(): Promise<void> {
  console.log('Starting database seed...');
  console.log(`Connecting to: ${connectionUri.replace(/:[^:@]*@/, ':***@')}`);

  const pool = await createPool(connectionUri);

  try {
    await seedUsersTable(pool);
    await seedWalletsTable(pool);
    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runSeed();
