const { pool } = require('../config/db');

/**
 * 帖子数据模型
 */
class Post {
    /**
     * 创建帖子(使用事务)
     * @param {Object} postData - 帖子数据
     * @param {number} postData.user_id - 用户ID
     * @param {number} postData.category_id - 分类ID
     * @param {string} postData.title - 标题
     * @param {string} postData.content - 内容
     * @returns {Promise<Object>} 创建的帖子信息
     */
    static async create({ user_id, category_id, title, content }) {
        const connection = await pool.getConnection();

        try {
            // 开始事务
            await connection.beginTransaction();

            // 1. 插入帖子
            const [result] = await connection.execute(
                `INSERT INTO posts (user_id, category_id, title, content, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'normal', NOW(), NOW())`,
                [user_id, category_id, title, content]
            );

            const postId = result.insertId;

            // 2. 更新用户的帖子数量
            await connection.execute(
                'UPDATE users SET posts_count = posts_count + 1 WHERE user_id = ?',
                [user_id]
            );

            // 3. 更新分类的帖子数量
            await connection.execute(
                'UPDATE categories SET post_count = post_count + 1 WHERE category_id = ?',
                [category_id]
            );

            // 提交事务
            await connection.commit();

            // 返回创建的帖子信息
            return await this.findById(postId);
        } catch (error) {
            // 发生错误,回滚事务
            await connection.rollback();
            throw error;
        } finally {
            // 释放连接
            connection.release();
        }
    }

