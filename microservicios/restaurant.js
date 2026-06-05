const express = require('express');
const cors = require('cors'); 
const sql = require('mssql');

const app = express();
app.use(cors());             
app.use(express.json());

// 1. Configuración de la conexión a AWS RDS
const dbConfig = {
    server: 'database-1.cgtcko22a9t9.us-east-1.rds.amazonaws.com', 
    authentication: {
        type: 'default',
        options: { userName: 'admin', password: 'Admin123*' }
    },
    options: {
        database: 'excedentes_db',
        encrypt: true, 
        trustServerCertificate: true,
        port: 1433
    }
};

// 2. Ruta exclusiva de Restaurantes y Categorías
app.get('/categoria/:id_categoria', async (req, res) => {
    const { id_categoria } = req.params; 

    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id_categoria', sql.Int, id_categoria)
            .query(`
                SELECT r.nombre AS Restaurante, c.nombre_categoria AS Categoria
                FROM Restaurante r
                INNER JOIN Restaurante_Categoria rc ON r.id_restaurante = rc.id_restaurante
                INNER JOIN Categoria_Dieta c ON rc.id_categoria = c.id_categoria
                WHERE c.id_categoria = @id_categoria
            `);
            
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error al filtrar categorías:', err);
        res.status(500).json({ error: 'Error al procesar la solicitud de categorías' });
    }
});

// 3. Inicializar el Microservicio en el puerto 3003
const PORT = 3003;
app.listen(PORT, () => {
    console.log(`[Restaurant Service] corriendo en el puerto ${PORT}`);
});