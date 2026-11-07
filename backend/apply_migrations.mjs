import fs from 'fs';
import path from 'path';
import pool from './src/config/db.js';

async function runMigration() {
  try {
    console.log('Verificando y aplicando migraciones...');
    
    // Check duplicates before applying unique index
    const checkDupesSql = `
      SELECT id_clase_grupal, id_usuario, COUNT(*) AS cnt
      FROM public.inscripciones_clase_grupal
      WHERE estado IN ('confirmado', 'en espera', 'notificado')
      GROUP BY id_clase_grupal, id_usuario
      HAVING COUNT(*) > 1;
    `;
    const dupes = await pool.query(checkDupesSql);
    if (dupes.rows.length > 0) {
      console.warn('Se encontraron inscripciones activas duplicadas:', dupes.rows);
      // Clean up duplicates keeping only the most recent one
      for (const d of dupes.rows) {
        await pool.query(`
          DELETE FROM public.inscripciones_clase_grupal
          WHERE id NOT IN (
            SELECT id FROM public.inscripciones_clase_grupal
            WHERE id_clase_grupal = $1 AND id_usuario = $2
              AND estado IN ('confirmado', 'en espera', 'notificado')
            ORDER BY fecha_registro DESC, id DESC
            LIMIT 1
          )
          AND id_clase_grupal = $1 AND id_usuario = $2
          AND estado IN ('confirmado', 'en espera', 'notificado');
        `, [d.id_clase_grupal, d.id_usuario]);
      }
      console.log('Duplicados saneados.');
    } else {
      console.log('No se encontraron inscripciones duplicadas.');
    }

    const migrationFile = path.resolve('migrations/001_create_class_notifications.sql');
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    
    console.log('Ejecutando SQL de:', migrationFile);
    await pool.query(sql);
    console.log('Migración 001_create_class_notifications.sql aplicada con éxito.');

    // Verify tables and indexes
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'notificaciones_clase_grupal';
    `);
    console.log('Tabla verificada:', tables.rows);

    const indexes = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename IN ('clase_grupal', 'inscripciones_clase_grupal', 'notificaciones_clase_grupal')
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
