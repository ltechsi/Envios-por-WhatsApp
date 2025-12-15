const express = require('express');
const bodyParser = require('body-parser');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');

// Importar el módulo de path para manejar rutas de archivos
const path = require('path');
const fs = require('fs');

// LIMPIEZA AUTOMÁTICA DE SESIÓN AL INICIO
// Borra la carpeta .wwebjs_auth para forzar un nuevo inicio de sesión cada vez
const authPath = path.join(process.cwd(), '.wwebjs_auth');
if (fs.existsSync(authPath)) {
    try {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log('🧹 Sesión de WhatsApp (.wwebjs_auth) eliminada correctamente.');
    } catch (err) {
        console.error('⚠️ No se pudo eliminar la sesión:', err);
    }
}

// Inicializar Express y BodyParser
const app = express();
app.use(bodyParser.json());


// Función para encontrar el ejecutable de Chrome en Windows
function getChromeExecutablePath() {
    const paths = [
        process.env.CHROME_PATH, // Permite sobrescribir con variable de entorno
        process.env.PUPPETEER_EXECUTABLE_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', // Fallback a Edge
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];

    for (const p of paths) {
        if (p && fs.existsSync(p)) {
            return p;
        }
    }
    return null;
}

// Argumentos para Puppeteer
const puppeteerArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox'
];

// Detectar Chrome
const executablePath = getChromeExecutablePath();
if (executablePath) {
    console.log(`✅ Navegador detectado en: ${executablePath}`);
} else {
    console.warn('⚠️ No se encontró Chrome ni Edge instalado. Es posible que falle si no hay un navegador disponible.');
}

// Inicializar el cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        // Usar process.cwd() para guardar la sesión en la carpeta donde se ejecuta el .exe
        dataPath: path.join(process.cwd(), '.wwebjs_auth')
    }),
    puppeteer: {
        executablePath: executablePath, // Usar el Chrome del sistema
        args: puppeteerArgs,
        headless: true // Cambia a false si necesitas ver el navegador
    }
});

// Evento cuando el QR está disponible
client.on('qr', (qr) => {
    console.log('📲 QR disponible en la ruta /qr. Abre http://localhost:3001/qr en tu navegador.');
    qrcode.generate(qr, { small: true });
});

// Evento cuando el cliente está listo
client.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
});

// Evento para fallos de autenticación
client.on('auth_failure', (msg) => {
    console.error('❌ Error de autenticación:', msg);
});

// Middleware para servir el QR
app.get('/qr', (req, res) => {
    client.getState()
        .then(state => {
            if (state === 'CONNECTED') {
                return res.send('¡Ya estás conectado!');
            }
            client.getQR()
                .then(qr => {
                    if (qr) {
                        res.send(`
                            <img src="https://api.qrserver.com/v1/create-qr-code/?data=${qr}&size=200x200" alt="Código QR">
                            <p>Escanea este código con tu teléfono para iniciar sesión.</p>
                        `);
                    } else {
                        res.send('El código QR aún no está disponible. Por favor, espera.');
                    }
                })
                .catch(err => {
                    console.error('Error al generar QR:', err);
                    res.status(500).send('Error al generar el código QR.');
                });
        })
        .catch(err => {
            console.error('Error al obtener estado del cliente:', err);
            res.status(500).send('Error al obtener el estado del cliente.');
        });
});

