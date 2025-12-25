const Post = require('../models/Post');
const { success, error } = require('../utils/response');
const redisClient = require('../config/redis'); // 引入Redis客户端

// 启动时检查Redis状态
setTimeout(() => {
    console.log('\n[postController] Redis状态检查:');
    console.log('  - redisClient 存在:', !!redisClient);
    console.log('  - redisClient.isReady:', redisClient?.isReady);
    console.log('  - redisClient.isOpen:', redisClient?.isOpen);
}, 2000);

/**
 * 创建帖子（改造版 - 增加Redis支持）
 */
exports.createPost = async (req, res) => {
    try {
        const { category_id, title, content } = req.body;
        const user_id = req.user.userId;

        // 验证必填字段
        if (!category_id || !title || !content) {
            return error(res, '分类、标题和内容不能为空', 400);
        }

        // 验证标题长度
        if (title.length < 5 || title.length > 100) {
            return error(res, '标题长度必须在5-100个字符之间', 400);
        }

        // 验证内容长度
        if (content.length < 10) {
            return error(res, '内容至少需要10个字符', 400);
        }

        // 创建帖子(包含事务处理)
        const post = await Post.create({
            user_id,
            category_id,
            title,
            content
        });

        // ========== Redis扩展功能 ==========
        // 初始化Redis数据（使用await确保写入成功）
        const postId = post.post_id;
        try {
            await redisClient.set(`post:views:${postId}`, '0');
            await redisClient.zAdd('ranking:hot:weekly', {
                score: 0,
                value: postId.toString()
            });
            console.log(`✅ Redis初始化成功: post:${postId}`);
        } catch (err) {
            console.error('❌ Redis初始化失败:', err.message);
        }
        // ===================================

        return success(res, post, '帖子创建成功', 201);
    } catch (err) {
        console.error('创建帖子失败:', err);
        return error(res, '创建帖子失败: ' + err.message, 500);
    }
};

/**
 * 获取帖子列表
 */
exports.getPostList = async (req, res) => {
    try {
        const {
            page = 1,
            pageSize = 20,
            category_id,
            user_id,
            orderBy = 'created_at DESC'
        } = req.query;

        const { posts, total } = await Post.findAll({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            categoryId: category_id ? parseInt(category_id) : null,
            userId: user_id ? parseInt(user_id) : null,
            status: 'normal',
            orderBy
        });

        return success(res, {
            posts,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        }, '获取帖子列表成功');
    } catch (err) {
        console.error('获取帖子列表失败:', err);
        console.error('错误详情:', err.message);
        console.error('错误堆栈:', err.stack);
        return error(res, '获取帖子列表失败: ' + err.message, 500);
    }
};

/**
 * 获取帖子详情（改造版 - 使用Redis计数）
 */
exports.getPostDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const post = await Post.findById(id);

        if (!post) {
            return error(res, '帖子不存在', 404);
        }

        // ========== Redis扩展功能 ==========
        if (redisClient && redisClient.isReady) {
            try {
                // 1. 确保Key存在，如果不存在则初始化为当前MySQL值
                const exists = await redisClient.exists(`post:views:${id}`);

                if (!exists) {
                    await redisClient.set(`post:views:${id}`, String(post.view_count));
                    // 同时初始化排行榜
                    await redisClient.zAdd('ranking:hot:weekly', {
                        score: post.view_count,
                        value: String(id)
                    });
                }

                // 2. 浏览量+1
                const newViews = await redisClient.incr(`post:views:${id}`);

                // 3. 同步更新排行榜分数
                await redisClient.zIncrBy('ranking:hot:weekly', 1, String(id));

                // 4. 使用Redis中的实时浏览量
                post.view_count = newViews;
            } catch (err) {
                console.error('Redis操作失败:', err.message);
                // Redis失败时使用MySQL数据
            }
        }
        // ===================================

        return success(res, post, '获取帖子详情成功');
    } catch (err) {
        console.error('获取帖子详情失败:', err);
        return error(res, '获取帖子详情失败: ' + err.message, 500);
    }
};

/**
 * 更新帖子
 */
exports.updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category_id, status } = req.body;
        const user_id = req.user.userId;

        // 检查帖子是否存在
        const post = await Post.findById(id);
        if (!post) {
            return error(res, '帖子不存在', 404);
        }

        // 检查权限(只能修改自己的帖子)
        if (post.user_id !== user_id) {
            return error(res, '无权修改此帖子', 403);
        }

        // 构建更新数据
        const updateData = {};
        if (title !== undefined) {
            if (title.length < 5 || title.length > 100) {
                return error(res, '标题长度必须在5-100个字符之间', 400);
            }
            updateData.title = title;
        }
        if (content !== undefined) {
            if (content.length < 10) {
                return error(res, '内容至少需要10个字符', 400);
            }
            updateData.content = content;
        }
        if (category_id !== undefined) {
            updateData.category_id = category_id;
        }
        if (status !== undefined && ['normal', 'draft', 'deleted'].includes(status)) {
            updateData.status = status;
        }

        if (Object.keys(updateData).length === 0) {
            return error(res, '没有可更新的内容', 400);
        }

        // 更新帖子
        const updatedPost = await Post.update(id, updateData);

        return success(res, updatedPost, '帖子更新成功');
    } catch (err) {
        console.error('更新帖子失败:', err);
        return error(res, '更新帖子失败: ' + err.message, 500);
    }
};

/**
 * 删除帖子
 */
exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.userId;

        // 检查帖子是否存在
        const post = await Post.findById(id);
        if (!post) {
            return error(res, '帖子不存在', 404);
        }

        // 检查权限(只能删除自己的帖子)
        if (post.user_id !== user_id) {
            return error(res, '无权删除此帖子', 403);
        }

        // 删除帖子(包含事务处理:删除评论、收藏,更新计数)
        await Post.delete(id);

        return success(res, null, '帖子删除成功');
    } catch (err) {
        console.error('删除帖子失败:', err);
        return error(res, '删除帖子失败: ' + err.message, 500);
    }
};

/**
 * 搜索帖子
 */
exports.searchPosts = async (req, res) => {
    try {
        const { keyword, page = 1, pageSize = 20 } = req.query;

        if (!keyword || keyword.trim().length === 0) {
            return error(res, '搜索关键词不能为空', 400);
        }

        const { posts, total } = await Post.search(
            keyword.trim(),
            parseInt(page),
            parseInt(pageSize)
        );

        return success(res, {
            posts,
            keyword,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        }, '搜索成功');
    } catch (err) {
        console.error('搜索帖子失败:', err);
        return error(res, '搜索失败: ' + err.message, 500);
    }
};

/**
 * 获取我的帖子列表
 */
exports.getMyPosts = async (req, res) => {
    try {
        const { page = 1, pageSize = 20, status } = req.query;
        const user_id = req.user.userId;

        const { posts, total } = await Post.findAll({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            userId: user_id,
            status: status || null, // 可以查看自己的所有状态帖子
            orderBy: 'created_at DESC'
        });

        return success(res, {
            posts,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        }, '获取我的帖子列表成功');
    } catch (err) {
        console.error('获取我的帖子列表失败:', err);
        return error(res, '获取我的帖子列表失败: ' + err.message, 500);
    }
};
