// 排行榜路由
const express = require('express');
const router = express.Router();
const redisClient = require('../config/redis');
const Post = require('../models/Post');
const { success, error } = require('../utils/response');

/**
 * 获取热门帖子排行榜（TOP10）
 * GET /api/ranking/hot-posts
 * Query参数：
 *   - limit: 返回数量，默认10
 */
router.get('/hot-posts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        // 1. 从Redis获取TOP N帖子ID（按分数降序）
        // 使用负数索引从高到低获取：-1是最高分，-N是第N高分
        const postIds = await redisClient.zRange('ranking:hot:weekly', -limit, -1);

        // 反转数组，使其从高到低排序
        postIds.reverse();

        if (!postIds || postIds.length === 0) {
            return success(res, [], '暂无热门帖子');
        }

        // 2. 从MySQL批量获取帖子详情
        const posts = [];
        for (const id of postIds) {
            const post = await Post.findById(parseInt(id));
            if (post) {
                // 3. 从Redis获取实时浏览量
                try {
                    const views = await redisClient.get(`post:views:${id}`);
                    if (views) {
                        post.view_count = parseInt(views);
                    }
                    // 4. 从Redis获取热度分数
                    const score = await redisClient.zScore('ranking:hot:weekly', id);
                    post.hot_score = score || 0;
                } catch (err) {
                    console.error('Redis获取数据失败:', err);
                }
                posts.push(post);
            }
        }

        return success(res, posts, '获取成功');
    } catch (err) {
        console.error('获取排行榜失败:', err);
        return error(res, '获取排行榜失败: ' + err.message, 500);
    }
});

/**
 * 获取排行榜统计信息
 * GET /api/ranking/stats
 */
router.get('/stats', async (req, res) => {
    try {
        // 获取排行榜总帖子数
        const totalPosts = await redisClient.zCard('ranking:hot:weekly');

        // 获取最热帖子信息（带分数）
        // 使用负数索引-1获取分数最高的帖子
        const topPostIds = await redisClient.zRange('ranking:hot:weekly', -1, -1);

        let topPost = null;
        if (topPostIds.length > 0) {
            const score = await redisClient.zScore('ranking:hot:weekly', topPostIds[0]);
            topPost = {
                post_id: parseInt(topPostIds[0]),
                hot_score: score || 0
            };
        }

        const stats = {
            total_posts: totalPosts,
            top_post: topPost,
            ranking_type: 'weekly',
            last_updated: new Date().toISOString()
        };

        return success(res, stats, '获取成功');
    } catch (err) {
        console.error('获取统计信息失败:', err);
        return error(res, '获取统计信息失败: ' + err.message, 500);
    }
});

/**
 * 手动刷新排行榜（管理员功能，可选实现）
 * POST /api/ranking/refresh
 */
router.post('/refresh', async (req, res) => {
    try {
        // 从MySQL获取所有帖子的浏览量，重新构建排行榜
        const { pool } = require('../config/db');
        const [posts] = await pool.query(
            'SELECT post_id, view_count FROM posts WHERE status = "normal" ORDER BY view_count DESC LIMIT 100'
        );

        // 清空旧排行榜
        await redisClient.del('ranking:hot:weekly');

        // 重新添加
        for (const post of posts) {
            await redisClient.zAdd('ranking:hot:weekly', {
                score: post.view_count,
                value: post.post_id.toString()
            });
        }

        return success(res, { total: posts.length }, '排行榜已刷新');
    } catch (err) {
        console.error('刷新排行榜失败:', err);
        return error(res, '刷新排行榜失败: ' + err.message, 500);
    }
});

module.exports = router;
