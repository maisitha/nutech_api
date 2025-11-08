const express = require('express');
const multer = require('multer');
const path = require('path');
const nutechDbPool = require('../config/database');
const { nutechAuthMiddleware } = require('../middleware/auth');
const { nutechProfileValidation, nutechValidateMiddleware } = require('../utils/validation');

const nutechProfileRouter = express.Router();

const nutechStorageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const nutechUniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'nutech-profile-' + nutechUniqueSuffix + path.extname(file.originalname));
    }
});

const nutechFileFilterConfig = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('Format Image tidak sesuai'), false);
    }
};

const nutechUploadMiddleware = multer({
    storage: nutechStorageConfig,
    fileFilter: nutechFileFilterConfig,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// GET /profile
nutechProfileRouter.get('/profile', nutechAuthMiddleware, async (req, res) => {
    try {
        const { rows: nutechUserProfile } = await nutechDbPool.query(
            `SELECT email, first_name, last_name, 
             COALESCE(profile_image, 'https://nutech-integrasi.app/dummy.jpg') as profile_image 
             FROM users WHERE id = $1`,
            [req.nutechUser.id]
        );

        if (nutechUserProfile.length === 0) {
            return res.status(404).json({
                status: 104,
                message: 'User tidak ditemukan',
                data: null
            });
        }

        res.status(200).json({
            status: 0,
            message: 'Sukses',
            data: nutechUserProfile[0]
        });
    } catch (nutechError) {
        console.error('Get profile error:', nutechError);
        res.status(500).json({
            status: 500,
            message: 'Terjadi kesalahan internal server',
            data: null
        });
    }
});

// PUT /profile/update
nutechProfileRouter.put('/profile/update', nutechAuthMiddleware, nutechValidateMiddleware(nutechProfileValidation), async (req, res) => {
    try {
        const { first_name, last_name } = req.body;

        await nutechDbPool.query(
            'UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3',
            [first_name, last_name, req.nutechUser.id]
        );

        const { rows: nutechUpdatedProfile } = await nutechDbPool.query(
            `SELECT email, first_name, last_name, 
             COALESCE(profile_image, 'https://nutech-integrasi.app/dummy.jpg') as profile_image 
             FROM users WHERE id = $1`,
            [req.nutechUser.id]
        );

        res.status(200).json({
            status: 0,
            message: 'Update Profile berhasil',
            data: nutechUpdatedProfile[0]
        });
    } catch (nutechError) {
        console.error('Update profile error:', nutechError);
        res.status(500).json({
            status: 500,
            message: 'Terjadi kesalahan internal server',
            data: null
        });
    }
});

// PUT /profile/image
nutechProfileRouter.put('/profile/image', nutechAuthMiddleware, nutechUploadMiddleware.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 102,
                message: 'Format Image tidak sesuai',
                data: null
            });
        }

        const nutechProfileImageUrl = `https://nutechapi-production-0061.up.railway.app/uploads/${req.file.filename}`;

        await nutechDbPool.query(
            'UPDATE users SET profile_image = $1 WHERE id = $2',
            [nutechProfileImageUrl, req.nutechUser.id]
        );

        const { rows: nutechUpdatedUser } = await nutechDbPool.query(
            'SELECT email, first_name, last_name, profile_image FROM users WHERE id = $1',
            [req.nutechUser.id]
        );

        const nutechUserData = nutechUpdatedUser[0];

        res.status(200).json({
            status: 0,
            message: 'Update Profile Image berhasil',
            data: {
                email: nutechUserData.email,
                first_name: nutechUserData.first_name,
                last_name: nutechUserData.last_name,
                profile_image: nutechUserData.profile_image
            }
        });
    } catch (nutechError) {
        console.error('Upload profile image error:', nutechError);
        if (nutechError instanceof multer.MulterError) {
            return res.status(400).json({
                status: 102,
                message: 'Format Image tidak sesuai',
                data: null
            });
        }
        res.status(500).json({
            status: 500,
            message: 'Terjadi kesalahan internal server',
            data: null
        });
    }
});

module.exports = nutechProfileRouter;