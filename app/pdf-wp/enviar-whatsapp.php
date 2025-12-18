<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');
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


// Incluir el archivo para registrar el envío.
require_once 'registrar-envio.php';


// Obtener el número de carátula del formulario
$numero_formulario = $_POST['numero'] ?? '';


if (empty($numero_formulario)) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Error: El número de carátula es requerido.']);
    exit;
}


// 1. Validar el estado 'CARDEX', 'DESPACHADO' o 'PRESUNTIVA' antes de proceder
$sql_estado = "SELECT estado FROM cardex WHERE numero = ? LIMIT 1";
$stmt_estado = $conn->prepare($sql_estado);
$stmt_estado->bind_param("i", $numero_formulario);
$stmt_estado->execute();
$stmt_estado->store_result();


if ($stmt_estado->num_rows > 0) {
    $stmt_estado->bind_result($estado);
    $stmt_estado->fetch();
    $stmt_estado->close();

    // -- INICIO BLOQUE MODIFICADO --
    if ($estado === 'PRESUNTIVA') {
        // Buscar nombre y teléfono en cardex (puedes agregar JOIN si quieres más datos)
        $sql_datos = "SELECT nombre, telefono FROM cardex WHERE numero = ? LIMIT 1";
        $stmt = $conn->prepare($sql_datos);
        $stmt->bind_param("i", $numero_formulario);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows > 0) {
            $stmt->bind_result($documentoNombre, $documentoTelefono);
            $stmt->fetch();
            $stmt->close();

            // Buscar la razón en cardex_presuntiva
            $sql_pres = "SELECT presuntiva FROM cardex_presuntiva WHERE numero = ? LIMIT 1";
            $stmt_pres = $conn->prepare($sql_pres);
            $stmt_pres->bind_param("i", $numero_formulario);
            $stmt_pres->execute();
            $stmt_pres->store_result();

            if ($stmt_pres->num_rows > 0) {
                $stmt_pres->bind_result($razon_presuntiva);
                $stmt_pres->fetch();
                $stmt_pres->close();

                // Construir mensaje especial
                $mensaje = "Le informamos que no fue posible entregarle el documento solicitado a través de la Plataforma Web del Conservador de Bienes Raíces.\n\nLa razón es la siguiente: $razon_presuntiva\n\nPor favor no responder a este mensaje, se envía desde una herramienta de gestión.";

                // Preparar los datos para la API de WhatsApp (sin PDF)
                $data = [
                    "telefono" => $documentoTelefono,
                    "mensaje" => $mensaje
                ];

                // Iniciar cURL para enviar los datos JSON
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, "http://192.168.1.134:3001/enviar"); // URL del bot
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

                $response = curl_exec($ch);

                if (curl_errno($ch)) {
                    header('Content-Type: application/json');
                    echo json_encode(['success' => false, 'message' => 'Error de cURL: ' . curl_error($ch)]);
                } else {
                    $result = json_decode($response, true);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        header('Content-Type: application/json');
                        echo json_encode(['success' => false, 'message' => 'Error: La respuesta del servidor no es un JSON válido. Respuesta recibida: ' . $response]);
                    } else if ($result['success'] ?? false) {
                        registrarEnvio($conn, $numero_formulario, $documentoTelefono, $documentoNombre, $estado);
                        header('Content-Type: application/json');
                        echo json_encode(['success' => true, 'message' => "Mensaje especial enviado correctamente al destinatario."]);
                    } else {
                        header('Content-Type: application/json');
                        echo json_encode(['success' => false, 'message' => "Hubo un error inesperado al enviar el mensaje especial. Mensaje del servidor: " . ($result['error'] ?? 'No se recibió mensaje de error.')]);
                    }
                }
                curl_close($ch);
            } else {
                echo json_encode(['success' => false, 'message' => "No se encontró información de presuntiva para el número de carátula proporcionado en la tabla cardex_presuntiva."]);
            }
        } else {
            echo json_encode(['success' => false, 'message' => "No se encontró información básica para el número de carátula proporcionado."]);
        }
        $conn->close();
        exit; // Termina el script después de tratar 'PRESUNTIVA'
    } else if ($estado !== 'KARDEX' && $estado !== 'DESPACHADO') {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Documento no listo para enviar. El estado actual es: ' . $estado]);
        exit;
    }
    // -- FIN BLOQUE MODIFICADO --

} else {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Documento no encontrado en la base de datos.']);
    exit;
}


