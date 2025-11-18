import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

process.env.DISABLE_SCHEDULER = process.env.DISABLE_SCHEDULER ?? 'true';
