const express = require('express');
const nutechDbPool = require('../config/database');
const { nutechAuthMiddleware } = require('../middleware/auth');
const { nutechTopupValidation, nutechTransactionValidation, nutechValidateMiddleware } = require('../utils/validation');

const nutechTransactionRouter = express.Router();

// GET /balance
nutechTransactionRouter.get('/balance', nutechAuthMiddleware, async (req, res) => {
    try {
        const { rows: nutechBalanceData } = await nutechDbPool.query(
            'SELECT balance FROM balances WHERE user_id = $1',
            [req.nutechUser.id]
        );

        if (nutechBalanceData.length === 0) {
            return res.status(404).json({
                status: 104,
                message: 'Balance tidak ditemukan',
                data: null
            });
        }

        res.status(200).json({
            status: 0,
            message: 'Get Balance Berhasil',
            data: {
                balance: nutechBalanceData[0].balance
            }
        });
    } catch (nutechError) {
        console.error('Get balance error:', nutechError);
        res.status(500).json({
            status: 500,
            message: 'Terjadi kesalahan internal server',
            data: null
        });
    }
});

// POST /topup
nutechTransactionRouter.post('/topup', nutechAuthMiddleware, nutechValidateMiddleware(nutechTopupValidation), async (req, res) => {
    const nutechDbClient = await nutechDbPool.connect();
    
    try {
        await nutechDbClient.query('BEGIN');
        
        const { top_up_amount } = req.body;

        if (top_up_amount <= 0) {
            await nutechDbClient.query('ROLLBACK');
            return res.status(400).json({
                status: 102,
                message: 'Paramter amount hanya boleh angka dan tidak boleh lebih kecil dari 0',
                data: null
            });
        }

        const nutechUpdateResult = await nutechDbClient.query(
            'UPDATE balances SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING balance',
            [top_up_amount, req.nutechUser.id]
        );

        if (nutechUpdateResult.rows.length === 0) {
            await nutechDbClient.query('ROLLBACK');
            return res.status(404).json({
                status: 104,
                message: 'User balance tidak ditemukan',
                data: null
            });
        }

        const nutechInvoiceNumber = `INV${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        await nutechDbClient.query(
            `INSERT INTO transactions (user_id, invoice_number, transaction_type, description, total_amount) 
             VALUES ($1, $2, 'TOPUP', 'Top Up balance', $3)`,
            [req.nutechUser.id, nutechInvoiceNumber, top_up_amount]
        );

        await nutechDbClient.query('COMMIT');

        res.status(200).json({
            status: 0,
            message: 'Top Up Balance berhasil',
            data: {
                balance: nutechUpdateResult.rows[0].balance
            }
        });
    } catch (nutechError) {
        await nutechDbClient.query('ROLLBACK');
        console.error('Topup error:', nutechError);
        res.status(500).json({
            status: 500,
            message: 'Terjadi kesalahan internal server',
            data: null
        });
    } finally {
        nutechDbClient.release();
    }
});

// POST /transaction
nutechTransactionRouter.post('/transaction', nutechAuthMiddleware, nutechValidateMiddleware(nutechTransactionValidation), async (req, res) => {
    const nutechDbClient = await nutechDbPool.connect();
    
    try {
        await nutechDbClient.query('BEGIN');
        
        const { service_code } = req.body;

        const { rows: nutechServiceData } = await nutechDbClient.query(
            'SELECT service_code, service_name, service_tariff FROM services WHERE service_code = $1',
            [service_code]
        );

        if (nutechServiceData.length === 0) {
            await nutechDbClient.query('ROLLBACK');
            return res.status(400).json({
                status: 102,
                message: 'Service atau Layanan tidak ditemukan',
                data: null
            });
        }

        const nutechSelectedService = nutechServiceData[0];

        const { rows: nutechUserBalance } = await nutechDbClient.query(
            'SELECT balance FROM balances WHERE user_id = $1',
            [req.nutechUser.id]
        );

        if (nutechUserBalance.length === 0) {
            await nutechDbClient.query('ROLLBACK');
            return res.status(404).json({
                status: 104,
                message: 'Balance tidak ditemukan',
                data: null
            });
        }

        const nutechCurrentBalance = nutechUserBalance[0].balance;

        if (nutechCurrentBalance < nutechSelectedService.service_tariff) {
            await nutechDbClient.query('ROLLBACK');
            return res.status(400).json({
                status: 105,
                message: 'Balance tidak mencukupi',
                data: null
            });
        }

        await nutechDbClient.query(
            'UPDATE balances SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
            [nutechSelectedService.service_tariff, req.nutechUser.id]
        );

        const nutechInvoiceNumber = `INV${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        await nutechDbClient.query(
            `INSERT INTO transactions (user_id, invoice_number, transaction_type, service_code, description, total_amount) 
             VALUES ($1, $2, 'PAYMENT', $3, $4, $5)`,
            [req.nutechUser.id, nutechInvoiceNumber, service_code, nutechSelectedService.service_name, nutechSelectedService.service_tariff]
        );

        await nutechDbClient.query('COMMIT');

        res.status(200).json({
            status: 0,
            message: 'Transaksi berhasil',
            data: {
                invoice_number: nutechInvoiceNumber,
                service_code: nutechSelectedService.service_code,
                service_name: nutechSelectedService.service_name,
                transaction_type: 'PAYMENT',
                total_amount: nutechSelectedService.service_tariff,
                created_on: new Date().toISOString()
            }
        });
    } catch (nutechError) {
        await nutechDbClient.query('ROLLBACK');
        console.error('Transaction error:', nutechError);
        res.status(500).json({
            status: 500,
            message: 'Terjadi kesalahan internal server',
            data: null
        });
    } finally {
        nutechDbClient.release();
    }
});

// GET /transaction/history
nutechTransactionRouter.get('/transaction/history', nutechAuthMiddleware, async (req, res) => {
    try {
        let { offset = 0, limit } = req.query;
        
        offset = parseInt(offset);
        limit = limit ? parseInt(limit) : null;

        let nutechHistoryQuery = `
            SELECT invoice_number, transaction_type, 
                   COALESCE(description, service_code) as description, 
                   total_amount, created_on 
            FROM transactions 
            WHERE user_id = $1 
            ORDER BY created_on DESC
        `;
        
        let nutechQueryParams = [req.nutechUser.id];

        if (limit !== null) {
            nutechHistoryQuery += ' LIMIT $2 OFFSET $3';
            nutechQueryParams.push(limit, offset);
        }

        const { rows: nutechTransactionHistory } = await nutechDbPool.query(nutechHistoryQuery, nutechQueryParams);

        const nutechResponseData = {
            offset: offset,
            limit: limit,
            records: nutechTransactionHistory
        };

        res.status(200).json({
            status: 0,
            message: 'Get History Berhasil',
            data: nutechResponseData
        });
    } catch (nutechError) {
        console.error('Get transaction history error:', nutechError);
        res.status(500).json({
            status: 500,
            message: 'Terjadi kesalahan internal server',
            data: null
        });
    }
});

module.exports = nutechTransactionRouter;