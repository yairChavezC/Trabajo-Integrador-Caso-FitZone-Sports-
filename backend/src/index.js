import 'dotenv/config';
import app from './app.js';
import { startWaitlistOfferExpirationWorker } from './modules/activities/services/activityService.js';

const PORT = 3000;

app.listen(PORT, () => {
  startWaitlistOfferExpirationWorker();
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
