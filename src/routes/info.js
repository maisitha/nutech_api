const express = require('express');
const nutechDbPool = require('../config/database');
const { nutechAuthMiddleware } = require('../middleware/auth');

const nutechInfoRouter = express.Router();

// GET /banner (Public)
nutechInfoRouter.get('/banner', async (req, res) => {
    try {
        const { rows: nutechBannerList } = await nutechDbPool.query(
            'SELECT banner_name, banner_image, description FROM banners ORDER BY id'
        );

        res.status(200).json({
            status: 0,
            message: 'Sukses',
            data: nutechBannerList
        });
    } catch (nutechError) {
        console.error('Get banners error:', nutechError);
        res.status(500).json({
            status: 500,
            message: 'Terjadi kesalahan internal server',
            data: null
        });
    }
});

// GET /services (Private)
nutechInfoRouter.get('/services', nutechAuthMiddleware, async (req, res) => {
    try {
        const { rows: nutechServiceList } = await nutechDbPool.query(
            'SELECT service_code, service_name, service_icon, service_tariff FROM services ORDER BY service_code'
        );

        res.status(200).json({
            status: 0,
            message: 'Sukses',
            data: nutechServiceList
        });
    } catch (nutechError) {
        console.error('Get services error:', nutechError);
        res.status(500).json({
            status: 500,
            message: 'Terjadi kesalahan internal server',
            data: null
        });
    }
});

module.exports = nutechInfoRouter;