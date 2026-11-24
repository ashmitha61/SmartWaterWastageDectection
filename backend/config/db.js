const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create connection pool for MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_waste_management',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  multipleStatements: true,
  timezone: '+05:30', // Default to Indian Standard Time for DBMS Project consistency
  dateStrings: true
});

// Test and log database connection status
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[MySQL] Successfully connected to database '${process.env.DB_NAME || 'smart_waste_management'}' on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306} as '${process.env.DB_USER || 'root'}'.`);
    connection.release();
    return true;
  } catch (error) {
    console.error('[MySQL Connection Error]:', error.message);
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.warn(`[Notice] Database '${process.env.DB_NAME}' does not exist yet. Please run database/database.sql in MySQL Workbench or run 'npm run seed'.`);
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.warn(`[Notice] Access denied for user '${process.env.DB_USER}'. Check your password in backend/.env or run database/grant_permissions.sql in MySQL Workbench.`);
    }
    return false;
  }
};

module.exports = {
  pool,
  testConnection
};
