const Favorite = require('../models/Favorite');
const { success, error } = require('../utils/response');

/**
 * 添加收藏
 */
async function addFavorite(req, res) {
    try {
        const { post_id } = req.body;
        const user_id = req.user.userId;

        if (!post_id) {
            return res.status(400).json(error('帖子ID不能为空'));
        }

        const favorite = await Favorite.add({ user_id, post_id });

        res.status(201).json(success(favorite, '收藏成功'));
    } catch (err) {
        console.error('添加收藏失败:', err);
        if (err.message === '已经收藏过该帖子') {
            return res.status(400).json(error(err.message));
        }
        if (err.message === '帖子不存在' || err.message === '该帖子不可收藏') {
            return res.status(404).json(error(err.message));
        }
        res.status(500).json(error('收藏失败'));
    }
}

/**
 * 取消收藏
 */
async function removeFavorite(req, res) {
    try {
        const post_id = parseInt(req.params.postId);
        const user_id = req.user.userId;

        await Favorite.remove(user_id, post_id);

        res.json(success(null, '取消收藏成功'));
    } catch (err) {
        console.error('取消收藏失败:', err);
        if (err.message === '未收藏该帖子') {
            return res.status(400).json(error(err.message));
        }
        res.status(500).json(error('取消收藏失败'));
    }
}

/**
 * 检查是否已收藏
 */
async function checkFavorite(req, res) {
    try {
        const post_id = parseInt(req.params.postId);
        const user_id = req.user.userId;

        const isFavorited = await Favorite.isFavorited(user_id, post_id);

        res.json(success({ is_favorited: isFavorited }));
    } catch (err) {
        console.error('检查收藏状态失败:', err);
        res.status(500).json(error('检查收藏状态失败'));
    }
}

/**
 * 获取我的收藏列表
 */
async function getMyFavorites(req, res) {
    try {
        const user_id = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;

        const result = await Favorite.findByUserId({
            user_id,
            page,
            pageSize
        });

        res.json(success({
            list: result.favorites,
            total: result.total,
            page,
            pageSize,
            totalPages: Math.ceil(result.total / pageSize)
        }));
    } catch (err) {
        console.error('获取收藏列表失败:', err);
        res.status(500).json(error('获取收藏列表失败'));
    }
}

/**
 * 获取帖子的收藏用户列表
 */
async function getPostFavorites(req, res) {
    try {
        const post_id = parseInt(req.params.postId);
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;

        const result = await Favorite.findByPostId({
            post_id,
            page,
            pageSize
        });

        res.json(success({
            list: result.users,
            total: result.total,
            page,
            pageSize,
            totalPages: Math.ceil(result.total / pageSize)
        }));
    } catch (err) {
        console.error('获取收藏用户列表失败:', err);
        res.status(500).json(error('获取收藏用户列表失败'));
    }
}

/**
 * 批量检查收藏状态
 */
async function checkBatchFavorites(req, res) {
    try {
        const { post_ids } = req.body;
        const user_id = req.user.userId;

        if (!Array.isArray(post_ids)) {
            return res.status(400).json(error('post_ids必须是数组'));
        }

        const result = await Favorite.checkBatch(user_id, post_ids);

        res.json(success(result));
    } catch (err) {
        console.error('批量检查收藏状态失败:', err);
        res.status(500).json(error('批量检查收藏状态失败'));
    }
}

module.exports = {
    addFavorite,
    removeFavorite,
    checkFavorite,
    getMyFavorites,
    getPostFavorites,
    checkBatchFavorites
};
