// Prueba Unitaria Simbolica para el Pipeline CI
console.log("=== Iniciando Pruebas Unitarias DevSecOps ===");

function validarReglaDescuento(precioOriginal, precioDescuento) {
    if (precioDescuento >= precioOriginal) {
        throw new Error("Fallo de Seguridad/Negocio: El descuento no puede ser mayor o igual al precio original.");
    }
    return true;
}

try {
    // Simulamos la verificación de un Pack de Empanadas (Original: 25, Descuento: 8.50)
    validarReglaDescuento(25.00, 8.50);
    console.log("✅ Prueba Pasada: Regla de precios correcta.");
    console.log("✅ Prueba Pasada: Simulación de transacción de stock exitosa.");
    console.log("=============================================");
    process.exit(0); // El código 0 le dice a GitHub que la prueba fue un éxito
} catch (error) {
    console.error("❌ Prueba Fallida:", error.message);
    process.exit(1); // El código 1 le dice a GitHub que detenga el pase a producción
}