const express = require('express');
const bodyParser = require('body-parser');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Inicializar Express
const app = express();
app.use(bodyParser.json());

// --------------------------------------------------------------------------------
// CONFIGURACIÓN PARA EXE (PKG)
// --------------------------------------------------------------------------------
// 1. Chrome Path
function getChromeExecutablePath() {
    const paths = [
        process.env.CHROME_PATH,
        process.env.PUPPETEER_EXECUTABLE_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of paths) { if (p && fs.existsSync(p)) return p; }
    return null;
}

const executablePath = getChromeExecutablePath();
if (executablePath) console.log(`✅ Navegador detectado: ${executablePath}`);

// 2. Client Setup (con process.cwd para EXE)
// Argumentos para Puppeteer (Optimizados para estabilidad en EXE)
const puppeteerArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu'
];
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(process.cwd(), '.wwebjs_auth') // Backup usaba __dirname, aquí debe ser cwd
    }),
    puppeteer: {
        executablePath: executablePath,
        args: puppeteerArgs,
        headless: true
    }
});

// 3. Parche Anti-EBUSY (Necesario para EXE, aunque el backup no lo tenía)
if (client.authStrategy) {
    client.authStrategy.logout = async function () {
        console.log('🛡️ (Parche) Evitando borrado de sesión para prevenir crash EBUSY.');
        return;
    };
}

// 4. Función de Limpieza de Sesión (Para auto-reparación)
async function cleanupSession() {
    const authPath = path.join(process.cwd(), '.wwebjs_auth');
    console.log(`🧹 Intentando limpiar sesión en: ${authPath}`);

    try {
        // Intentar cerrar el cliente si está activo para liberar archivos
        if (client) await client.destroy();
    } catch (e) {
        console.error('Detalle destroy (ignorable):', e.message);
    }

    if (fs.existsSync(authPath)) {
        try {
            // Forzar borrado recursivo
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log('✅ Carpeta .wwebjs_auth eliminada correctamente.');
            return true;
        } catch (err) {
            console.error('❌ No se pudo eliminar .wwebjs_auth automáticamente:', err.message);
            console.log('👉 Tip: Cierra el programa y bórrala manualmente si el error persiste.');
            return false;
        }
    }
    return true;
}

// --------------------------------------------------------------------------------
// EVENTOS DEL CLIENTE (Igual al Backup)
// --------------------------------------------------------------------------------
client.on('qr', (qr) => {
    console.log('📲 QR disponible. Abre http://localhost:3001/qr');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
});

client.on('auth_failure', async (msg) => {
    console.error('❌ Error de autenticación:', msg);
    console.log('🔄 Iniciando auto-reparación en 5 segundos...');
    setTimeout(async () => {
        await cleanupSession();
        console.log('⚙️ El bot se cerrará. Por favor, ábrelo de nuevo para generar un nuevo QR.');
        process.exit(1);
    }, 5000);
});

// Reinicio automático si se desconecta (Feature extra para estabilidad)
client.on('disconnected', (reason) => {
    console.log('⚠️ Desconectado:', reason);
    console.log('🔄 Reiniciando en 5s...');
    setTimeout(() => {
        try { client.destroy(); client.initialize(); } catch (e) { }
    }, 5000);
});


// --------------------------------------------------------------------------------
// SERVER Y RUTAS
// --------------------------------------------------------------------------------
app.get('/qr', (req, res) => {
    client.getState().then(state => {
        if (state === 'CONNECTED') return res.send('Ya conectado.');
        client.getQR().then(qr => {
            if (qr) res.send(`<img src="https://api.qrserver.com/v1/create-qr-code/?data=${qr}&size=200x200">`);
            else res.send('Esperando QR...');
        });
    }).catch(e => res.status(500).send(e.toString()));
});

// Endpoint para reparación manual
app.get('/reparar', async (req, res) => {
    try {
        console.log('🛠️ Iniciando reparación manual desde la Web...');
        res.send('<h1>Procesando reparación...</h1><p>La sesión será eliminada. La ventana del bot se cerrará en breve. <b>Vuelve a abrir el programa</b> para reconectar.</p>');
        
        setTimeout(async () => {
            await cleanupSession();
            process.exit(0);
        }, 2000);
    } catch (e) {
        console.error('Error en reparación manual:', e.message);
        if (!res.headersSent) res.status(500).send('Error: ' + e.message);
    }
});

// Mutex (Cola) para evitar colisiones en Puppeteer
// Puppeteer no soporta evaluaciones paralelas bien, así que encolamos las peticiones.
let messageQueue = Promise.resolve();

