import { Route } from 'react-router-dom';
import SociosScreen from './pages/MembershipsPage';
import SocioDetallePage from './pages/SocioDetallePage';

export const sociosRoutes = (
  <>
    <Route path="socios" element={<SociosScreen />} />
    <Route path="socios/:id" element={<SocioDetallePage />} />
  </>
);