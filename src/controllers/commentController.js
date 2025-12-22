const Comment = require('../models/Comment');
const { success, error } = require('../utils/response');

/**
 * 创建评论
 */
async function createComment(req, res) {
    try {
        const { post_id, content, parent_id } = req.body;
        const user_id = req.user.userId;

        // 验证必填字段
        if (!post_id || !content) {
            return res.status(400).json(error('帖子ID和评论内容不能为空'));
        }

        // 验证评论内容长度
        if (content.length < 1 || content.length > 1000) {
            return res.status(400).json(error('评论内容长度应在1-1000字符之间'));
        }

        // 创建评论
        const comment = await Comment.create({
            post_id,
            user_id,
            content,
            parent_id: parent_id || null
        });

        res.status(201).json(success(comment, '评论成功'));
    } catch (err) {
        console.error('创建评论失败:', err);
        res.status(500).json(error('评论失败'));
    }
}

/**
 * 获取帖子的评论列表
 */
async function getCommentsByPost(req, res) {
    try {
        const post_id = parseInt(req.params.postId);
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;

        const result = await Comment.findByPostId({
            post_id,
            page,
            pageSize
        });

        // 获取每个顶级评论的回复
        for (let comment of result.comments) {
            comment.replies = await Comment.findReplies(comment.comment_id);
        }

        res.json(success({
            list: result.comments,
            total: result.total,
            page,
            pageSize,
            totalPages: Math.ceil(result.total / pageSize)
        }));
    } catch (err) {
        console.error('获取评论列表失败:', err);
        res.status(500).json(error('获取评论列表失败'));
    }
}

/**
 * 获取评论的回复列表
 */
async function getReplies(req, res) {
    try {
        const parentId = parseInt(req.params.commentId);
        const replies = await Comment.findReplies(parentId);

        res.json(success(replies));
    } catch (err) {
        console.error('获取回复列表失败:', err);
        res.status(500).json(error('获取回复列表失败'));
    }
}

/**
 * 删除评论
 */
async function deleteComment(req, res) {
    try {
        const commentId = parseInt(req.params.id);
        const userId = req.user.userId;

        // 检查评论是否存在且属于当前用户
        const isOwner = await Comment.isOwnedByUser(commentId, userId);
        if (!isOwner) {
            return res.status(403).json(error('无权删除此评论'));
        }

        await Comment.delete(commentId);
        res.json(success(null, '删除成功'));
    } catch (err) {
        console.error('删除评论失败:', err);
        res.status(500).json(error(err.message || '删除评论失败'));
    }
}

/**
 * 获取我的评论列表
 */
async function getMyComments(req, res) {
    try {
        const user_id = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;

        const result = await Comment.findByUserId({
            user_id,
            page,
            pageSize
        });

        res.json(success({
            list: result.comments,
            total: result.total,
            page,
            pageSize,
            totalPages: Math.ceil(result.total / pageSize)
        }));
    } catch (err) {
        console.error('获取我的评论失败:', err);
        res.status(500).json(error('获取我的评论失败'));
    }
}

module.exports = {
    createComment,
    getCommentsByPost,
    getReplies,
    deleteComment,
    getMyComments
};
