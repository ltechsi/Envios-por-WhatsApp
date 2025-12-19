const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');


const app = express();
const PORT = 3000;
const multer = require('multer');
const upload = multer();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(upload.array()); // Parse multipart/form-data for all routes or specific ones

// --- Database Configuration (Loaded from config.php) ---
function loadConfig() {
    const configPath = path.join(process.cwd(), 'config.php');

    let config = {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'cons_palto',
        charset: 'utf8mb4'
    };

    try {
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');

            // Regex handles single and double quotes
            const hostMatch = content.match(/\$servername\s*=\s*["'](.+?)["']/);
            const userMatch = content.match(/\$username\s*=\s*["'](.*?)["']/);
            const passMatch = content.match(/\$password\s*=\s*["'](.*?)["']/);
            const dbMatch = content.match(/\$dbname\s*=\s*["'](.+?)["']/);

            if (hostMatch) config.host = hostMatch[1];
            if (userMatch) config.user = userMatch[1];
            if (passMatch) config.password = passMatch[1];
            if (dbMatch) config.database = dbMatch[1];

            console.log(`Configuración cargada desde config.php: ${config.host}@${config.database}`);
        } else {
            console.log('No se encontró config.php, usando valores por defecto.');
        }
    } catch (err) {
        console.error('Error leyendo config.php:', err.message);
    }
    return config;
}

const dbConfig = loadConfig();

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Helper function: Register Send
async function registrarEnvio(numeroCaratula, telefono, nombre, estado) {
    try {
        const createTableSql = `
            CREATE TABLE IF NOT EXISTS envios_whatsapp (
                id INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                numero_caratula INT(11) NOT NULL,
                telefono VARCHAR(50) NOT NULL,
                nombre_cliente VARCHAR(255) NOT NULL,
                estado VARCHAR(50) NOT NULL,
                fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await pool.query(createTableSql);

        const insertSql = "INSERT INTO envios_whatsapp (numero_caratula, telefono, nombre_cliente, estado, fecha_envio) VALUES (?, ?, ?, ?, NOW())";
        const [result] = await pool.execute(insertSql, [numeroCaratula, telefono, nombre, estado]);
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error in registrarEnvio:', error);
        return false;
    }
}

// ----------------------------------------------------------------------
// Route: /consultar-db.php (Replica)
// ----------------------------------------------------------------------
app.get('/consultar-db.php', async (req, res) => {
    try {
        const action = req.query.action || '';
        const numero_actual = req.query.numero || 0;
        let sql = "";
        let message = "";
        let params = [];

        switch (action) {
            case 'search':
                sql = "SELECT numero, nombre, rut, telefono, estado FROM cardex WHERE numero = ? LIMIT 1";
                message = "Registro encontrado.";
                params = [numero_actual];
                break;
            case 'next':
                sql = "SELECT numero, nombre, rut, telefono, estado FROM cardex WHERE numero > ? ORDER BY numero ASC LIMIT 1";
                message = "Siguiente registro.";
                params = [numero_actual];
                break;
            case 'previous':
                sql = "SELECT numero, nombre, rut, telefono, estado FROM cardex WHERE numero < ? ORDER BY numero DESC LIMIT 1";
                message = "Registro anterior.";
                params = [numero_actual];
                break;
            default:
                return res.json({ success: false, message: 'Acción no válida.' });
        }

        const [rows] = await pool.execute(sql, params);

        if (rows.length > 0) {
            const row = rows[0];
            res.json({
                success: true,
                message: message,
                numero: row.numero,
                nombre: row.nombre,
                rut: row.rut,
                telefono: row.telefono,
                estado: row.estado
            });
        } else {
            res.json({ success: false, message: 'No se encontraron más registros.' });
        }
    } catch (error) {
        res.json({ success: false, message: 'Error de servidor: ' + error.message });
    }
});

// ----------------------------------------------------------------------
// Route: /verificar-envio.php (Replica)
// ----------------------------------------------------------------------
app.get('/verificar-envio.php', async (req, res) => {
    try {
        const numero = req.query.numero;
        if (!numero) {
            return res.json({ success: false, message: 'Número de carátula es requerido.' });
        }

        const sql = "SELECT COUNT(*) AS count FROM envios_whatsapp WHERE numero_caratula = ?";
        const [rows] = await pool.execute(sql, [numero]);
        const count = rows[0].count;

        if (count > 0) {
            res.json({
                success: true,
                message: 'El documento ya ha sido enviado. ¿Estás seguro de que quieres reenviarlo?',
                alreadySent: true
            });
        } else {
            res.json({
                success: true,
                message: 'El documento no ha sido enviado previamente.',
                alreadySent: false
            });
        }
    } catch (error) {
        res.json({ success: false, message: 'Error de servidor: ' + error.message });
    }
});

// ----------------------------------------------------------------------
// Route: /enviar-whatsapp.php (Replica)
// ----------------------------------------------------------------------
app.post('/enviar-whatsapp.php', upload.none(), async (req, res) => {
    try {
        const numero_formulario = req.body.numero;

        if (!numero_formulario) {
            return res.json({ success: false, message: 'Error: El número de carátula es requerido.' });
        }

        // 1. Check cardex status
        const [statusRows] = await pool.execute("SELECT estado FROM cardex WHERE numero = ? LIMIT 1", [numero_formulario]);

        if (statusRows.length === 0) {
            return res.json({ success: false, message: 'Documento no encontrado en la base de datos.' });
        }

        const estado = statusRows[0].estado;

        // -- Logic for PRESUNTIVA --
        if (estado === 'PRESUNTIVA') {
            const [dataRows] = await pool.execute("SELECT nombre, telefono FROM cardex WHERE numero = ? LIMIT 1", [numero_formulario]);
            if (dataRows.length > 0) {
                const { nombre: documentoNombre, telefono: documentoTelefono } = dataRows[0];

                const [presRows] = await pool.execute("SELECT presuntiva FROM cardex_presuntiva WHERE numero = ? LIMIT 1", [numero_formulario]);

                if (presRows.length > 0) {
                    const razon_presuntiva = presRows[0].presuntiva;
                    const mensaje = `Le informamos que no fue posible entregarle el documento solicitado a través de la Plataforma Web del Conservador de Bienes Raíces.\n\nLa razón es la siguiente: ${razon_presuntiva}\n\nPor favor no responder a este mensaje, se envía desde una herramienta de gestión.`;

                    // Send to WhatsApp API
                    try {
                        const botResponse = await axios.post("http://localhost:3001/enviar", {
                            telefono: documentoTelefono,
                            mensaje: mensaje
                        });

                        if (botResponse.data.success) {
                            await registrarEnvio(numero_formulario, documentoTelefono, documentoNombre, estado);
                            return res.json({ success: true, message: "Mensaje especial enviado correctamente al destinatario." });
                        } else {
                            return res.json({ success: false, message: "Hubo un error inesperado al enviar el mensaje especial. Mensaje del servidor bot." });
                        }
                    } catch (botError) {
                        return res.json({ success: false, message: 'Error enviando al bot: ' + botError.message });
                    }
                } else {
                    return res.json({ success: false, message: "No se encontró información de presuntiva." });
                }
            } else {
                return res.json({ success: false, message: "No se encontró información básica para el número." });
            }
        }

        // -- Logic for CARDEX / DESPACHADO --
        else if (estado === 'KARDEX' || estado === 'CARDEX' || estado === 'DESPACHADO') {
            // 2. Fetch basic info + ALL certificates for this caratula (puede haber múltiples numero_firma)
            const sql_datos = `
                SELECT t1.nombre, t1.telefono, t2.fecha, t2.numero_firma 
                FROM cardex AS t1 
                JOIN certificados_listo AS t2 ON t1.numero = t2.caratula 
                WHERE t1.numero = ?
             `;
            const [certRows] = await pool.execute(sql_datos, [numero_formulario]);

            if (certRows.length > 0) {
                const documentoNombre = certRows[0].nombre;
                const documentoTelefono = certRows[0].telefono;

                let enviados = 0;
                let errores = [];

                // Iterar sobre TODOS los documentos encontrados
                for (const cert of certRows) {
                    const documentoFecha = cert.fecha;
                    const documentoNumeroFirma = cert.numero_firma;

                    const fechaDate = new Date(documentoFecha);
                    const anio = fechaDate.getFullYear();
                    const mes = String(fechaDate.getMonth() + 1).padStart(2, '0');
                    const tablaMensual = `certificados_listo_${anio}_${mes}`;

                    // Fetch PDF Blob from monthly table
                    try {
                        const sql_blob = `SELECT data FROM ${tablaMensual} WHERE numero_firma = ? LIMIT 1`;
                        const [blobRows] = await pool.execute(sql_blob, [documentoNumeroFirma]);

                        if (blobRows.length > 0) {
                            const documentoPDF = blobRows[0].data;

                            const nombreArchivoTemporal = `certificado-wp-${Date.now()}-${documentoNumeroFirma}.pdf`;
                            const rutaArchivoLocal = path.join(process.cwd(), nombreArchivoTemporal);
                            fs.writeFileSync(rutaArchivoLocal, documentoPDF);

                            const pdfUrl = `http://localhost:3000/${nombreArchivoTemporal}`;

                            const mensaje = `Cordial saludo estimado(a) ${documentoNombre}, le estamos enviando el documento solicitado a través de la Plataforma Web del Conservador de Bienes Raíces. (Firma: ${documentoNumeroFirma}) \n\nPor favor no responder a este mensaje, se envía desde una herramienta de gestión.`;

                            const apiData = {
                                telefono: documentoTelefono,
                                mensaje: mensaje,
                                pdfUrl: pdfUrl
                            };

                            try {
                                const botResponse = await axios.post("http://localhost:3001/enviar", apiData);

                                if (botResponse.data.success) {
                                    await registrarEnvio(numero_formulario, documentoTelefono, documentoNombre, estado);
                                    enviados++;
                                } else {
                                    errores.push(`Firma ${documentoNumeroFirma}: ${botResponse.data.error || 'Error desconocido'}`);
                                }
                            } catch (botError) {
                                errores.push(`Firma ${documentoNumeroFirma}: ${botError.message}`);
                            }

                            // Cleanup temp file
                            try {
                                if (fs.existsSync(rutaArchivoLocal)) {
                                    fs.unlinkSync(rutaArchivoLocal);
                                }
                            } catch (e) { }

                            // Delay entre envíos para no sobrecargar el bot
                            if (certRows.length > 1) {
                                await new Promise(r => setTimeout(r, 3000));
                            }

                        } else {
                            errores.push(`Firma ${documentoNumeroFirma}: PDF no encontrado en ${tablaMensual}`);
                        }
                    } catch (sqlError) {
                        errores.push(`Firma ${documentoNumeroFirma}: ${sqlError.message}`);
                    }
                }

                // Responder con resumen
                if (enviados > 0 && errores.length === 0) {
                    return res.json({ success: true, message: `🎉 ¡Listo! Se enviaron ${enviados} documento(s) exitosamente.` });
                } else if (enviados > 0 && errores.length > 0) {
                    return res.json({ success: true, message: `⚠️ Se enviaron ${enviados} documento(s), pero hubo ${errores.length} error(es): ${errores.join('; ')}` });
                } else {
                    return res.json({ success: false, message: `❌ No se pudo enviar ningún documento. Errores: ${errores.join('; ')}` });
                }

            } else {
                return res.json({ success: false, message: "Documento no encontrado (Info certificada)." });
            }

        } else {
            return res.json({ success: false, message: 'Documento no listo para enviar. Estado: ' + estado });
        }

    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: 'Error servidor: ' + error.message });
    }
});

