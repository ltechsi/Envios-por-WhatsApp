const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pdfblob'
};

async function checkDate() {
    const pool = mysql.createPool(dbConfig);
    try {
        const [rows] = await pool.execute("SELECT ultima_mod, estado FROM cardex WHERE numero = 164084");
        if (rows.length > 0) {
            console.log(`Carátula: 164084`);
            console.log(`Fecha (ultima_mod): ${rows[0].ultima_mod}`);
            console.log(`Estado: ${rows[0].estado}`);
        } else {
            console.log("No encontrado.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkDate();
