import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSede } from '../../../shared/context/SedeContext';
import { getRolClases } from '../services/claseService';
import AgendaClasesScreen from './AgendaClasesScreen';
import ClasesScreen from './ClasesScreen';

export default function ClasesRoute() {
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState(null);
  const { sedeSeleccionada, sedes, cargando: cargandoSedes } = useSede();

  useEffect(() => {
    let activo = true;
    getRolClases()
      .then((resultado) => {
        if (activo) setPerfil(resultado);
      })
      .catch((err) => {
        if (activo) setError(err.message);
      });

    return () => {
      activo = false;
    };
  }, []);

  if (error) {
    return <p className="clases-alert" role="alert">No se pudo cargar el rol: {error}</p>;
  }
  if (!perfil) return <p className="clases-empty">Cargando permisos de clases...</p>;
  if (perfil.tipo === 'administrador' || perfil.tipo === 'gerente') return <ClasesScreen />;
  if (perfil.tipo === 'socio') return <AgendaClasesScreen puedeInscribirse />;
  if (perfil.tipo === 'recepcionista') {
    if (!perfil.idSede) {
      return (
        <p className="clases-alert" role="alert">
          Tu perfil no tiene una sede asignada para gestionar clases.
        </p>
      );
    }
    if (cargandoSedes) return <p className="clases-empty">Cargando sede asignada...</p>;
    const sedeAsignada = sedes.find((sede) => Number(sede.id) === Number(perfil.idSede));
    if (!sedeAsignada) {
      return <p className="clases-alert" role="alert">La sede asignada no está disponible.</p>;
    }
    if (Number(sedeSeleccionada?.id) !== Number(perfil.idSede)) {
      return (
        <p className="clases-alert" role="status">
          Seleccioná {sedeAsignada.nombre} en el selector de sedes para gestionar su agenda.
        </p>
      );
    }
    return <ClasesScreen />;
  }
  if (perfil.tipo === 'cliente_externo') return <Navigate to="/canchas" replace />;
  return <p className="clases-alert" role="alert">Tu perfil no tiene acceso a la agenda de clases.</p>;
}
