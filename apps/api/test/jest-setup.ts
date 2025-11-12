/* istanbul ignore file */
import { config } from 'dotenv';
import { join } from 'path';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
const envPath = join(__dirname, '../', envFile);

// eslint-disable-next-line no-console
console.log('🔧 Đang load environment từ:', envPath);
const result = config({ path: envPath });

if (result.error) {
  // eslint-disable-next-line no-console
  console.warn('⚠️  Không load được .env file:', result.error.message);
} else {
  // eslint-disable-next-line no-console
  console.log('✅ Environment đã load thành công');
}

if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL là required nhưng không tìm thấy trong environment!');
}

// eslint-disable-next-line no-console
console.log('✅ DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