// ----------------------------------------------------------------------
// Route: /obtener-listado.php (Replica)
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// Route: /obtener-listado.php (Replica)
// ----------------------------------------------------------------------
app.get('/obtener-listado.php', async (req, res) => {
    try {
        let from_date = req.query.from_date;
        let to_date = req.query.to_date;

        if (!from_date || !to_date) {
            return res.json({ success: false, message: 'Las fechas son requeridas.' });
        }

        // Agregar hora si no viene incluida (fechas vienen como YYYY-MM-DD del input date)
        if (from_date && !from_date.includes(' ')) {
            from_date = from_date + ' 00:00:00';
        }
        if (to_date && !to_date.includes(' ')) {
            to_date = to_date + ' 23:59:59';
        }

        // Consultar documentos (Updated to include PRESUNTIVA to match mass-send logic)
        const sql = `
            SELECT numero, nombre, telefono, estado, ultima_mod, '0' as enviado
            FROM cardex
            WHERE (estado = 'CARDEX' OR estado = 'KARDEX' OR estado = 'DESPACHADO' OR estado = 'PRESUNTIVA') 
            AND ultima_mod BETWEEN ? AND ?
            ORDER BY numero ASC
        `;

        const [rows] = await pool.execute(sql, [from_date, to_date]);

        res.json({ success: true, data: rows });

    } catch (error) {
        console.error('Error en obtener-listado:', error);
        res.json({ success: false, message: 'Error de servidor: ' + error.message });
    }
});

