const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const run = async () => {
  console.log('[Init] Connecting to MySQL...');

  // Connect to the database configured in .env (or job_portal fallback)
  const targetDb = process.env.DB_NAME || 'job_portal';

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'job_portal_user',
      password: process.env.DB_PASSWORD || 'JobPortal123',
      database: targetDb,
      multipleStatements: true
    });
  } catch (err) {
    console.error(`[Init] Could not connect to '${targetDb}':`, err.message);
    if (targetDb !== 'job_portal') {
      console.log("[Init] Retrying with database 'job_portal'...");
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        user: process.env.DB_USER || 'job_portal_user',
        password: process.env.DB_PASSWORD || 'JobPortal123',
        database: 'job_portal',
        multipleStatements: true
      });
    } else {
      throw err;
    }
  }

  console.log(`[Init] Connected successfully to database '${connection.config.database}'.`);

  // Read database.sql
  const sqlPath = path.join(__dirname, '../../database/database.sql');
  let sql = fs.readFileSync(sqlPath, 'utf8');

  // Strip CREATE DATABASE and USE statements so it executes in current database
  sql = sql.replace(/CREATE DATABASE[\s\S]*?;/gi, '');
  sql = sql.replace(/USE smart_waste_management;/gi, '');

  console.log('[Init] Executing schema DDL and realistic seed data...');
  await connection.query(sql);

  console.log('[Init] Verifying created tables...');
  const [tables] = await connection.query(`
    SELECT 'locations' AS table_name, COUNT(*) AS count FROM locations
    UNION ALL SELECT 'waste_categories', COUNT(*) FROM waste_categories
    UNION ALL SELECT 'bins', COUNT(*) FROM bins
    UNION ALL SELECT 'teams', COUNT(*) FROM teams
    UNION ALL SELECT 'team_members', COUNT(*) FROM team_members
    UNION ALL SELECT 'schedules', COUNT(*) FROM schedules
    UNION ALL SELECT 'schedule_bins', COUNT(*) FROM schedule_bins
    UNION ALL SELECT 'collection_records', COUNT(*) FROM collection_records
    UNION ALL SELECT 'admins', COUNT(*) FROM admins;
  `);

  console.table(tables);
  console.log('[Init SUCCESS] All tables and sample data loaded into MySQL successfully!');
  await connection.end();
};

run().catch((err) => {
  console.error('[Init FATAL]:', err.message);
  process.exit(1);
});
