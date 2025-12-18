<?php
// Configuración de la conexión a la base de datos
$host = 'localhost';
$user = 'root';
$password = '';
$dbname = 'pdfblob';

// Función para registrar un envío en la base de datos
// La conexión se pasa como argumento para que la función no la cierre
function registrarEnvio($conn, $numeroCaratula, $telefono, $nombre, $estado) {
    // SQL para crear la tabla si no existe
    $sql_create_table = "CREATE TABLE IF NOT EXISTS envios_whatsapp (
        id INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        numero_caratula INT(11) NOT NULL,
        telefono VARCHAR(50) NOT NULL,
        nombre_cliente VARCHAR(255) NOT NULL,
        estado VARCHAR(50) NOT NULL,
        fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    $conn->query($sql_create_table);
    
    // Consulta para insertar el registro de envío
    $sql = "INSERT INTO envios_whatsapp (numero_caratula, telefono, nombre_cliente, estado, fecha_envio) VALUES (?, ?, ?, ?, NOW())";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("isss", $numeroCaratula, $telefono, $nombre, $estado);

    if ($stmt->execute()) {
        return true;
    } else {
        return false;
    }
}
?>
