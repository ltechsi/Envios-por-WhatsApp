<?php
// Configuración de la conexión a la base de datos
$host = 'localhost';
$user = 'root';
$password = '';
$dbname = 'pdfblob';

// Crear la conexión a la base de datos
$conn = new mysqli($host, $user, $password, $dbname);
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos.']));
}

header('Content-Type: application/json');

// Obtener el número de carátula de la URL
$numero = $_GET['numero'] ?? '';

if (empty($numero)) {
    echo json_encode(['success' => false, 'message' => 'Número de carátula es requerido.']);
    $conn->close();
    exit;
}

// Verificar si el documento ya fue enviado
$sql = "SELECT COUNT(*) AS count FROM envios_whatsapp WHERE numero_caratula = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $numero);
$stmt->execute();
$stmt->bind_result($envio_count);
$stmt->fetch();
$stmt->close();
$conn->close();

if ($envio_count > 0) {
    echo json_encode([
        'success' => true,
        'message' => 'El documento ya ha sido enviado. ¿Estás seguro de que quieres reenviarlo?',
        'alreadySent' => true
    ]);
} else {
    echo json_encode([
        'success' => true,
        'message' => 'El documento no ha sido enviado previamente.',
        'alreadySent' => false
    ]);
}
?>