    /**
     * 根据ID查找帖子(包含关联信息)
     * @param {number} postId - 帖子ID
     * @returns {Promise<Object|null>} 帖子信息
     */
    static async findById(postId) {
        const [rows] = await pool.execute(
            `SELECT 
        p.post_id,
        p.user_id,
        p.category_id,
        p.title,
        p.content,
        p.view_count,
        p.comment_count,
        p.favorite_count,
        p.status,
        p.created_at,
        p.updated_at,
        u.username,
        u.school,
        u.avatar_url,
        c.category_name
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.user_id
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.post_id = ?`,
            [postId]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * 获取帖子列表(分页)
     * @param {Object} params - 查询参数
     * @param {number} params.page - 页码
     * @param {number} params.pageSize - 每页数量
     * @param {number} params.categoryId - 分类ID(可选)
     * @param {number} params.userId - 用户ID(可选)
     * @param {string} params.status - 状态(可选)
     * @param {string} params.orderBy - 排序字段(可选)
     * @returns {Promise<Object>} { posts, total }
     */
    static async findAll({
        page = 1,
        pageSize = 20,
        categoryId = null,
        userId = null,
        status = 'normal',
        orderBy = 'created_at DESC'
    }) {
        // 确保参数是整数
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;
        const offset = (pageNum - 1) * pageSizeNum;

        // 构建查询条件
        let whereConditions = [];
        let queryParams = [];

        if (categoryId) {
            whereConditions.push('p.category_id = ?');
            queryParams.push(categoryId);
        }

        if (userId) {
            whereConditions.push('p.user_id = ?');
            queryParams.push(userId);
        }

        if (status) {
            whereConditions.push('p.status = ?');
            queryParams.push(status);
        } else {
            // 默认只查询正常状态的帖子
            whereConditions.push('p.status = ?');
            queryParams.push('normal');
        }

        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        // 查询总数
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total FROM posts p ${whereClause}`,
            queryParams
        );
        const total = countResult[0].total;

        // 查询列表
        const [rows] = await pool.execute(
            `SELECT 
        p.post_id,
        p.user_id,
        p.category_id,
        p.title,
        SUBSTRING(p.content, 1, 200) as content,
        p.view_count,
        p.comment_count,
        p.favorite_count,
        p.status,
        p.created_at,
        p.updated_at,
        u.username,
        u.school,
        u.avatar_url,
        c.category_name
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.user_id
       LEFT JOIN categories c ON p.category_id = c.category_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ${pageSizeNum} OFFSET ${offset}`,
            queryParams
        );

        return { posts: rows, total };
    }

    /**
     * 更新帖子
     * @param {number} postId - 帖子ID
     * @param {Object} updateData - 更新数据
     * @returns {Promise<Object>} 更新后的帖子信息
     */
    static async update(postId, updateData) {
        const allowedFields = ['title', 'content', 'category_id', 'status'];
        const updates = [];
        const values = [];

        // 只更新允许的字段
        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            throw new Error('没有可更新的字段');
        }

        // 添加更新时间
        updates.push('updated_at = NOW()');
        values.push(postId);

        await pool.execute(
            `UPDATE posts SET ${updates.join(', ')} WHERE post_id = ?`,
            values
        );

        return await this.findById(postId);
    }

    /**
     * 删除帖子(使用事务)
     * @param {number} postId - 帖子ID
     * @returns {Promise<boolean>} 是否删除成功
     */
    static async delete(postId) {
        const connection = await pool.getConnection();

        try {
            // 开始事务
            await connection.beginTransaction();

            // 1. 获取帖子信息
            const [posts] = await connection.execute(
                'SELECT user_id, category_id FROM posts WHERE post_id = ?',
                [postId]
            );

            if (posts.length === 0) {
                throw new Error('帖子不存在');
            }

            const { user_id, category_id } = posts[0];

            // 2. 删除相关的评论
            await connection.execute(
                'DELETE FROM comments WHERE post_id = ?',
                [postId]
            );

            // 3. 删除相关的收藏
            await connection.execute(
                'DELETE FROM favorites WHERE post_id = ?',
                [postId]
            );

            // 4. 删除帖子
            await connection.execute(
                'DELETE FROM posts WHERE post_id = ?',
                [postId]
            );

            // 5. 更新用户的帖子数量
            await connection.execute(
                'UPDATE users SET posts_count = posts_count - 1 WHERE user_id = ? AND posts_count > 0',
                [user_id]
            );

            // 6. 更新分类的帖子数量
            await connection.execute(
                'UPDATE categories SET post_count = post_count - 1 WHERE category_id = ? AND post_count > 0',
                [category_id]
            );

            // 提交事务
            await connection.commit();

            return true;
        } catch (error) {
            // 发生错误,回滚事务
            await connection.rollback();
            throw error;
        } finally {
            // 释放连接
            connection.release();
        }
    }

    /**
     * 增加浏览量
     * @param {number} postId - 帖子ID
     * @returns {Promise<void>}
     */
    static async incrementViews(postId) {
        await pool.execute(
            'UPDATE posts SET view_count = view_count + 1 WHERE post_id = ?',
            [postId]
        );
    }

    /**
     * 全文搜索帖子
     * @param {string} keyword - 搜索关键词
     * @param {number} page - 页码
     * @param {number} pageSize - 每页数量
     * @returns {Promise<Object>} { posts, total }
     */
    static async search(keyword, page = 1, pageSize = 20) {
        // 确保参数是整数
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;
        const offset = (pageNum - 1) * pageSizeNum;

        // 查询总数
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total 
       FROM posts 
       WHERE status = 'normal' 
       AND MATCH(title, content) AGAINST(? IN NATURAL LANGUAGE MODE)`,
            [keyword]
        );
        const total = countResult[0].total;

        // 查询列表
        const [rows] = await pool.execute(
            `SELECT 
        p.post_id,
        p.user_id,
        p.category_id,
        p.title,
        SUBSTRING(p.content, 1, 200) as content,
        p.view_count,
        p.comment_count,
        p.favorite_count,
        p.created_at,
        p.updated_at,
        u.username,
        u.school,
        u.avatar_url,
        c.category_name,
        MATCH(p.title, p.content) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.user_id
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.status = 'normal'
       AND MATCH(p.title, p.content) AGAINST(? IN NATURAL LANGUAGE MODE)
       ORDER BY relevance DESC, p.created_at DESC
       LIMIT ${pageSizeNum} OFFSET ${offset}`,
            [keyword, keyword]
        );

        return { posts: rows, total };
    }

    /**
     * 检查帖子是否属于指定用户
     * @param {number} postId - 帖子ID
     * @param {number} userId - 用户ID
     * @returns {Promise<boolean>}
     */
    static async isOwnedByUser(postId, userId) {
        const [rows] = await pool.execute(
            'SELECT user_id FROM posts WHERE post_id = ?',
            [postId]
        );

        return rows.length > 0 && rows[0].user_id === userId;
    }
}

module.exports = Post;
