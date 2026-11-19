import { Route } from 'react-router-dom';
import SociosScreen from './pages/MembershipsPage';
import SocioDetallePage from './pages/SocioDetallePage';
import PlanesPage from './pages/PlanesPage';
import { SoloPersonal, SoloPropioOPersonal } from './guards';

export const sociosRoutes = (
  <>
    <Route path="socios" element={<SoloPersonal><SociosScreen /></SoloPersonal>} />
    <Route path="socios/planes" element={<SoloPersonal><PlanesPage /></SoloPersonal>} />
    <Route
      path="socios/:id"
      element={<SoloPropioOPersonal><SocioDetallePage /></SoloPropioOPersonal>}
    />
  </>
);