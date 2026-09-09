import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../services/authService';
import { useAuth } from '../../../core/auth/AuthContext'; 

export const useLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [credenciales, setCredenciales] = useState({
    nombre_usuario: '',
    contrasenia: '',
  });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setCredenciales((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      // 1. Llamada HTTP a través de authService (usa httpClient)
      const data = await loginRequest(credenciales);
      // 2. Notificamos al contexto global (guarda en estado y localStorage)
      login(data);

      // 3. Redirigimos a la vista inicial autenticada
      navigate('/canchas', { replace: true });
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  return { credenciales, error, cargando, handleChange, handleSubmit };
};