const Message = require('../models/Message');
const { success, error } = require('../utils/response');

/**
 * 发送消息
 */
async function sendMessage(req, res) {
    try {
        const { receiver_id, content } = req.body;
        const sender_id = req.user.userId;

        // 验证必填字段
        if (!receiver_id || !content) {
            return res.status(400).json(error('接收者ID和消息内容不能为空'));
        }

        // 不能给自己发消息
        if (sender_id === receiver_id) {
            return res.status(400).json(error('不能给自己发送消息'));
        }

        // 验证消息内容长度
        if (content.length < 1 || content.length > 1000) {
            return res.status(400).json(error('消息内容长度应在1-1000字符之间'));
        }

        const message = await Message.send({
            sender_id,
            receiver_id,
            content
        });

        res.status(201).json(success(message, '发送成功'));
    } catch (err) {
        console.error('发送消息失败:', err);
        res.status(500).json(error('发送消息失败'));
    }
}

/**
 * 获取与某用户的对话记录
 */
async function getConversation(req, res) {
    try {
        const other_user_id = parseInt(req.params.userId);
        const user_id = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 50;

        const result = await Message.getConversation({
            user_id,
            other_user_id,
            page,
            pageSize
        });

        res.json(success({
            list: result.messages,
            total: result.total,
            page,
            pageSize,
            totalPages: Math.ceil(result.total / pageSize)
        }));
    } catch (err) {
        console.error('获取对话记录失败:', err);
        res.status(500).json(error('获取对话记录失败'));
    }
}

/**
 * 获取对话列表(最近联系人)
 */
async function getConversationList(req, res) {
    try {
        const user_id = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;

        const conversations = await Message.getConversationList({
            user_id,
            page,
            pageSize
        });

        res.json(success({
            list: conversations,
            page,
            pageSize
        }));
    } catch (err) {
        console.error('获取对话列表失败:', err);
        res.status(500).json(error('获取对话列表失败'));
    }
}

/**
 * 标记与某用户的所有消息为已读
 */
async function markAsRead(req, res) {
    try {
        const sender_id = parseInt(req.params.userId);
        const user_id = req.user.userId;

        const count = await Message.markAsRead(user_id, sender_id);

        res.json(success({ count }, `已标记${count}条消息为已读`));
    } catch (err) {
        console.error('标记已读失败:', err);
        res.status(500).json(error('标记已读失败'));
    }
}

/**
 * 获取未读消息总数
 */
async function getUnreadCount(req, res) {
    try {
        const user_id = req.user.userId;
        const count = await Message.getUnreadCount(user_id);

        res.json(success({ unread_count: count }));
    } catch (err) {
        console.error('获取未读消息数失败:', err);
        res.status(500).json(error('获取未读消息数失败'));
    }
}

/**
 * 获取与某用户的未读消息数
 */
async function getUnreadCountFrom(req, res) {
    try {
        const sender_id = parseInt(req.params.userId);
        const user_id = req.user.userId;

        const count = await Message.getUnreadCountFrom(user_id, sender_id);

        res.json(success({ unread_count: count }));
    } catch (err) {
        console.error('获取未读消息数失败:', err);
        res.status(500).json(error('获取未读消息数失败'));
    }
}

/**
 * 删除消息
 */
async function deleteMessage(req, res) {
    try {
        const messageId = parseInt(req.params.id);
        const userId = req.user.userId;

        const deleted = await Message.delete(messageId, userId);

        if (!deleted) {
            return res.status(403).json(error('无权删除此消息或消息不存在'));
        }

        res.json(success(null, '删除成功'));
    } catch (err) {
        console.error('删除消息失败:', err);
        res.status(500).json(error('删除消息失败'));
    }
}

module.exports = {
    sendMessage,
    getConversation,
    getConversationList,
    markAsRead,
    getUnreadCount,
    getUnreadCountFrom,
    deleteMessage
};
