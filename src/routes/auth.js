const express = require('express');
const nutechDbPool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { 
    nutechRegValidation, 
    nutechLoginValidation, 
    nutechValidateMiddleware 
} = require('../utils/validation');

const nutechAuthRouter = express.Router();

// POST /registration
nutechAuthRouter.post('/registration', nutechValidateMiddleware(nutechRegValidation), async (req, res) => {
    try {
        const { email, first_name, last_name, password } = req.body;

        const { rows: nutechExistingUsers } = await nutechDbPool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (nutechExistingUsers.length > 0) {
            return res.status(400).json({
                status: 102,
                message: 'Email sudah terdaftar',
                data: null
            });
        }

        const nutechHashedPassword = await bcrypt.hash(password, 10);

        const { rows: nutechInsertResult } = await nutechDbPool.query(
            'INSERT INTO users (email, first_name, last_name, password) VALUES ($1, $2, $3, $4) RETURNING id',
            [email, first_name, last_name, nutechHashedPassword]
        );

        await nutechDbPool.query(
            'INSERT INTO balances (user_id, balance) VALUES ($1, $2)',
            [nutechInsertResult[0].id, 0]
        );

        res.status(200).json({
            status: 0,
            message: 'Registrasi berhasil silahkan login',
            data: null
        });
    } catch (nutechError) {
        console.error('Registration error:', nutechError);
        res.status(500).json({
            status: 500,
            message: 'Terjadi kesalahan internal server',
            data: null
        });
    }
});

// POST /login
nutechAuthRouter.post('/login', nutechValidateMiddleware(nutechLoginValidation), async (req, res) => {
    try {
        const { email, password } = req.body;

        const { rows: nutechUserData } = await nutechDbPool.query(
            'SELECT id, email, password FROM users WHERE email = $1',
            [email]
        );

        if (nutechUserData.length === 0) {
            return res.status(401).json({
                status: 103,
                message: 'Username atau password salah',
                data: null
            });
        }

        const nutechCurrentUser = nutechUserData[0];

        const nutechPasswordValid = await bcrypt.compare(password, nutechCurrentUser.password);
        if (!nutechPasswordValid) {
            return res.status(401).json({
                status: 103,
                message: 'Username atau password salah',
                data: null
            });
        }

        const nutechJwtToken = jwt.sign(
            { email: nutechCurrentUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.status(200).json({
            status: 0,
            message: 'Login Sukses',
            data: { 
                token: nutechJwtToken
            }
        });
    } catch (nutechError) {
        console.error('Login error:', nutechError);
        res.status(500).json({
            status: 500,
            message: 'Terjadi kesalahan internal server',
            data: null
        });
    }
});

module.exports = nutechAuthRouter;