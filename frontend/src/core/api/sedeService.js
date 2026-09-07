export const obtenerSedesApi = async () => {
  const token = localStorage.getItem('token');

  const response = await fetch('http://localhost:3000/api/sedes', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Error al obtener la lista de sedes');
  }

  const json = await response.json();
  return json.data || [];
};