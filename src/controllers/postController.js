const Post = require('../models/Post');
const { success, error } = require('../utils/response');

/**
 * 创建帖子
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

        success(res, '帖子创建成功', post, 201);
    } catch (err) {
        console.error('创建帖子失败:', err);
        error(res, '创建帖子失败: ' + err.message, 500);
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

        success(res, '获取帖子列表成功', {
            posts,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    } catch (err) {
        console.error('获取帖子列表失败:', err);
        error(res, '获取帖子列表失败', 500);
    }
};

/**
 * 获取帖子详情
 */
exports.getPostDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const post = await Post.findById(id);

        if (!post) {
            return error(res, '帖子不存在', 404);
        }

        // 增加浏览量
        await Post.incrementViews(id);
        post.view_count += 1;

        success(res, '获取帖子详情成功', post);
    } catch (err) {
        console.error('获取帖子详情失败:', err);
        error(res, '获取帖子详情失败', 500);
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

        success(res, '帖子更新成功', updatedPost);
    } catch (err) {
        console.error('更新帖子失败:', err);
        error(res, '更新帖子失败: ' + err.message, 500);
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

        success(res, '帖子删除成功');
    } catch (err) {
        console.error('删除帖子失败:', err);
        error(res, '删除帖子失败: ' + err.message, 500);
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

        success(res, '搜索成功', {
            posts,
            keyword,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    } catch (err) {
        console.error('搜索帖子失败:', err);
        error(res, '搜索失败: ' + err.message, 500);
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

        success(res, '获取我的帖子列表成功', {
            posts,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    } catch (err) {
        console.error('获取我的帖子列表失败:', err);
        error(res, '获取我的帖子列表失败', 500);
    }
};
