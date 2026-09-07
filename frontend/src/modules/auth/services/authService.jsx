const API_URL = 'http://localhost:3000/api/auth';

export const loginRequest = async (credenciales) => {
  const respuesta = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credenciales),
  });

  const data = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(data.error || 'Error al intentar iniciar sesión');
  }

  return data;
};