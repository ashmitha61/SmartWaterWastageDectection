const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { testConnection } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const binsRoutes = require('./routes/binsRoutes');
const locationsRoutes = require('./routes/locationsRoutes');
const categoriesRoutes = require('./routes/categoriesRoutes');
const teamsRoutes = require('./routes/teamsRoutes');
const schedulesRoutes = require('./routes/schedulesRoutes');
const recordsRoutes = require('./routes/recordsRoutes');
const reportsRoutes = require('./routes/reportsRoutes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API Health Check & Metadata
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    project: 'Smart Waste Management System - DBMS Project',
    database: process.env.DB_NAME || 'job_portal',
    serverTime: new Date().toISOString()
  });
});

// Mount Main Module REST APIs
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bins', binsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/reports', reportsRoutes);

// 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API route '${req.originalUrl}' not found.`
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Start Server and verify DB connection
const startServer = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n🚀 [Smart Waste Management API] Server running on http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health\n`);
  });
};

startServer();

module.exports = app;
