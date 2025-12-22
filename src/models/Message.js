const { pool } = require('../config/db');

/**
 * 私聊消息数据模型
 */
class Message {
    /**
     * 发送消息
     * @param {Object} messageData - 消息数据
     * @returns {Promise<Object>} 发送的消息信息
     */
    static async send({ sender_id, receiver_id, content }) {
        const [result] = await pool.execute(
            `INSERT INTO messages (sender_id, receiver_id, content, is_read, created_at)
             VALUES (?, ?, ?, 0, NOW())`,
            [sender_id, receiver_id, content]
        );

        return await this.findById(result.insertId);
    }

    /**
     * 根据ID查找消息
     * @param {number} messageId - 消息ID
     * @returns {Promise<Object|null>}
     */
    static async findById(messageId) {
        const [rows] = await pool.execute(
            `SELECT 
                m.message_id,
                m.sender_id,
                m.receiver_id,
                m.content,
                m.is_read,
                m.created_at,
                sender.username as sender_username,
                sender.avatar_url as sender_avatar,
                receiver.username as receiver_username,
                receiver.avatar_url as receiver_avatar
             FROM messages m
             LEFT JOIN users sender ON m.sender_id = sender.user_id
             LEFT JOIN users receiver ON m.receiver_id = receiver.user_id
             WHERE m.message_id = ?`,
            [messageId]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * 获取两个用户之间的对话记录
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} { messages, total }
     */
    static async getConversation({ user_id, other_user_id, page = 1, pageSize = 50 }) {
        const offset = (page - 1) * pageSize;

        // 查询总数
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total 
             FROM messages 
             WHERE (sender_id = ? AND receiver_id = ?) 
                OR (sender_id = ? AND receiver_id = ?)`,
            [user_id, other_user_id, other_user_id, user_id]
        );
        const total = countResult[0].total;

        // 查询消息列表
        const [rows] = await pool.execute(
            `SELECT 
                m.message_id,
                m.sender_id,
                m.receiver_id,
                m.content,
                m.is_read,
                m.created_at,
                sender.username as sender_username,
                sender.avatar_url as sender_avatar
             FROM messages m
             LEFT JOIN users sender ON m.sender_id = sender.user_id
             WHERE (m.sender_id = ? AND m.receiver_id = ?) 
                OR (m.sender_id = ? AND m.receiver_id = ?)
             ORDER BY m.created_at DESC
             LIMIT ? OFFSET ?`,
            [user_id, other_user_id, other_user_id, user_id, pageSize, offset]
        );

        return { messages: rows, total };
    }

    /**
     * 获取用户的对话列表(最近联系人)
     * @param {Object} params - 查询参数
     * @returns {Promise<Array>}
     */
    static async getConversationList({ user_id, page = 1, pageSize = 20 }) {
        const offset = (page - 1) * pageSize;

        // 获取最近联系人列表
        const [rows] = await pool.execute(
            `SELECT 
                conversations.other_user_id,
                u.username as other_username,
                u.avatar_url as other_avatar,
                u.school as other_school,
                m.content as last_message,
                m.created_at as last_message_time,
                IFNULL(unread.unread_count, 0) as unread_count
             FROM (
                SELECT 
                    CASE 
                        WHEN sender_id = ? THEN receiver_id 
                        ELSE sender_id 
                    END as other_user_id,
                    MAX(message_id) as last_message_id
                FROM messages
                WHERE sender_id = ? OR receiver_id = ?
                GROUP BY other_user_id
             ) as conversations
             LEFT JOIN messages m ON conversations.last_message_id = m.message_id
             LEFT JOIN users u ON conversations.other_user_id = u.user_id
             LEFT JOIN (
                SELECT sender_id, COUNT(*) as unread_count
                FROM messages
                WHERE receiver_id = ? AND is_read = 0
                GROUP BY sender_id
             ) as unread ON conversations.other_user_id = unread.sender_id
             ORDER BY m.created_at DESC
             LIMIT ? OFFSET ?`,
            [user_id, user_id, user_id, user_id, pageSize, offset]
        );

        return rows;
    }

    /**
     * 标记消息为已读
     * @param {number} userId - 当前用户ID(接收者)
     * @param {number} senderId - 发送者ID
     * @returns {Promise<number>} 标记的消息数量
     */
    static async markAsRead(userId, senderId) {
        const [result] = await pool.execute(
            `UPDATE messages 
             SET is_read = 1 
             WHERE receiver_id = ? AND sender_id = ? AND is_read = 0`,
            [userId, senderId]
        );

        return result.affectedRows;
    }

    /**
     * 标记单条消息为已读
     * @param {number} messageId - 消息ID
     * @param {number} userId - 当前用户ID(必须是接收者)
     * @returns {Promise<boolean>}
     */
    static async markOneAsRead(messageId, userId) {
        const [result] = await pool.execute(
            `UPDATE messages 
             SET is_read = 1 
             WHERE message_id = ? AND receiver_id = ? AND is_read = 0`,
            [messageId, userId]
        );

        return result.affectedRows > 0;
    }

    /**
     * 获取未读消息数量
     * @param {number} userId - 用户ID
     * @returns {Promise<number>}
     */
    static async getUnreadCount(userId) {
        const [rows] = await pool.execute(
            `SELECT COUNT(*) as count 
             FROM messages 
             WHERE receiver_id = ? AND is_read = 0`,
            [userId]
        );

        return rows[0].count;
    }

    /**
     * 获取与特定用户的未读消息数量
     * @param {number} userId - 当前用户ID
     * @param {number} senderId - 发送者ID
     * @returns {Promise<number>}
     */
    static async getUnreadCountFrom(userId, senderId) {
        const [rows] = await pool.execute(
            `SELECT COUNT(*) as count 
             FROM messages 
             WHERE receiver_id = ? AND sender_id = ? AND is_read = 0`,
            [userId, senderId]
        );

        return rows[0].count;
    }

    /**
     * 删除消息
     * @param {number} messageId - 消息ID
     * @param {number} userId - 用户ID(只能删除自己发送的消息)
     * @returns {Promise<boolean>}
     */
    static async delete(messageId, userId) {
        const [result] = await pool.execute(
            'DELETE FROM messages WHERE message_id = ? AND sender_id = ?',
            [messageId, userId]
        );

        return result.affectedRows > 0;
    }

    /**
     * 检查消息是否属于用户
     * @param {number} messageId - 消息ID
     * @param {number} userId - 用户ID
     * @returns {Promise<boolean>}
     */
    static async belongsToUser(messageId, userId) {
        const [rows] = await pool.execute(
            `SELECT message_id FROM messages 
             WHERE message_id = ? AND (sender_id = ? OR receiver_id = ?)`,
            [messageId, userId, userId]
        );

        return rows.length > 0;
    }
}

module.exports = Message;
