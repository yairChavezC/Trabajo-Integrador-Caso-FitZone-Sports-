import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import pool from './src/config/db.js';

const MIGRATIONS = [
  '000_create_clases_grupales.sql',
  '001_create_usuario_sede.sql',
  '002_create_class_notifications.sql',
  '003_add_cancelacion_tardia.sql',
  '004_align_timestamp_types.sql'
];

export const applyMigrations = async (dbPool = pool) => {
  try {
    console.log('Verificando y aplicando migraciones...');

    const baseMigrationFile = path.resolve('migrations/000_create_clases_grupales.sql');
    const baseSql = fs.readFileSync(baseMigrationFile, 'utf-8');
    console.log('Ejecutando SQL de:', baseMigrationFile);
    await dbPool.query(baseSql);
    console.log('Migración 000_create_clases_grupales.sql aplicada con éxito.');

    const checkDupesSql = `
      SELECT id_clase_grupal, id_usuario, COUNT(*) AS cnt
      FROM public.inscripciones_clase_grupal
      WHERE estado IN ('confirmado', 'en espera', 'notificado')
      GROUP BY id_clase_grupal, id_usuario
      HAVING COUNT(*) > 1;
    `;
    const dupes = await dbPool.query(checkDupesSql);
    if (dupes.rows.length > 0) {
      console.error(
        'Se encontraron inscripciones activas duplicadas. No se modificaron datos; corregilas manualmente antes de continuar:',
        JSON.stringify(dupes.rows, null, 2)
      );
      throw new Error('Migración detenida para evitar borrar inscripciones duplicadas.');
    }

    for (const file of MIGRATIONS.slice(1)) {
      const filePath = path.resolve('migrations', file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log('Ejecutando SQL de:', filePath);
      await dbPool.query(sql);
      console.log(`Migración ${file} aplicada con éxito.`);
    }

    const tables = await dbPool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'notificaciones_clase_grupal';
    `);
    console.log('Tabla verificada:', tables.rows);

    const indexes = await dbPool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename IN (
          'clase_grupal',
          'inscripciones_clase_grupal',
          'notificaciones_clase_grupal',
          'usuario_sede'
        )
      ORDER BY indexname;
    `);
    console.log('Índices creados:', indexes.rows.map(r => r.indexname));

    return true;
  } catch (error) {
    console.error('Error aplicando migración:', error);
    process.exitCode = 1;
    throw error;
  }
};

// Ejecutar directamente (node apply_migrations.mjs) o desde CI.
// Solo se cierra el pool cuando corre como script: si lo invoca index.js,
// el pool es compartido con el servidor y no debe cerrarse.
const invokedDirectly = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  applyMigrations()
    .then(() => pool.end())
    .catch(() => {
      pool.end();
      process.exit(1);
    });
}
