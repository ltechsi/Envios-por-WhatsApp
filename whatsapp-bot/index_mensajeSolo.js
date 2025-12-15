const express = require('express');
const bodyParser = require('body-parser');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');

// Importar el módulo de path para manejar rutas de archivos
const path = require('path');

// Inicializar Express y BodyParser
const app = express();
app.use(bodyParser.json());

// Argumentos para Puppeteer
const puppeteerArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox'
];

// Inicializar el cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '.wwebjs_auth')
    }),
    puppeteer: {
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
client.initialize();
