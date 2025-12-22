// 用户认证控制器
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { success, error } = require('../utils/response');

/**
 * 用户注册
 */
exports.register = async (req, res) => {
    try {
        const { username, password, email, school, grade, contact, bio } = req.body;

        // 验证必填字段
        if (!username || !password || !email) {
            return error(res, '用户名、密码和邮箱为必填项', 400);
        }

        // 验证用户名长度
        if (username.length < 3 || username.length > 50) {
            return error(res, '用户名长度必须在3-50个字符之间', 400);
        }

        // 验证密码长度
        if (password.length < 6) {
            return error(res, '密码长度至少6个字符', 400);
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return error(res, '邮箱格式不正确', 400);
        }

        // 验证grade格式（如果提供）
        if (grade && (grade < 2000 || grade > 2100)) {
            return error(res, '年级格式不正确', 400);
        }

        // 检查用户名是否已存在
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return error(res, '用户名已被注册', 400);
        }

        // 检查邮箱是否已存在
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
            return error(res, '邮箱已被注册', 400);
        }

        // 创建用户（现在包含contact）
        const userId = await User.create({
            username,
            password,
            email,
            school: school || null,
            grade: grade || null,
            contact: contact || null,  // ← 新增
            bio: bio || null
        });

        // 生成token
        const token = jwt.sign(
            { userId, username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        return success(res, {
            userId,
            username,
            email,
            token
        }, '注册成功', 201);

    } catch (err) {
        console.error('注册错误:', err);
        return error(res, '注册失败，请稍后重试', 500);
    }
};

/**
 * 用户登录
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return error(res, '用户名和密码为必填项', 400);
        }

        const user = await User.findByUsername(username);
        if (!user) {
            return error(res, '用户名或密码错误', 401);
        }

        if (user.status === 'banned') {
            return error(res, '账号已被封禁', 403);
        }

        const isPasswordValid = await User.verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
            return error(res, '用户名或密码错误', 401);
        }

        const token = jwt.sign(
            { userId: user.user_id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        return success(res, {
            userId: user.user_id,
            username: user.username,
            email: user.email,
            school: user.school,
            grade: user.grade,
            contact: user.contact,  // ← 新增
            avatarUrl: user.avatar_url,
            bio: user.bio,
            postsCount: user.posts_count,
            token
        }, '登录成功');

    } catch (err) {
        console.error('登录错误:', err);
        return error(res, '登录失败，请稍后重试', 500);
    }
};

/**
 * 获取当前用户信息
 */
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) {
            return error(res, '用户不存在', 404);
        }

        return success(res, user);

    } catch (err) {
        console.error('获取用户信息错误:', err);
        return error(res, '获取用户信息失败', 500);
    }
};

/**
 * 更新用户信息
 */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { school, grade, contact, bio, avatar_url } = req.body;

        if (grade && (grade < 2000 || grade > 2100)) {
            return error(res, '年级格式不正确', 400);
        }

        const updated = await User.update(userId, {
            school,
            grade,
            contact,  // ← 新增
            bio,
            avatar_url
        });

        if (!updated) {
            return error(res, '没有可更新的内容', 400);
        }

        const user = await User.findById(userId);

        return success(res, user, '更新成功');

    } catch (err) {
        console.error('更新用户信息错误:', err);
        return error(res, '更新失败，请稍后重试', 500);
    }
};
