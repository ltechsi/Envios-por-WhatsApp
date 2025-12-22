<?php
// Configuración de la conexión a la base de datos
$host = 'localhost';
$user = 'root';
$password = '';
$dbname = 'pdfblob';

// Crear la conexión a la base de datos
$conn = new mysqli($host, $user, $password, $dbname);

// Manejar errores de conexión
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Error de conexión: ' . $conn->connect_error]));
}

// Obtener la acción y el número de la URL
$action = $_GET['action'] ?? '';
$numero_actual = $_GET['numero'] ?? 0;

$sql = "";
$message = "";
$data = [];

// Lógica para cada acción
switch ($action) {
    case 'search':
        $sql = "SELECT numero, nombre, rut, telefono, estado FROM cardex WHERE numero = ? LIMIT 1";
        $message = "Registro encontrado.";
        break;

    case 'next':
        $sql = "SELECT numero, nombre, rut, telefono, estado FROM cardex WHERE numero > ? ORDER BY numero ASC LIMIT 1";
        $message = "Siguiente registro.";
        break;

    case 'previous':
        $sql = "SELECT numero, nombre, rut, telefono, estado FROM cardex WHERE numero < ? ORDER BY numero DESC LIMIT 1";
        $message = "Registro anterior.";
        break;
    
    default:
        die(json_encode(['success' => false, 'message' => 'Acción no válida.']));
}

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $numero_actual);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $data = [
        'success' => true,
        'message' => $message,
        'numero' => $row['numero'],
        'nombre' => $row['nombre'],
        'rut' => $row['rut'],
        
        'telefono' => $row['telefono'],
        'estado' => $row['estado']
    ];
} else {
    $data = ['success' => false, 'message' => 'No se encontraron más registros.'];
}

header('Content-Type: application/json');
echo json_encode($data);

$stmt->close();
$conn->close();
?>