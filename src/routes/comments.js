const express = require('express');
const router = express.Router();
const {
    createComment,
    getCommentsByPost,
    getReplies,
    deleteComment,
    getMyComments
} = require('../controllers/commentController');
const { authenticateToken } = require('../middleware/auth');

// 创建评论(需要登录)
router.post('/comments', authenticateToken, createComment);

// 获取帖子的评论列表(公开)
router.get('/comments/post/:postId', getCommentsByPost);

// 获取评论的回复列表(公开)
router.get('/comments/:commentId/replies', getReplies);

// 删除评论(需要登录且只能删除自己的评论)
router.delete('/comments/:id', authenticateToken, deleteComment);

// 获取我的评论列表(需要登录)
router.get('/comments/my/comments', authenticateToken, getMyComments);

module.exports = router;
