const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticateToken } = require('../middleware/auth');

/**
 * 帖子相关路由
 */

// 公开接口(不需要登录)
router.get('/', postController.getPostList);              // 获取帖子列表
router.get('/search', postController.searchPosts);        // 搜索帖子
router.get('/:id', postController.getPostDetail);         // 获取帖子详情

// 需要登录的接口
router.post('/', authenticateToken, postController.createPost);           // 创建帖子
router.get('/my/posts', authenticateToken, postController.getMyPosts);    // 获取我的帖子
router.put('/:id', authenticateToken, postController.updatePost);         // 更新帖子
router.delete('/:id', authenticateToken, postController.deletePost);      // 删除帖子

module.exports = router;
