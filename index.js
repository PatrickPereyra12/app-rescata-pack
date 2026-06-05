const express = require('express');
const cors = require('cors'); 
// Usamos la librería normal porque ya abriste el puerto 1433
const sql = require('mssql'); 

const app = express();
app.use(cors());             
app.use(express.json());




app.post('/api/login', async (req, res) => {
    const { correo, contrasena } = req.body;
    try {
        const pool = await db.getPool();
        const result = await pool.request()
            .input('correo', sql.VarChar, correo)
            .input('contrasena', sql.VarChar, contrasena)
            .query('SELECT id_usuario, nombre, rol FROM Usuarios WHERE correo = @correo AND contrasena = @contrasena');

        if (result.recordset.length > 0) {
            // Usuario encontrado
            res.status(200).json({ success: true, usuario: result.recordset[0] });
        } else {
            // Credenciales incorrectas
            res.status(401).json({ success: false, mensaje: 'Correo o contraseña incorrectos' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al validar el usuario' });
    }
});

// Ruta POST para el Registro
app.post('/api/registro', async (req, res) => {
    const { nombre, correo, contrasena } = req.body;
    try {
        const pool = await db.getPool();
        await pool.request()
            .input('nombre', sql.VarChar, nombre)
            .input('correo', sql.VarChar, correo)
            .input('contrasena', sql.VarChar, contrasena)
            .query('INSERT INTO Usuarios (nombre, correo, contrasena) VALUES (@nombre, @correo, @contrasena)');
        
        res.status(201).json({ success: true, mensaje: '¡Usuario creado exitosamente!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, mensaje: 'Error al registrar. Tal vez el correo ya existe.' });
    }
});

const dbConfig = {
    server: 'localhost',      
    port: 1433,               // El puerto que configuraste en tu imagen
    authentication: {
        type: 'default',
        options: {
            userName: 'sa',
            password: 'Admin123*' // Asegúrate de que sea la clave que le pusiste
        }
    },
    options: {
        database: 'excedentes_db',
        encrypt: false, 
        trustServerCertificate: true
    }
};

class DatabaseSingleton {
    constructor() {
        if (!DatabaseSingleton.instance) {
            console.log('[Singleton] Conectando a BD Local por TCP/IP...');
            DatabaseSingleton.instance = sql.connect(dbConfig);
        }
    }
    getPool() {
        return DatabaseSingleton.instance;
    }
}
const db = new DatabaseSingleton();


class ReservaFacade {
    static async procesarReserva(id_pack, cantidad, id_usuario) {
        const pool = await db.getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            
            const requestReserva = new sql.Request(transaction);
            await requestReserva
                .input('id_usuario', sql.Int, id_usuario)
                .input('id_pack', sql.Int, id_pack)
                .input('cantidad', sql.Int, cantidad)
                .query('INSERT INTO Reserva (id_usuario, id_pack, cantidad) VALUES (@id_usuario, @id_pack, @cantidad)');

            
            const requestStock = new sql.Request(transaction);
            await requestStock
                .input('id_pack', sql.Int, id_pack)
                .input('cantidad', sql.Int, cantidad)
                .query('UPDATE packs_comida SET stock = stock - @cantidad WHERE id = @id_pack');

            await transaction.commit();
            return true;
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
}


const EstrategiasOrdenamiento = {
    menorPrecio: "ORDER BY precio_descuento ASC",
    mayorStock: "ORDER BY stock DESC",
    default: "" 
};

app.get('/api/packs', async (req, res) => {
    try {
        const pool = await db.getPool();
        
        
        const sortStrategy = req.query.sort;
        const estrategiaAplicada = EstrategiasOrdenamiento[sortStrategy] || EstrategiasOrdenamiento.default;

        const query = `
            SELECT id AS id_pack, nombre_restaurante, nombre_pack AS descripcion, precio_descuento AS precio_oferta 
            FROM packs_comida 
            WHERE stock > 0 
            ${estrategiaAplicada}
        `;
        
        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error("Error GET packs:", err);
        res.status(500).json({ error: 'Error al consultar la base de datos local' });
    }
});

app.post('/api/packs', async (req, res) => {
    const { nombre_restaurante, nombre_pack, precio_original, precio_descuento, stock } = req.body;
    try {
        const pool = await db.getPool();
        await pool.request()
            .input('restaurante', sql.VarChar, nombre_restaurante)
            .input('pack', sql.VarChar, nombre_pack)
            .input('p_orig', sql.Decimal(10, 2), precio_original)
            .input('p_desc', sql.Decimal(10, 2), precio_descuento)
            .input('stock', sql.Int, stock)
            .query('INSERT INTO packs_comida (nombre_restaurante, nombre_pack, precio_original, precio_descuento, stock) VALUES (@restaurante, @pack, @p_orig, @p_desc, @stock)');
        res.status(201).json({ mensaje: "¡Guardado en BD Local exitosamente!" });
    } catch (err) {
        res.status(500).json({ mensaje: "Error: " + err.message });
    }
});

// Ruta DELETE para eliminar un pack
app.delete('/api/packs/:id', async (req, res) => {
    const { id } = req.params; 
    
    try {
        const pool = await db.getPool();
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM packs_comida WHERE id = @id');
            
        res.status(200).json({ success: true, mensaje: "¡Pack eliminado exitosamente!" });
    } catch (err) {
        console.error("Error al eliminar el pack:", err);
        res.status(500).json({ success: false, mensaje: "Error al intentar eliminar." });
    }
});

// Ruta que usa la FACHADA para las reservas
app.post('/api/reservas', async (req, res) => {
    const { id_pack, cantidad } = req.body;   
    const id_usuario = 1; 

    try {
        await ReservaFacade.procesarReserva(id_pack, cantidad, id_usuario);
        res.status(201).json({ mensaje: "¡Transacción exitosa procesada por Facade!" });
    } catch (err) {
        console.error('Error en transacción:', err);
        res.status(500).json({ error: 'Fallo en la transacción local' });
    }
});

// Ruta de Filtros M:N
app.get('/api/restaurantes/categoria/:id_categoria', async (req, res) => {
    const { id_categoria } = req.params; 
    try {
        const pool = await db.getPool();
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
        res.status(500).json({ error: 'Error al filtrar categorías' });
    }
});

// Inicialización
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor monolítico corriendo en el puerto ${PORT}`);
});