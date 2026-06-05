const express = require('express');
const cors = require('cors'); 
const sql = require('mssql');

const app = express();
//app.use(cors());             
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

// 2. Conexión a BD
let poolPromise = sql.connect(dbConfig).then(pool => {
    console.log('Catálogo conectado a AWS SQL Server');
    return pool;
}).catch(err => console.error('Error conectando a SQL Server:', err));

// 3. Rutas exclusivas del Catálogo
app.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query("SELECT id AS id_pack, nombre_restaurante, nombre_pack AS descripcion, precio_descuento AS precio_oferta FROM packs_comida WHERE stock > 0");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: 'Error al consultar la base de datos' });
    }
});

app.post('/', async (req, res) => {
    const { nombre_restaurante, nombre_pack, precio_original, precio_descuento, stock } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('restaurante', sql.VarChar, nombre_restaurante)
            .input('pack', sql.VarChar, nombre_pack)
            .input('p_orig', sql.Decimal(10, 2), precio_original)
            .input('p_desc', sql.Decimal(10, 2), precio_descuento)
            .input('stock', sql.Int, stock)
            .query('INSERT INTO packs_comida (nombre_restaurante, nombre_pack, precio_original, precio_descuento, stock) VALUES (@restaurante, @pack, @p_orig, @p_desc, @stock)');
        res.status(201).json({ mensaje: "¡Guardado en AWS exitosamente!" });
    } catch (err) {
        res.status(500).json({ mensaje: "Error en el servidor: " + err.message });
    }
});

// 4. Inicializar el Microservicio en el puerto 3001
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`[Catalog Service] corriendo en el puerto ${PORT}`);
});