/*import dotenv from 'dotenv';
import pg from 'pg';


dotenv.config();


const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Falta la variable DATABASE_URL en el archivo .env');
}


const { Pool } = pg;
export const pool = new Pool({
  connectionString: connectionString,
});*/
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Falta la variable DATABASE_URL en el archivo .env');
}

const isLocal =
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1');

if (isLocal) {
  delete process.env.PGSSLMODE;
}

const { Pool } = pg;
export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});


