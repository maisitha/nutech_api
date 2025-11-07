const jwt = require('jsonwebtoken');
const nutechDbPool = require('../config/database');

const nutechAuthMiddleware = async (req, res, next) => {
    const nutechAuthHeader = req.headers['authorization'];
    const nutechToken = nutechAuthHeader && nutechAuthHeader.split(' ')[1];

    if (!nutechToken) {
        return res.status(401).json({
            status: 108,
            message: 'Token tidak tidak valid atau kadaluwarsa',
            data: null
        });
    }

    try {
        const nutechDecoded = jwt.verify(nutechToken, process.env.JWT_SECRET);
        
        const { rows: nutechUsers } = await nutechDbPool.query(
            'SELECT id, email FROM users WHERE email = $1',
            [nutechDecoded.email]
        );

        if (nutechUsers.length === 0) {
            return res.status(401).json({
                status: 108,
                message: 'Token tidak tidak valid atau kadaluwarsa',
                data: null
            });
        }

        req.nutechUser = nutechUsers[0];
        next();
    } catch (nutechError) {
        return res.status(401).json({
            status: 108,
            message: 'Token tidak tidak valid atau kadaluwarsa',
            data: null
        });
    }
};

module.exports = { nutechAuthMiddleware };