// (Todo el resto de tu procesamiento actual para CARDEX/DESPACHADO sigue sin cambios)


// 2. Buscar nombre y teléfono en cardex + obtener info en certificados_listo
$sql_datos = "SELECT t1.nombre, t1.telefono, t2.fecha, t2.numero_firma 
              FROM cardex AS t1 
              JOIN certificados_listo AS t2 ON t1.numero = t2.caratula 
              WHERE t1.numero = ? LIMIT 1";
$stmt = $conn->prepare($sql_datos);
$stmt->bind_param("i", $numero_formulario);
$stmt->execute();
$stmt->store_result();


if ($stmt->num_rows > 0) {
    $stmt->bind_result($documentoNombre, $documentoTelefono, $documentoFecha, $documentoNumeroFirma);
    $stmt->fetch();
    $stmt->close();


    // 3. Construir el nombre de la tabla mensual según la fecha encontrada
    $anio = date('Y', strtotime($documentoFecha));
    $mes = date('m', strtotime($documentoFecha));
    $tablaMensual = "certificados_listo_{$anio}_{$mes}";


    // 4. Buscar el PDF en la tabla mensual por el numero_firma
    $sql_blob = "SELECT data FROM $tablaMensual WHERE numero_firma = ? LIMIT 1";
    $stmt_blob = $conn->prepare($sql_blob);
    if (!$stmt_blob) {
        echo json_encode(['success' => false, 'message' => 'Error SQL al preparar la consulta. Verifica que la tabla exista: ' . $tablaMensual . '. Detalle: ' . $conn->error]);
        exit;
    }
    $stmt_blob->bind_param("s", $documentoNumeroFirma);
    $stmt_blob->execute();
    $result_blob = $stmt_blob->get_result();


    if ($rowBlob = $result_blob->fetch_assoc()) {
        $documentoPDF = $rowBlob['data'];


        // Crear el archivo temporal
        $nombreArchivoTemporal = "certificado-wp-" . uniqid() . ".pdf";
        $rutaArchivoLocal = $nombreArchivoTemporal;
        file_put_contents($rutaArchivoLocal, $documentoPDF);


        // Definir la URL pública para el bot
        $pdfUrl = "http://192.168.1.134/pdf-wp/" . $nombreArchivoTemporal;


        // Definir el mensaje personalizado
        $mensaje = "Cordial saludo estimado(a) " . $documentoNombre . ", le estamos enviando el documento solicitado a través de la Plataforma Web del Conservador de Bienes Raíces. \n\nPor favor no responder a este mensaje, se envía desde una herramienta de gestión.";


        // Preparar los datos para la API de WhatsApp, incluyendo la URL del PDF
        $data = [
            "telefono" => $documentoTelefono,
            "mensaje" => $mensaje,
            "pdfUrl" => $pdfUrl
        ];


        // Iniciar cURL para enviar los datos JSON
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "http://192.168.1.134:3001/enviar"); // URL del bot
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);


        $response = curl_exec($ch);


        if (curl_errno($ch)) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Error de cURL: ' . curl_error($ch)]);
        } else {
            $result = json_decode($response, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                header('Content-Type: application/json');
                echo json_encode(['success' => false, 'message' => 'Error: La respuesta del servidor no es un JSON válido. Respuesta recibida: ' . $response]);
            } else if ($result['success'] ?? false) {
                registrarEnvio($conn, $numero_formulario, $documentoTelefono, $documentoNombre, $estado);
                header('Content-Type: application/json');
                echo json_encode(['success' => true, 'message' => "🎉 ¡Listo! Tu mensaje con el documento PDF ha sido enviado exitosamente."]);
            } else {
                header('Content-Type: application/json');
                echo json_encode(['success' => false, 'message' => "Hubo un error inesperado al enviar el mensaje. Mensaje del servidor: " . ($result['error'] ?? 'No se recibió mensaje de error.')]);
            }
        }


        curl_close($ch);
        unlink($rutaArchivoLocal);
    } else {
        echo json_encode(['success' => false, 'message' => "No se encontró el PDF para ese número de firma en la tabla mensual (" . $tablaMensual . ")."]);
    }
} else {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => "Documento no encontrado en la base de datos para el número de carátula proporcionado."]);
}


$conn->close();
?>
