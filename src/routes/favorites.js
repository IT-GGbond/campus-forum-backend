const express = require('express');
const router = express.Router();
const {
    addFavorite,
    removeFavorite,
    checkFavorite,
    getMyFavorites,
    getPostFavorites,
    checkBatchFavorites
} = require('../controllers/favoriteController');
const { authenticateToken } = require('../middleware/auth');

// 添加收藏(需要登录)
router.post('/favorites', authenticateToken, addFavorite);

// 取消收藏(需要登录)
router.delete('/favorites/:postId', authenticateToken, removeFavorite);

// 检查是否已收藏(需要登录)
router.get('/favorites/check/:postId', authenticateToken, checkFavorite);

// 批量检查收藏状态(需要登录)
router.post('/favorites/check/batch', authenticateToken, checkBatchFavorites);

// 获取我的收藏列表(需要登录)
router.get('/favorites/my/list', authenticateToken, getMyFavorites);

// 获取帖子的收藏用户列表(公开)
router.get('/favorites/post/:postId/users', getPostFavorites);

module.exports = router;
