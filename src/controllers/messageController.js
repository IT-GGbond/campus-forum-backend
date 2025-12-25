const Message = require('../models/Message');
const { success, error } = require('../utils/response');
const redisClient = require('../config/redis'); // 引入Redis客户端

/**
 * 发送消息（改造版 - 增加Redis未读计数）
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

        // ========== Redis扩展功能 ==========
        // 接收者未读消息+1（异步执行）
        redisClient.hIncrBy(`user:unread:${receiver_id}`, 'messages', 1).catch(err => {
            console.error('Redis HINCRBY失败:', err);
        });
        // ===================================

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
 * 标记与某用户的所有消息为已读（改造版 - 同步Redis计数）
 */
async function markAsRead(req, res) {
    try {
        const sender_id = parseInt(req.params.userId);
        const user_id = req.user.userId;

        const count = await Message.markAsRead(user_id, sender_id);

        // ========== Redis扩展功能 ==========
        // 从Redis减少未读消息数（异步执行）
        if (count > 0) {
            redisClient.hIncrBy(`user:unread:${user_id}`, 'messages', -count).then(async () => {
                // 确保未读数不小于0
                const currentUnread = await redisClient.hGet(`user:unread:${user_id}`, 'messages');
                if (parseInt(currentUnread) < 0) {
                    await redisClient.hSet(`user:unread:${user_id}`, 'messages', '0');
                }
            }).catch(err => {
                console.error('Redis HINCRBY失败:', err);
            });
        }
        // ===================================

        res.json(success({ count }, `已标记${count}条消息为已读`));
    } catch (err) {
        console.error('标记已读失败:', err);
        res.status(500).json(error('标记已读失败'));
    }
}

/**
 * 获取未读消息总数（改造版 - 优先使用Redis）
 */
async function getUnreadCount(req, res) {
    try {
        const user_id = req.user.userId;

        // ========== Redis扩展功能 ==========
        // 优先从Redis获取未读数（速度更快）
        try {
            const redisUnread = await redisClient.hGet(`user:unread:${user_id}`, 'messages');
            if (redisUnread !== null) {
                return res.json(success({ unread_count: parseInt(redisUnread) || 0 }));
            }
        } catch (err) {
            console.error('Redis HGET失败，使用MySQL:', err);
        }
        // ===================================

        // Redis未命中，使用MySQL查询
        const count = await Message.getUnreadCount(user_id);

        // 同步到Redis（异步执行）
        redisClient.hSet(`user:unread:${user_id}`, 'messages', count.toString()).catch(err => {
            console.error('Redis HSET失败:', err);
        });

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
