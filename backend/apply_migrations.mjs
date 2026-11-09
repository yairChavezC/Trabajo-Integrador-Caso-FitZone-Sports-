import fs from 'fs';
import path from 'path';
import pool from './src/config/db.js';

async function runMigration() {
  try {
    console.log('Verificando y aplicando migraciones...');

    const baseMigrationFile = path.resolve('migrations/000_create_clases_grupales.sql');
    const baseSql = fs.readFileSync(baseMigrationFile, 'utf-8');
    console.log('Ejecutando SQL de:', baseMigrationFile);
    await pool.query(baseSql);
    console.log('Migración 000_create_clases_grupales.sql aplicada con éxito.');

    const checkDupesSql = `
      SELECT id_clase_grupal, id_usuario, COUNT(*) AS cnt
      FROM public.inscripciones_clase_grupal
      WHERE estado IN ('confirmado', 'en espera', 'notificado')
      GROUP BY id_clase_grupal, id_usuario
      HAVING COUNT(*) > 1;
    `;
    const dupes = await pool.query(checkDupesSql);
    if (dupes.rows.length > 0) {
      console.error(
        'Se encontraron inscripciones activas duplicadas. No se modificaron datos; corregilas manualmente antes de continuar:',
        JSON.stringify(dupes.rows, null, 2)
      );
      throw new Error('Migración detenida para evitar borrar inscripciones duplicadas.');
    }

    const migrationFile = path.resolve('migrations/002_create_class_notifications.sql');
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    
    console.log('Ejecutando SQL de:', migrationFile);
    await pool.query(sql);
    console.log('Migración 002_create_class_notifications.sql aplicada con éxito.');

    const siteMigrationFile = path.resolve('migrations/001_create_usuario_sede.sql');
    const siteSql = fs.readFileSync(siteMigrationFile, 'utf-8');
    console.log('Ejecutando SQL de:', siteMigrationFile);
    await pool.query(siteSql);
    console.log('Migración 001_create_usuario_sede.sql aplicada con éxito.');

    // Verify tables and indexes
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'notificaciones_clase_grupal';
    `);
    console.log('Tabla verificada:', tables.rows);

    const indexes = await pool.query(`
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

  } catch (error) {
    console.error('Error aplicando migración:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runMigration();
