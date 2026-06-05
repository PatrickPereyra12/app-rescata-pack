const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// El Gateway centraliza la seguridad y el CORS
app.use(cors()); 

// 1. Enrutar al Catalog Service (Puerto 3001)
app.use('/api/packs', createProxyMiddleware({ 
    target: 'http://localhost:3001', 
    changeOrigin: true 
}));

// 2. Enrutar al Order Service (Puerto 3002)
app.use('/api/reservas', createProxyMiddleware({ 
    target: 'http://localhost:3002', 
    changeOrigin: true 
}));

// 3. Enrutar al Restaurant Service (Puerto 3003)
app.use('/api/restaurantes', createProxyMiddleware({ 
    target: 'http://localhost:3003', 
    changeOrigin: true 
}));

// 4. Inicializar el API Gateway
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 [API Gateway] unificando microservicios en el puerto ${PORT}`);
});