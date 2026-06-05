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

// 2. Rutas exclusivas de Transacciones y Reservas
app.post('/', async (req, res) => {
    const { id_pack, cantidad } = req.body;
    const id_usuario = 1; // Usuario simulado

    try {
        let pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Acción 1: Insertar Reserva
            const requestReserva = new sql.Request(transaction);
            await requestReserva
                .input('id_usuario', sql.Int, id_usuario)
                .input('id_pack', sql.Int, id_pack)
                .input('cantidad', sql.Int, cantidad)
                .query('INSERT INTO Reserva (id_usuario, id_pack, cantidad) VALUES (@id_usuario, @id_pack, @cantidad)');

            // Acción 2: Descontar stock
            const requestStock = new sql.Request(transaction);
            await requestStock
                .input('id_pack', sql.Int, id_pack)
                .input('cantidad', sql.Int, cantidad)
                .query('UPDATE packs_comida SET stock = stock - @cantidad WHERE id = @id_pack');

            await transaction.commit();
            res.status(201).json({ mensaje: "¡Transacción exitosa! Pack reservado y stock actualizado en AWS." });

        } catch (err) {
            await transaction.rollback();
            throw err; 
        }
    } catch (err) {
        console.error('Error en la transacción:', err);
        res.status(500).json({ error: 'Fallo en la transacción del sistema distribuido' });
    }
});

// 3. Inicializar el Microservicio en el puerto 3002
const PORT = 3002;
app.listen(PORT, () => {
    console.log(`[Order Service] corriendo en el puerto ${PORT}`);
});