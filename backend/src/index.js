import 'dotenv/config';
import pool from './config/db.js';
import app from './app.js';
import { applyMigrations } from '../apply_migrations.mjs';
import { startWaitlistOfferExpirationWorker } from './modules/activities/services/inscriptionService.js';

const PORT = 3000;

applyMigrations(pool)
  .then(() => {
    app.listen(PORT, () => {
      startWaitlistOfferExpirationWorker();
      console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error aplicando migraciones:', error);
    process.exit(1);
  });
