// 校园论坛后端 - 主应用文件
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./src/config/db');

// 导入路由
const authRoutes = require('./src/routes/auth');
const postRoutes = require('./src/routes/posts');
const commentRoutes = require('./src/routes/comments');
const favoriteRoutes = require('./src/routes/favorites');
const messageRoutes = require('./src/routes/messages');

// 创建Express应用
const app = express();

// ============================================
// 中间件配置
// ============================================

// 解析JSON请求体
app.use(express.json());

// 解析URL编码的请求体
app.use(express.urlencoded({ extended: true }));

// 启用CORS（允许前端跨域访问）
app.use(cors({
    origin: '*',
    credentials: true
}));

// 请求日志中间件
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
    next();
});

// ============================================
// 路由配置
// ============================================

// 根路径 - 健康检查
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🎉 校园论坛API服务运行中！',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// 测试数据库连接
app.get('/api/test/db', async (req, res) => {
    try {
        const { pool } = require('./src/config/db');
        const [rows] = await pool.query('SELECT COUNT(*) as total FROM users');
        res.json({
            success: true,
            message: '数据库连接正常',
            data: {
                users: rows[0].total
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '数据库连接失败',
            error: error.message
        });
    }
});

// 获取所有分类
app.get('/api/categories', async (req, res) => {
    try {
        const { pool } = require('./src/config/db');
        const [rows] = await pool.query('SELECT * FROM categories ORDER BY category_id');
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取分类失败',
            error: error.message
        });
    }
});

// 获取帖子列表（分页）
app.get('/api/posts', async (req, res) => {
    try {
        const { pool } = require('./src/config/db');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const [rows] = await pool.query(`
            SELECT 
                p.post_id, p.title, p.content, p.price, p.location,
                p.view_count, p.comment_count, p.favorite_count,
                p.created_at,
                u.username, u.school,
                c.category_name
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN categories c ON p.category_id = c.category_id
            WHERE p.status = 'normal'
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM posts WHERE status = "normal"');

        res.json({
            success: true,
            data: {
                posts: rows,
                pagination: {
                    page,
                    limit,
                    total: countResult[0].total,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取帖子列表失败',
            error: error.message
        });
    }
});

// 获取帖子详情
app.get('/api/posts/:id', async (req, res) => {
    try {
        const { pool } = require('./src/config/db');
        const postId = req.params.id;

        const [rows] = await pool.query(`
            SELECT 
                p.*,
                u.username, u.school, u.grade,
                c.category_name
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN categories c ON p.category_id = c.category_id
            WHERE p.post_id = ? AND p.status = 'normal'
        `, [postId]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '帖子不存在'
            });
        }

        await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE post_id = ?', [postId]);

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取帖子详情失败',
            error: error.message
        });
    }
});

// ============================================
// API路由模块
// ============================================

// 认证路由
app.use('/api/auth', authRoutes);

// 帖子路由
app.use('/api/posts', postRoutes);

// 评论路由
app.use('/api', commentRoutes);

// 收藏路由
app.use('/api', favoriteRoutes);

// 消息路由
app.use('/api', messageRoutes);

// ============================================
// 404处理
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在',
        path: req.url
    });
});

// ============================================
// 错误处理中间件
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ 服务器错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : '请联系管理员'
    });
});

// ============================================
// 启动服务器
// ============================================
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await testConnection();

        app.listen(PORT, '0.0.0.0', () => {
            console.log('');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🚀 校园论坛后端服务启动成功！');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`   环境: ${process.env.NODE_ENV}`);
            console.log(`   端口: ${PORT}`);
            console.log(`   本地访问: http://localhost:${PORT}`);
            console.log(`   网络访问: http://192.168.190.247:${PORT}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('');
            console.log('✅ 可用接口:');
            console.log('   基础接口:');
            console.log(`     GET  /                           - 健康检查`);
            console.log(`     GET  /api/test/db                - 测试数据库`);
            console.log(`     GET  /api/categories             - 获取所有分类`);
            console.log(`     GET  /api/posts                  - 获取帖子列表`);
            console.log(`     GET  /api/posts/:id              - 获取帖子详情`);
            console.log('');
            console.log('   认证接口:');
            console.log(`     POST /api/auth/register          - 用户注册`);
            console.log(`     POST /api/auth/login             - 用户登录`);
            console.log(`     GET  /api/auth/profile           - 获取个人信息（需token）`);
            console.log(`     PUT  /api/auth/profile           - 更新个人信息（需token）`);
            console.log('');
            console.log('   帖子接口:');
            console.log(`     GET  /api/posts                  - 获取帖子列表`);
            console.log(`     GET  /api/posts/search           - 搜索帖子`);
            console.log(`     GET  /api/posts/:id              - 获取帖子详情`);
            console.log(`     POST /api/posts                  - 创建帖子（需token）`);
            console.log(`     PUT  /api/posts/:id              - 更新帖子（需token）`);
            console.log(`     DELETE /api/posts/:id            - 删除帖子（需token）`);
            console.log(`     GET  /api/posts/my/posts         - 我的帖子（需token）`);
            console.log('');
        });
    } catch (error) {
        console.error('❌ 服务器启动失败:', error);
        process.exit(1);
    }
};

startServer();
