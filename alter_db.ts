import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS storage_types (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          isVisible BOOLEAN DEFAULT TRUE
        )
    `);
    
    await pool.query(`
        INSERT IGNORE INTO storage_types (id, name, isVisible) 
        VALUES ('own', 'Vlastní sklad', TRUE), ('fulfillment', 'Pronajatý sklad (fulfillment)', TRUE)
    `);
    
    try {
        await pool.query(`
            ALTER TABLE deals 
            ADD COLUMN storageTypeId VARCHAR(50),
            ADD COLUMN estimatedYearlyParcels INT,
            ADD COLUMN seasonMonths JSON,
            ADD COLUMN skuCount INT,
            ADD COLUMN productsSold TEXT,
            ADD COLUMN codUsage JSON,
            ADD COLUMN b2cShare INT
        `);
        console.log("Altered deals table");
    } catch (e) {
        console.log("Alter deals table error (might already exist):", e.message);
    }
    
    process.exit(0);
}
run();
