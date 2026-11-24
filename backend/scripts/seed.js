const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedDatabase = async () => {
  console.log('[Seed] Starting database initialization...');

  const sqlFilePath = path.join(__dirname, '../../database/database.sql');
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`[Seed Error] Could not find SQL file at ${sqlFilePath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    console.log(`[Seed] Connected to MySQL as '${process.env.DB_USER}'. Executing database.sql...`);
    await connection.query(sqlContent);
    console.log('[Seed Success] All 8 tables and realistic seed data inserted successfully!');
    await connection.end();
  } catch (err) {
    console.error('[Seed Error]:', err.message);
    console.warn('\nTip: If permission is denied, please open MySQL Workbench and run:');
    console.warn('1. database/grant_permissions.sql');
    console.warn('2. database/database.sql\n');
    process.exit(1);
  }
};

seedDatabase();
