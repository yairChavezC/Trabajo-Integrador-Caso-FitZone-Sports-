const API_URL = 'http://localhost:3000/api/payments';

export const procesarPago = async (paymentData, token) => {
  try {
    const response = await fetch(`${API_URL}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();
    
    // Devolvemos tanto si fue exitoso (201) como si fue rechazado (400), 
    // para que el componente pueda leer el objeto del pago y armar el comprobante rojo.
    return data; 
  } catch (error) {
    console.error('Error en paymentService:', error);
    throw error;
  }
};