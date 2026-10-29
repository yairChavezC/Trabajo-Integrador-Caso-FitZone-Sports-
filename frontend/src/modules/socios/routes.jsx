import { Route } from 'react-router-dom';
import SociosScreen from './pages/MembershipsPage';
import SocioDetallePage from './pages/SocioDetallePage';
import PlanesPage from './pages/PlanesPage';

export const sociosRoutes = (
  <>
    <Route path="socios" element={<SociosScreen />} />
    <Route path="socios/planes" element={<PlanesPage />} />
    <Route path="socios/:id" element={<SocioDetallePage />} />
  </>
);