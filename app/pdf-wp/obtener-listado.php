<?php
// Configuración de la conexión a la base de datos
$host = 'localhost';
$user = 'root';
$password = '';
$dbname = 'pdfblob';

// Crear la conexión a la base de datos
$conn = new mysqli($host, $user, $password, $dbname);
if ($conn->connect_error) {
    header('Content-Type: application/json');
    die(json_encode(['success' => false, 'message' => 'Error de conexión: ' . $conn->connect_error]));
}

header('Content-Type: application/json');

// Obtener las fechas de inicio y fin para el filtro masivo
$from_date = $_GET['from_date'] ?? null;
$to_date = $_GET['to_date'] ?? null;

if (empty($from_date) || empty($to_date)) {
    echo json_encode(['success' => false, 'message' => 'Las fechas son requeridas.']);
    exit;
}

// Consulta SQL para obtener los documentos
$sql = "SELECT numero, nombre, estado, ultima_mod FROM cardex
        WHERE (estado = 'CARDEX' OR estado = 'DESPACHADO') AND ultima_mod BETWEEN ? AND ?
        ORDER BY numero ASC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $from_date, $to_date);
$stmt->execute();
$result = $stmt->get_result();

$documents = [];
while ($row = $result->fetch_assoc()) {
    $documents[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'data' => $documents]);
?>