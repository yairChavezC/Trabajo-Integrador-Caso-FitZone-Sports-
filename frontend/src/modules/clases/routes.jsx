import { Route } from 'react-router-dom';
import ClasesRoute from './pages/ClasesRoute';

export const clasesRoutes = (
  <Route path="clases" element={<ClasesRoute />} />
);