// ----------------------------------------------------------------------
// Route: /enviar-masivo-whatsapp.php (Replica)
// ----------------------------------------------------------------------
app.get('/enviar-masivo-whatsapp.php', async (req, res) => {
    // Note: The original PHP uses echo and flush to stream output. 
    // In Express, we can use res.write() to stream text/html.
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // Obtener fechas con hora completa para que BETWEEN funcione correctamente
    let from_date = req.query.from_date || new Date().toISOString().split('T')[0];
    let to_date = req.query.to_date || new Date().toISOString().split('T')[0];

    // Agregar hora si no viene incluida (fechas vienen como YYYY-MM-DD del input date)
    if (from_date && !from_date.includes(' ')) {
        from_date = from_date + ' 00:00:00';
    }
    if (to_date && !to_date.includes(' ')) {
        to_date = to_date + ' 23:59:59';
    }

    res.write("<h3>Detalle del Proceso de Envío Masivo:</h3>");
    res.write(`<p><strong>Rango de Fechas:</strong> ${from_date} a ${to_date}</p>`);
    res.write("<p><strong>Estados a Enviar:</strong> CARDEX, DESPACHADO, PRESUNTIVA</p>");
    res.write("<pre>");

    let sent_count = 0;
    let error_count = 0;

    try {
        // 1. Get documents (Matching /obtener-listado.php logic exactly)
        // We query CARDEX first to drive the loop, ensuring 1-to-1 match with the list.
        const sql = `
            SELECT numero, nombre, telefono, estado
            FROM cardex
            WHERE (estado = 'CARDEX' OR estado = 'KARDEX' OR estado = 'DESPACHADO' OR estado = 'PRESUNTIVA') 
            AND ultima_mod BETWEEN ? AND ?
            ORDER BY numero ASC
        `;

        const [rows] = await pool.execute(sql, [from_date, to_date]);

        if (rows.length > 0) {
            for (const row of rows) {
                const numero_caratula = row.numero;
                const documentoNombre = row.nombre;
                const documentoTelefono = row.telefono;
                const estado = row.estado;

                res.write(`Procesando documento ${numero_caratula} - ${documentoNombre} (${estado})...\n`);

                // --- PRESUNTIVA BLOCK ---
                if (estado === 'PRESUNTIVA') {
                    // Search reason
                    const [presRows] = await pool.execute("SELECT presuntiva FROM cardex_presuntiva WHERE numero = ? LIMIT 1", [numero_caratula]);

                    if (presRows.length > 0) {
                        const razon_presuntiva = presRows[0].presuntiva;
                        const mensaje = `Le informamos que no fue posible entregarle el documento solicitado a través de la Plataforma Web del Conservador de Bienes Raíces.\n\nLa razón es la siguiente: ${razon_presuntiva}\n\nPor favor no responder a este mensaje, se envía desde una herramienta de gestión.`;

                        const apiData = {
                            telefono: documentoTelefono,
                            mensaje: mensaje
                        };

                        // Retry logic for sending to bot (Presuntiva)
                        let attempts = 0;
                        const maxAttempts = 3;
                        let success = false;
                        let lastError = '';

                        while (attempts < maxAttempts && !success) {
                            try {
                                attempts++;
                                const botResponse = await axios.post("http://localhost:3001/enviar", apiData);
                                if (botResponse.data.success) {
                                    await registrarEnvio(numero_caratula, documentoTelefono, documentoNombre, estado);
                                    res.write(`✅ Mensaje 'presuntiva' enviado (Carátula: ${numero_caratula})\n`);
                                    sent_count++;
                                    success = true;
                                } else {
                                    throw new Error(botResponse.data.error || 'Error lógico del bot');
                                }
                            } catch (err) {
                                lastError = err.message;
                                const isNetworkError = err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET';
                                const isServerError = err.response && (err.response.status === 503 || err.response.status === 500);

                                if ((isNetworkError || isServerError) && attempts < maxAttempts) {
                                    res.write(`⚠️ Intento ${attempts} fallido (Bot no disponible/error). Esperando 15 segundos para reintentar... (Carátula: ${numero_caratula})\n`);
                                    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15s
                                } else {
                                    res.write(`❌ Fallo el envío (Carátula: ${numero_caratula}) tras ${attempts} intentos. Error: ${lastError}\n`);
                                    error_count++;
                                    break;
                                }
                            }
                        }
                    } else {
                        res.write(`❌ No se encontró información de presuntiva para la carátula ${numero_caratula}\n`);
                        error_count++;
                    }
                    continue;
                }
                // --- END PRESUNTIVA BLOCK ---

                // --- CARDEX / KARDEX / DESPACHADO BLOCK ---
                try {
                    // Primero obtener fecha y numero_firma de certificados_listo
                    const [certRows] = await pool.execute("SELECT fecha, numero_firma FROM certificados_listo WHERE caratula = ?", [numero_caratula]);

                    if (certRows.length > 0) {

                        // Iterate over EACH certificate found for this caratula
                        for (const cert of certRows) {
                            const documentoFecha = cert.fecha;
                            const numeroFirma = cert.numero_firma;

                            // Calcular tabla mensual basada en la fecha
                            const fechaDate = new Date(documentoFecha);
                            const anio = fechaDate.getFullYear();
                            const mes = String(fechaDate.getMonth() + 1).padStart(2, '0');
                            const tablaMensual = `certificados_listo_${anio}_${mes}`;

                            // Buscar PDF en la tabla mensual
                            let documentoPDF = null;
                            try {
                                const sql_blob = `SELECT data FROM ${tablaMensual} WHERE numero_firma = ? LIMIT 1`;
                                const [blobRows] = await pool.execute(sql_blob, [numeroFirma]);
                                if (blobRows.length > 0) {
                                    documentoPDF = blobRows[0].data;
                                }
                            } catch (tableErr) {
                                res.write(`⚠️ Error buscando PDF en tabla ${tablaMensual}: ${tableErr.message} (Carátula: ${numero_caratula})\\n`);
                                error_count++;
                                continue;
                            }

                            if (!documentoPDF) {
                                res.write(`⚠️ No se encontró PDF en tabla ${tablaMensual} para firma ${numeroFirma} (Carátula: ${numero_caratula})\\n`);
                                error_count++;
                                continue;
                            }

                            // Unique filename including signature ID to prevent collisions
                            const nombreArchivoTemporal = `certificado-wp-${Date.now()}-${numero_caratula}-${numeroFirma}.pdf`;
                            const rutaArchivoLocal = path.join(process.cwd(), nombreArchivoTemporal);

                            fs.writeFileSync(rutaArchivoLocal, documentoPDF);

                            // Public URL for the bot
                            const pdfUrl = `http://localhost:3000/${nombreArchivoTemporal}`;
                            const mensaje = `Cordial saludo estimado(a) ${documentoNombre}, le estamos enviando el documento solicitado a través de la Plataforma Web del Conservador de Bienes Raíces. (Firma: ${numeroFirma})`;

                            const apiData = {
                                telefono: documentoTelefono,
                                mensaje: mensaje,
                                pdfUrl: pdfUrl
                            };

                            // Retry logic for sending to bot
                            let attempts = 0;
                            const maxAttempts = 3;
                            let success = false;
                            let lastError = '';

                            while (attempts < maxAttempts && !success) {
                                try {
                                    attempts++;
                                    const botResponse = await axios.post("http://localhost:3001/enviar", apiData);

                                    if (botResponse.data.success) {
                                        // Update status with specific note about signature used if possible, or just log
                                        // Note: registrarEnvio logs by caratula. Currently doesn't distinguishing signature in logs, but acceptable.
                                        await registrarEnvio(numero_caratula, documentoTelefono, documentoNombre, estado);
                                        res.write(`✅ Envío Exitoso (Carátula: ${numero_caratula} | Firma: ${numeroFirma})\n`);
                                        sent_count++;
                                        success = true;
                                    } else {
                                        throw new Error(botResponse.data.error || 'Error lógico del bot');
                                    }
                                } catch (err) {
                                    lastError = err.message;
                                    const isNetworkError = err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET';
                                    const isServerError = err.response && (err.response.status === 503 || err.response.status === 500);

                                    if ((isNetworkError || isServerError) && attempts < maxAttempts) {
                                        res.write(`⚠️ Intento ${attempts} fallido (Bot no disponible/error). Esperando 15s... (Carátula: ${numero_caratula})\n`);
                                        await new Promise(resolve => setTimeout(resolve, 15000));
                                    } else {
                                        res.write(`❌ Fallo el envío (Carátula: ${numero_caratula} | Firma: ${numeroFirma}). Error: ${lastError}\n`);
                                        error_count++;
                                        break;
                                    }
                                }
                            }

                            // Cleanup
                            try {
                                if (fs.existsSync(rutaArchivoLocal)) {
                                    fs.unlinkSync(rutaArchivoLocal);
                                }
                            } catch (cleanupErr) {
                                console.error("Cleanup error:", cleanupErr);
                            }

                            // THROTTLE: Wait 8 seconds between messages to prevent bot overload
                            if (success) {
                                res.write(`⏳ Esperando 8 segundos para proteger el bot...\n`);
                                await new Promise(resolve => setTimeout(resolve, 8000));
                            }
                        }

                    } else {
                        res.write(`⚠️ Documento listado como ${estado} pero NO se encontró PDF en 'certificados_listo'. (Carátula: ${numero_caratula})\n`);
                        error_count++;
                    }

                } catch (fileErr) {
                    res.write(`❌ Error procesando archivo/envio: ${fileErr.message} (Carátula: ${numero_caratula})\n`);
                    error_count++;
                }
            }

        } else {
            res.write("No se encontraron documentos que cumplan con los criterios.\n");
        }

    } catch (dbErr) {
        console.error(dbErr);
        res.write(`\n❌ Error en consulta BD: ${dbErr.message}\n`);
    }

    res.write("\n--- Resumen ---\n");
    res.write("Proceso finalizado.\n");
    res.write(`Documentos encontrados: ${sent_count + error_count}\n`);
    res.write(`Documentos enviados: ${sent_count}\n`);
    res.write(`Documentos con error: ${error_count}\n`);
    res.write("</pre>");
    res.end();
});

// Serve static files (HTML, CSS, JS, generated PDFs)
// This serves the current directory content
app.use(express.static(process.cwd()));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT}/index.html to test.`);
});

