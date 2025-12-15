<?php
// Configuración de la conexión a la base de datos
$host = 'localhost';
$user = 'root';
$password = '';
$dbname = 'pdfblob';

$conn = new mysqli($host, $user, $password, $dbname);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Obtener los parámetros de la URL (GET)
$numero = $_GET['numero'] ?? '';
$foja = $_GET['foja'] ?? '';
$nombre = $_GET['nombre'] ?? '';
$tipo = $_GET['tipo'] ?? '';

if ($numero && $foja) {
    $stmt = $conn->prepare("SELECT documento FROM documentos WHERE numero = ? AND foja = ? AND nombre = ? AND tipo = ? LIMIT 1");
    $stmt->bind_param("isss", $numero, $foja, $nombre, $tipo);
    $stmt->execute();
    $stmt->store_result();
    
    if ($stmt->num_rows > 0) {
        $stmt->bind_result($documentoPDF);
        $stmt->fetch();
        
        // Definimos el nombre de archivo que la API espera
        $nombreArchivoFijo = "certificado-wp.pdf";
        
        // Guardamos el documento de la base de datos en el archivo
        file_put_contents($nombreArchivoFijo, $documentoPDF);
        
        echo "Documento guardado en el servidor como: " . $nombreArchivoFijo . ". Ahora puedes enviarlo por WhatsApp.";
        
    } else {
        echo "Documento no encontrado en la base de datos.";
    }
    
    $stmt->close();
} else {
    echo "Faltan parámetros para guardar el documento.";
}

$conn->close();
?>