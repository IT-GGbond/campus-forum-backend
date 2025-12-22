const { pool } = require('../config/db');

/**
 * 评论数据模型
 */
class Comment {
    /**
     * 创建评论(使用事务)
     * @param {Object} commentData - 评论数据
     * @returns {Promise<Object>} 创建的评论信息
     */
    static async create({ post_id, user_id, content, parent_id = null }) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. 插入评论
            const [result] = await connection.execute(
                `INSERT INTO comments (post_id, user_id, content, parent_id, status, created_at)
                 VALUES (?, ?, ?, ?, 'normal', NOW())`,
                [post_id, user_id, content, parent_id]
            );

            const commentId = result.insertId;

            // 2. 更新帖子的评论数量
            await connection.execute(
                'UPDATE posts SET comment_count = comment_count + 1 WHERE post_id = ?',
                [post_id]
            );

            await connection.commit();

            return await this.findById(commentId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 根据ID查找评论
     * @param {number} commentId - 评论ID
     * @returns {Promise<Object|null>}
     */
    static async findById(commentId) {
        const [rows] = await pool.execute(
            `SELECT 
                c.comment_id,
                c.post_id,
                c.user_id,
                c.content,
                c.parent_id,
                c.status,
                c.created_at,
                u.username,
                u.school,
                u.avatar_url
             FROM comments c
             LEFT JOIN users u ON c.user_id = u.user_id
             WHERE c.comment_id = ?`,
            [commentId]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * 获取帖子的评论列表(支持分页和层级结构)
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} { comments, total }
     */
    static async findByPostId({ post_id, page = 1, pageSize = 20, status = 'normal' }) {
        const offset = (page - 1) * pageSize;

        // 查询总数
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total 
             FROM comments 
             WHERE post_id = ? AND status = ?`,
            [post_id, status]
        );
        const total = countResult[0].total;

        // 查询评论列表(只查询顶级评论,即parent_id为NULL的)
        const [rows] = await pool.execute(
            `SELECT 
                c.comment_id,
                c.post_id,
                c.user_id,
                c.content,
                c.parent_id,
                c.status,
                c.created_at,
                u.username,
                u.school,
                u.avatar_url,
                (SELECT COUNT(*) FROM comments WHERE parent_id = c.comment_id AND status = 'normal') as reply_count
             FROM comments c
             LEFT JOIN users u ON c.user_id = u.user_id
             WHERE c.post_id = ? AND c.status = ? AND c.parent_id IS NULL
             ORDER BY c.created_at ASC
             LIMIT ? OFFSET ?`,
            [post_id, status, pageSize, offset]
        );

        return { comments: rows, total };
    }

    /**
     * 获取评论的回复列表
     * @param {number} parentId - 父评论ID
     * @returns {Promise<Array>}
     */
    static async findReplies(parentId) {
        const [rows] = await pool.execute(
            `SELECT 
                c.comment_id,
                c.post_id,
                c.user_id,
                c.content,
                c.parent_id,
                c.status,
                c.created_at,
                u.username,
                u.school,
                u.avatar_url
             FROM comments c
             LEFT JOIN users u ON c.user_id = u.user_id
             WHERE c.parent_id = ? AND c.status = 'normal'
             ORDER BY c.created_at ASC`,
            [parentId]
        );

        return rows;
    }

    /**
     * 删除评论(使用事务,级联删除回复)
     * @param {number} commentId - 评论ID
     * @returns {Promise<boolean>}
     */
    static async delete(commentId) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. 获取评论信息
            const [comments] = await connection.execute(
                'SELECT post_id FROM comments WHERE comment_id = ?',
                [commentId]
            );

            if (comments.length === 0) {
                throw new Error('评论不存在');
            }

            const { post_id } = comments[0];

            // 2. 删除所有子评论(回复)
            await connection.execute(
                'DELETE FROM comments WHERE parent_id = ?',
                [commentId]
            );

            // 3. 删除评论本身
            const [deleteResult] = await connection.execute(
                'DELETE FROM comments WHERE comment_id = ?',
                [commentId]
            );

            // 4. 更新帖子的评论数量
            await connection.execute(
                'UPDATE posts SET comment_count = comment_count - 1 WHERE post_id = ? AND comment_count > 0',
                [post_id]
            );

            await connection.commit();

            return deleteResult.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 检查评论是否属于指定用户
     * @param {number} commentId - 评论ID
     * @param {number} userId - 用户ID
     * @returns {Promise<boolean>}
     */
    static async isOwnedByUser(commentId, userId) {
        const [rows] = await pool.execute(
            'SELECT user_id FROM comments WHERE comment_id = ?',
            [commentId]
        );

        return rows.length > 0 && rows[0].user_id === userId;
    }

    /**
     * 获取用户的所有评论
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>}
     */
    static async findByUserId({ user_id, page = 1, pageSize = 20 }) {
        const offset = (page - 1) * pageSize;

        // 查询总数
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total 
             FROM comments 
             WHERE user_id = ? AND status = 'normal'`,
            [user_id]
        );
        const total = countResult[0].total;

        // 查询评论列表
        const [rows] = await pool.execute(
            `SELECT 
                c.comment_id,
                c.post_id,
                c.user_id,
                c.content,
                c.parent_id,
                c.created_at,
                p.title as post_title
             FROM comments c
             LEFT JOIN posts p ON c.post_id = p.post_id
             WHERE c.user_id = ? AND c.status = 'normal'
             ORDER BY c.created_at DESC
             LIMIT ? OFFSET ?`,
            [user_id, pageSize, offset]
        );

        return { comments: rows, total };
    }
}

module.exports = Comment;
