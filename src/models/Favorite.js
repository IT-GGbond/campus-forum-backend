const { pool } = require('../config/db');

/**
 * 收藏数据模型 (演示N:M多对多关系)
 */
class Favorite {
    /**
     * 添加收藏(使用事务)
     * @param {Object} favoriteData - 收藏数据
     * @returns {Promise<Object>} 收藏信息
     */
    static async add({ user_id, post_id }) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. 检查是否已收藏
            const [existing] = await connection.execute(
                'SELECT favorite_id FROM favorites WHERE user_id = ? AND post_id = ?',
                [user_id, post_id]
            );

            if (existing.length > 0) {
                throw new Error('已经收藏过该帖子');
            }

            // 2. 检查帖子是否存在
            const [posts] = await connection.execute(
                'SELECT post_id, status FROM posts WHERE post_id = ?',
                [post_id]
            );

            if (posts.length === 0) {
                throw new Error('帖子不存在');
            }

            if (posts[0].status !== 'normal') {
                throw new Error('该帖子不可收藏');
            }

            // 3. 插入收藏记录
            const [result] = await connection.execute(
                'INSERT INTO favorites (user_id, post_id, created_at) VALUES (?, ?, NOW())',
                [user_id, post_id]
            );

            // 4. 更新帖子的收藏数量
            await connection.execute(
                'UPDATE posts SET favorite_count = favorite_count + 1 WHERE post_id = ?',
                [post_id]
            );

            await connection.commit();

            return {
                favorite_id: result.insertId,
                user_id,
                post_id,
                created_at: new Date()
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 取消收藏(使用事务)
     * @param {number} userId - 用户ID
     * @param {number} postId - 帖子ID
     * @returns {Promise<boolean>}
     */
    static async remove(userId, postId) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. 删除收藏记录
            const [result] = await connection.execute(
                'DELETE FROM favorites WHERE user_id = ? AND post_id = ?',
                [userId, postId]
            );

            if (result.affectedRows === 0) {
                throw new Error('未收藏该帖子');
            }

            // 2. 更新帖子的收藏数量
            await connection.execute(
                'UPDATE posts SET favorite_count = favorite_count - 1 WHERE post_id = ? AND favorite_count > 0',
                [postId]
            );

            await connection.commit();

            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 检查是否已收藏
     * @param {number} userId - 用户ID
     * @param {number} postId - 帖子ID
     * @returns {Promise<boolean>}
     */
    static async isFavorited(userId, postId) {
        const [rows] = await pool.execute(
            'SELECT favorite_id FROM favorites WHERE user_id = ? AND post_id = ?',
            [userId, postId]
        );

        return rows.length > 0;
    }

    /**
     * 获取用户的收藏列表(带帖子详情)
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} { favorites, total }
     */
    static async findByUserId({ user_id, page = 1, pageSize = 20 }) {
        const offset = (page - 1) * pageSize;

        // 查询总数
        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM favorites WHERE user_id = ?',
            [user_id]
        );
        const total = countResult[0].total;

        // 查询收藏列表(多表JOIN,演示N:M关系查询)
        const [rows] = await pool.execute(
            `SELECT 
                f.favorite_id,
                f.user_id,
                f.post_id,
                f.created_at as favorited_at,
                p.title,
                p.content,
                p.price,
                p.location,
                p.status,
                p.view_count,
                p.comment_count,
                p.favorite_count,
                p.created_at as post_created_at,
                p.updated_at as post_updated_at,
                u.username as author_username,
                u.school as author_school,
                c.category_name
             FROM favorites f
             INNER JOIN posts p ON f.post_id = p.post_id
             LEFT JOIN users u ON p.user_id = u.user_id
             LEFT JOIN categories c ON p.category_id = c.category_id
             WHERE f.user_id = ?
             ORDER BY f.created_at DESC
             LIMIT ? OFFSET ?`,
            [user_id, pageSize, offset]
        );

        return { favorites: rows, total };
    }

    /**
     * 获取帖子的收藏列表(谁收藏了这个帖子)
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>}
     */
    static async findByPostId({ post_id, page = 1, pageSize = 20 }) {
        const offset = (page - 1) * pageSize;

        // 查询总数
        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM favorites WHERE post_id = ?',
            [post_id]
        );
        const total = countResult[0].total;

        // 查询收藏用户列表
        const [rows] = await pool.execute(
            `SELECT 
                f.favorite_id,
                f.user_id,
                f.created_at,
                u.username,
                u.school,
                u.avatar_url
             FROM favorites f
             LEFT JOIN users u ON f.user_id = u.user_id
             WHERE f.post_id = ?
             ORDER BY f.created_at DESC
             LIMIT ? OFFSET ?`,
            [post_id, pageSize, offset]
        );

        return { users: rows, total };
    }

    /**
     * 批量检查收藏状态
     * @param {number} userId - 用户ID
     * @param {Array<number>} postIds - 帖子ID数组
     * @returns {Promise<Object>} { post_id: boolean }
     */
    static async checkBatch(userId, postIds) {
        if (postIds.length === 0) {
            return {};
        }

        const placeholders = postIds.map(() => '?').join(',');
        const [rows] = await pool.execute(
            `SELECT post_id FROM favorites 
             WHERE user_id = ? AND post_id IN (${placeholders})`,
            [userId, ...postIds]
        );

        const result = {};
        postIds.forEach(id => {
            result[id] = false;
        });
        rows.forEach(row => {
            result[row.post_id] = true;
        });

        return result;
    }

    /**
     * 获取用户收藏数量
     * @param {number} userId - 用户ID
     * @returns {Promise<number>}
     */
    static async getCountByUser(userId) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as count FROM favorites WHERE user_id = ?',
            [userId]
        );

        return rows[0].count;
    }
}

module.exports = Favorite;