// Endpoint /enviar
app.post('/enviar', async (req, res) => {

    // Función que procesa el envío (encapsulada)
    const processMessage = async () => {
        let attempts = 0;
        const MAX_RETRIES = 2; // Intentos internos de "Curación"

        while (attempts <= MAX_RETRIES) {
            attempts++;
            try {
                const { telefono, mensaje, pdfUrl } = req.body;

                if (!telefono || !mensaje) {
                    if (!res.headersSent) res.status(400).json({ success: false, error: 'Faltan datos.' });
                    return;
                }

                const chatId = `${telefono}@c.us`;

                let media = null;
                if (pdfUrl) {
                    try {
                        const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
                        media = new MessageMedia('application/pdf', Buffer.from(response.data).toString('base64'), 'documento.pdf');
                    } catch (error) {
                        console.error('Error descarga PDF:', error.message);
                        if (!res.headersSent) res.status(500).json({ success: false, error: 'Error descargando PDF' });
                        return;
                    }
                }

                const state = await client.getState();
                if (state !== 'CONNECTED') {
                    // Si no está conectado, intentamos reconexión rápida
                    console.warn('⚠️ Cliente desconectado. Intentando esperar 5s...');
                    await new Promise(r => setTimeout(r, 5000));
                    if ((await client.getState()) !== 'CONNECTED') {
                        throw new Error('CLIENT_DISCONNECTED_PERSISTENT');
                    }
                }

                // Enviar
                if (media) {
                    await client.sendMessage(chatId, media, { caption: mensaje });
                } else {
                    await client.sendMessage(chatId, mensaje);
                }

                console.log(`✅ Enviado a ${telefono}`);
                // Delay de estabilidad
                await new Promise(r => setTimeout(r, 1000));

                if (!res.headersSent) res.json({ success: true, message: 'Enviado' });
                return; // Éxito, salimos del bucle

            } catch (error) {
                console.error(`❌ Error Intento ${attempts}:`, error.message);

                // Detectar errores fatales de Puppeteer
                const isFatal = error.message.includes('Evaluation failed') ||
                    error.message.includes('Protocol error') ||
                    error.message.includes('Target closed') ||
                    error.message.includes('CLIENT_DISCONNECTED_PERSISTENT');

                if (isFatal && attempts <= MAX_RETRIES) {
                    console.log('☢️ ERROR CRÍTICO DETECTADO. INICIANDO PROTOCOLO DE AUTO-CURACIÓN...');
                    console.log('🔄 Reiniciando navegador interno...');

                    try {
                        await client.destroy();
                    } catch (e) { console.error('Error destroy:', e.message); }

                    // Reiniciar
                    client.initialize();

                    console.log('⏳ Esperando reconexión (15s)...');
                    await new Promise(r => setTimeout(r, 15000)); // Esperar a que levante
                    console.log('🔄 Reintentando envío...');
                    continue; // Volver al inicio del while
                } else {
                    // Si no es fatal o ya agotamos intentos
                    if (!res.headersSent) res.status(500).json({ success: false, error: error.message });
                    return;
                }
            }
        }
    };

    // Agregamos a la cola
    messageQueue = messageQueue
        .then(() => processMessage())
        .catch(err => {
            console.error("Error crítico en cola:", err);
            if (!res.headersSent) res.status(500).send("Error interno de cola");
        });
});

// --------------------------------------------------------------------------------
// SISTEMA DE LICENCIAS (Mantenemos validación mínima al inicio)
// --------------------------------------------------------------------------------
async function validarLicencia() {
    try {
        const licensePath = path.join(process.cwd(), 'licencia.txt');
        if (!fs.existsSync(licensePath)) return false;
        const key = fs.readFileSync(licensePath, 'utf8').trim();
        if (!key) return false;
        const resp = await axios.get('https://heretechsi.space/cbr/licencias.txt');
        const validKeys = resp.data;
        if (Array.isArray(validKeys)) return validKeys.includes(key);
        if (typeof validKeys === 'string') return validKeys.includes(key);
        return false;
    } catch (e) {
        console.error('Error licencia:', e.message);
        return false;
    }
}

// Manejo global de errores (Para que no se cierre la ventana)
process.on('uncaughtException', (err) => console.error('⚠️ Error no capturado:', err.message));
process.on('unhandledRejection', (r) => console.error('⚠️ Promesa rechazada:', r));

// ARRANQUE
const PORT = process.env.PORT || 3001;
validarLicencia().then(isValid => {
    if (isValid) {
        console.log('✅ Licencia OK.');
        client.initialize();
        app.listen(PORT, () => console.log(`🚀 Bot listo en puerto ${PORT}`));
    } else {
        console.error('❌ Licencia inválida o error de conexión. Cerrando...');
        setTimeout(() => process.exit(1), 5000);
    }
});
