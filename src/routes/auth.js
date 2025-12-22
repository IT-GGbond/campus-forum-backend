// 认证路由
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * 用户注册
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', authController.login);

/**
 * GET /api/auth/profile
 * 获取当前用户信息（需要认证）
 */
router.get('/profile', authenticateToken, authController.getProfile);

/**
 * PUT /api/auth/profile
 * 更新当前用户信息（需要认证）
 */
router.put('/profile', authenticateToken, authController.updateProfile);

module.exports = router;