// Endpoint para enviar mensajes y archivos
app.post('/enviar', async (req, res) => {
    try {
        const { telefono, mensaje, pdfUrl } = req.body;

        if (!telefono || !mensaje) {
            return res.status(400).json({ success: false, error: 'Faltan datos requeridos (telefono, mensaje).' });
        }

        const chatId = `${telefono}@c.us`; // Formato del chat para números chilenos

        let media = null;
        if (pdfUrl) {
            try {
                const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
                media = new MessageMedia('application/pdf', Buffer.from(response.data).toString('base64'), 'documento.pdf');
            } catch (error) {
                console.error('❌ Error al descargar el PDF:', error);
                return res.status(500).json({ success: false, error: 'Hubo un error al descargar el PDF.' });
            }
        }

        // Verificar si el cliente está listo antes de enviar
        const isReady = await client.getState() === 'CONNECTED';
        if (!isReady) {
            console.error('❌ El servicio de WhatsApp no está disponible. Inténtalo de nuevo más tarde.');
            return res.status(503).json({ success: false, error: 'El servicio de WhatsApp no está disponible.' });
        }

        // Envía el mensaje con o sin el archivo
        if (media) {
            await client.sendMessage(chatId, media, { caption: mensaje });
        } else {
            await client.sendMessage(chatId, mensaje);
        }

        console.log(`✅ Mensaje enviado a ${telefono}`);
        return res.status(200).json({ success: true, message: 'Mensaje enviado exitosamente.' });

    } catch (error) {
        console.error('❌ Error en el endpoint /enviar:', error);
        return res.status(500).json({ success: false, error: 'Hubo un error inesperado al enviar el mensaje.' });
    }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
client.on('ready', () => {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor Node escuchando en http://localhost:${PORT}`);
    });
});
// --- SISTEMA DE LICENCIAS ---
const LICENSE_URL = 'https://heretechsi.space/cbr/licencias.txt'; //  REEMPLAZAR CON TU URL DE VALIDACIÓN DE LICENCIAS

async function validarLicencia() {
    console.log('\n🔐 Verificando licencia...');
    const licensePath = path.join(process.cwd(), 'licencia.txt');

    // 1. Verificar si existe el archivo
    if (!fs.existsSync(licensePath)) {
        console.error('❌ ERROR: Archivo licencia.txt no encontrado.');
        console.error('👉 Por favor crea un archivo llamado "licencia.txt" junto al ejecutable con tu clave de producto.');
        console.log('⏳ Cerrando en 10 segundos...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        process.exit(1);
    }

    // 2. Leer la clave
    const userKey = fs.readFileSync(licensePath, 'utf8').trim();
    if (!userKey) {
        console.error('❌ ERROR: El archivo licencia.txt está vacío.');
        console.log('⏳ Cerrando en 10 segundos...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        process.exit(1);
    }

    console.log(`🔑 Clave detectada: ${userKey}`);

    // 3. Validar online
    try {
        console.log(`🌍 Conectando al servidor de licencias...`);
        // Para pruebas, si la URL es la de ejemplo, fallará controladamente.
        if (LICENSE_URL.includes('gist.githubusercontent.com/USUARIO')) {
            console.warn('⚠️ ADVERTENCIA: Estás usando la URL de ejemplo. La validación fallará.');
        }

        const response = await axios.get(LICENSE_URL);
        const validKeys = response.data; // Puede ser string (archivo raw) o objeto/array JSON

        let isValid = false;

        // Soporte para JSON array o archivo de texto plano (una clave por línea)
        if (Array.isArray(validKeys)) {
            isValid = validKeys.includes(userKey);
        } else if (typeof validKeys === 'string') {
            isValid = validKeys.includes(userKey);
        }

        if (isValid) {
            console.log('✅ LICENCIA VÁLIDA. Iniciando sistema...\n');
            return true;
        } else {
            console.error('\n⛔ ACCESO DENEGADO: Tu licencia no está en la lista de permitidos.');
            console.error('   Contacta al administrador para renovar o adquirir acceso.');
            console.log('⏳ Cerrando aplicación...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ ERROR DE CONEXIÓN AL SERVIDOR DE LICENCIAS.');
        console.error(`   Detalle: ${error.message}`);
        console.error('   Verifica tu conexión a internet y la URL del servidor.');

        // Bloquear si no hay internet (fail-secure)
        console.log('⏳ Cerrando aplicación...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        process.exit(1);
    }
}

// Función principal de arranque
const startApp = async () => {
    await validarLicencia();
    // Si pasa la validación, inicia WhatsApp
    client.initialize();
};

startApp();
// client.initialize(); // Reemplazado por startApp()

// Manejo de errores globales para que la ventana NO se cierre inmediatamente
process.on('uncaughtException', (err) => {
    console.error('❌ ERROR FATAL NO CAPTURADO:', err);
    console.log('⏳ La aplicación se cerrará en 30 segundos...');
    setTimeout(() => process.exit(1), 30000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ PROMESA RECHAZADA SIN MANEJO:', reason);
    // No salimos del proceso aquí, solo logueamos
});
