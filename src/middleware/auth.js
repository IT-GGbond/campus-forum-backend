// JWT身份认证中间件
const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

/**
 * 验证token中间件
 */
const authenticateToken = (req, res, next) => {
    try {
        // 从请求头获取token
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return error(res, '未提供认证token', 401);
        }

        // 验证token
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return error(res, 'token无效或已过期', 403);
            }

            // 将用户信息附加到请求对象
            req.user = user;
            next();
        });
    } catch (err) {
        return error(res, '认证失败', 401);
    }
};

/**
 * 可选认证中间件（token存在则验证，不存在也放行）
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
                if (!err) {
                    req.user = user;
                }
            });
        }
        next();
    } catch (err) {
        next();
    }
};

module.exports = {
    authenticateToken,
    optionalAuth
};
