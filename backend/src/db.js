import dotenv from 'dotenv';
import pg from 'pg';


dotenv.config();


const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Falta la variable DATABASE_URL en el archivo .env');
}


const { Pool } = pg;
export const pool = new Pool({
  connectionString: connectionString,
});
