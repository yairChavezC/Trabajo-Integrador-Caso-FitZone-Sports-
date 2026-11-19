import 'dotenv/config';
import pool from './config/db.js';
import app from './app.js';
import { startWaitlistOfferExpirationWorker } from './modules/activities/services/inscriptionService.js';

const PORT = 3000;

app.listen(PORT, () => {
  startWaitlistOfferExpirationWorker();
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});