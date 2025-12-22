const express = require('express');
const router = express.Router();
const {
    sendMessage,
    getConversation,
    getConversationList,
    markAsRead,
    getUnreadCount,
    getUnreadCountFrom,
    deleteMessage
} = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');

// 所有消息相关接口都需要登录

// 发送消息
router.post('/messages', authenticateToken, sendMessage);

// 获取对话列表(最近联系人)
router.get('/messages/conversations', authenticateToken, getConversationList);

// 获取未读消息总数
router.get('/messages/unread/count', authenticateToken, getUnreadCount);

// 获取与某用户的对话记录
router.get('/messages/conversation/:userId', authenticateToken, getConversation);

// 获取与某用户的未读消息数
router.get('/messages/unread/:userId', authenticateToken, getUnreadCountFrom);

// 标记与某用户的所有消息为已读
router.put('/messages/read/:userId', authenticateToken, markAsRead);

// 删除消息
router.delete('/messages/:id', authenticateToken, deleteMessage);

module.exports = router;
