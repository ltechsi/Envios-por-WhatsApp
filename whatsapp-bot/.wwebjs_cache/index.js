const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.on('qr', qr => {
    console.log('📲 Escanea este QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado!');
});

// Ruta para recibir solicitudes desde PHP
app.post('/enviar', async (req, res) => {
    const { telefono, mensaje, pdfUrl } = req.body;

    if (!telefono || !mensaje || !pdfUrl) {
        return res.status(400).json({ error: 'Faltan datos requeridos.' });
    }

    try {
        // Enviar mensaje de texto
        await client.sendMessage(`${telefono}@c.us`, mensaje);

        // Enviar el archivo PDF
        const media = await client.sendMessage(`${telefono}@c.us`, {
            body: '📄 Aquí tienes tu archivo PDF',
            media: {
                url: pdfUrl,
                mimetype: 'application/pdf',
                filename: 'solicitud.pdf'
            }
        });

        res.json({ success: true, messageId: media.id.id });
    } catch (err) {
        console.error('❌ Error al enviar:', err);
        res.status(500).json({ error: 'No se pudo enviar el mensaje.' });
    }
});

client.initialize();

app.listen(3000, () => {
    console.log('🚀 Servidor Node escuchando en http://localhost:3000');
});
