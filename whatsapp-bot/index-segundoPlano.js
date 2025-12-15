const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { BrowserFetcher } = require('@puppeteer/browsers');

const app = express();
app.use(bodyParser.json());

let qrCodeUrl = null;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('qr', async qr => {
    console.log('📲 QR disponible en la ruta /qr. Abre http://localhost:3001/qr en tu navegador.');
    try {
        qrCodeUrl = await qrcode.toDataURL(qr);
    } catch (err) {
        console.error('Error al generar el QR:', err);
    }
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
});

client.on('auth_failure', (message) => {
    console.error('❌ Error de autenticación:', message);
    console.log('Por favor, borra la carpeta ".wwebjs_auth" e intenta de nuevo.');
});

client.on('disconnected', (reason) => {
    console.log('❌ Cliente de WhatsApp desconectado. Motivo:', reason);
});

app.get('/qr', (req, res) => {
    if (qrCodeUrl) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Código QR de WhatsApp</title>
                <style>
                    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f0f2f5; }
                    .container { text-align: center; background: white; padding: 2em; border-radius: 1em; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                    h1 { color: #128c7e; }
                    img { width: 300px; height: 300px; border: 1px solid #ddd; border-radius: 8px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Escanea este código QR</h1>
                    <p>Usa tu celular para escanear y conectar tu cuenta de WhatsApp.</p>
                    <img src="${qrCodeUrl}" alt="Código QR de WhatsApp">
                    <p>Si la imagen no carga, recarga la página.</p>
                </div>
            </body>
            </html>
        `;
        res.send(html);
    } else {
        res.status(200).send('<h1>Generando QR...</h1><p>Por favor, espera unos segundos y recarga la página.</p>');
    }
});

app.post('/enviar', async (req, res) => {
    const { telefono, mensaje, pdfUrl } = req.body;
    console.log(`[DEBUG] Recibida solicitud para: ${telefono}`);
    console.log(`[DEBUG] Mensaje: "${mensaje}"`);
    console.log(`[DEBUG] URL del PDF recibida: "${pdfUrl}"`);

    if (!telefono || !mensaje || !pdfUrl) {
        return res.status(400).json({ error: 'Faltan datos requeridos (telefono, mensaje, pdfUrl).' });
    }

    if (!client.isReady) {
        console.error('❌ Error: Cliente de WhatsApp no está listo o conectado.');
        return res.status(503).json({ error: 'El servicio de WhatsApp no está disponible.' });
    }

    try {
        console.log(`[DEBUG] Intentando enviar mensaje de texto a ${telefono}...`);
        await client.sendMessage(`${telefono}@c.us`, mensaje);
        console.log(`[DEBUG] Mensaje de texto enviado con éxito a ${telefono}.`);

        console.log(`[DEBUG] Intentando crear objeto MessageMedia desde URL: ${pdfUrl}`);
        const mediaAttachment = await MessageMedia.fromUrl(pdfUrl, { unsafeMime: true });
        
        console.log(`[DEBUG] Objeto MessageMedia creado:`, mediaAttachment);

        console.log(`[DEBUG] Intentando enviar PDF a ${telefono}...`);
        const mediaResult = await client.sendMessage(`${telefono}@c.us`, mediaAttachment, {
            caption: '📄 CERTIFICADO CBR',
            fileName: 'solicitud.pdf'
        });
        
        console.log(`[DEBUG] Resultado de envío de PDF:`, mediaResult);

        res.json({ success: true, messageId: mediaResult.id.id });
    } catch (err) {
        console.error('❌ Error al enviar:', err);
        res.status(500).json({ error: 'No se pudo enviar el mensaje o el PDF.' });
    }
});

client.initialize();

app.listen(3001, () => {
    console.log('🚀 Servidor Node escuchando en http://localhost:3001');
});
