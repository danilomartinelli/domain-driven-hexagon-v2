import { config } from 'dotenv';
import * as path from 'path';

// Initializing dotenv
// When running from apps/api (via ts-node or compiled), .env is at the app root
const envPath: string = path.resolve(
  process.cwd(),
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
);
config({ path: envPath });
