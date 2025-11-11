
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.test for E2E tests
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env.test') });
