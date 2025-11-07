const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const nutechAuthRoutes = require('./routes/auth');
const nutechProfileRoutes = require('./routes/profile');
const nutechInfoRoutes = require('./routes/info');
const nutechTransactionRoutes = require('./routes/transaction');

const nutechApp = express();
const NUTECH_PORT = process.env.PORT || 3000;

const nutechEnsureUploadsDir = () => {
    const nutechUploadsPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(nutechUploadsPath)) {
        fs.mkdirSync(nutechUploadsPath, { recursive: true });
        console.log('📁 Nutech uploads directory created');
    }
};

nutechEnsureUploadsDir();

// Middleware
nutechApp.use(cors());
nutechApp.use(express.json());
nutechApp.use(express.urlencoded({ extended: true }));
nutechApp.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
nutechApp.use('/', nutechAuthRoutes);
nutechApp.use('/', nutechProfileRoutes);
nutechApp.use('/', nutechInfoRoutes);
nutechApp.use('/', nutechTransactionRoutes);

// 404 handler
nutechApp.use('*', (req, res) => {
    res.status(404).json({
        status: 104,
        message: 'Endpoint tidak ditemukan',
        data: null
    });
});

// Error handler
nutechApp.use((err, req, res, next) => {
    console.error('Nutech Error Stack:', err.stack);
    res.status(500).json({
        status: 500,
        message: 'Terjadi kesalahan internal server',
        data: null
    });
});

nutechApp.listen(NUTECH_PORT, () => {
    console.log(`Nutech Server running on port ${NUTECH_PORT}`);
});