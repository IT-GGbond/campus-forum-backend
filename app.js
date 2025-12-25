// 校园论坛后端 - 主应用文件
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./src/config/db');
const redisClient = require('./src/config/redis'); // 引入Redis客户端

// 导入路由
const authRoutes = require('./src/routes/auth');
const postRoutes = require('./src/routes/posts');
const commentRoutes = require('./src/routes/comments');
const favoriteRoutes = require('./src/routes/favorites');
const messageRoutes = require('./src/routes/messages');
const rankingRoutes = require('./src/routes/ranking'); // 新增排行榜路由

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

// ========== Redis扩展功能 ==========
// 测试Redis连接
app.get('/api/test/redis', async (req, res) => {
    try {
        console.log('[Redis测试] 开始测试Redis连接...');
        console.log('[Redis测试] 连接状态:', redisClient.isOpen ? '已连接' : '未连接');

        // 测试写入
        console.log('[Redis测试] 执行 SET test:connection OK');
        await redisClient.set('test:connection', 'OK', { EX: 10 });
        console.log('[Redis测试] ✅ SET 成功');

        // 测试读取
        console.log('[Redis测试] 执行 GET test:connection');
        const value = await redisClient.get('test:connection');
        console.log('[Redis测试] ✅ GET 成功, 值:', value);

        // 获取Redis信息
        const dbSize = await redisClient.dbSize();
        console.log('[Redis测试] ✅ DBSIZE:', dbSize);

        // 获取所有keys
        const keys = await redisClient.keys('*');
        console.log('[Redis测试] ✅ 所有keys:', keys);

        res.json({
            success: true,
            message: 'Redis连接正常',
            data: {
                is_connected: redisClient.isOpen,
                test_value: value,
                db_size: dbSize,
                all_keys: keys
            }
        });
    } catch (error) {
        console.error('[Redis测试] ❌ 测试失败:', error);
        console.error('[Redis测试] 错误详情:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Redis连接失败',
            error: error.message,
            stack: error.stack
        });
    }
});
// ===================================

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

// ============================================
// API路由模块
// ============================================
// 注意：帖子相关路由已移至 src/routes/posts.js 和 src/controllers/postController.js
// 避免在此处重复定义，否则会导致路由冲突，Redis功能无法生效

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

// ========== Redis扩展功能 ==========
// 排行榜路由（新增）
app.use('/api/ranking', rankingRoutes);
// ===================================

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

        // ========== Redis扩展功能 ==========
        // 启动定时同步任务（可选）
        const { startScheduledTasks, initRedisFromMySQL } = require('./src/tasks/syncRedisToMySQL');

        // 初始化Redis数据
        if (process.env.INIT_REDIS === 'true') {
            await initRedisFromMySQL();
        }

        // 启动定时任务
        if (process.env.ENABLE_SYNC === 'true') {
            startScheduledTasks();
        }
        // ===================================

        app.listen(PORT, '0.0.0.0', () => {
            console.log('');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🚀 校园论坛后端服务启动成功！');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`   环境: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   端口: ${PORT}`);
            console.log(`   本地访问: http://localhost:${PORT}`);
            console.log(`   网络访问: http://192.168.190.247:${PORT}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('');
            console.log('✅ 可用接口:');
            console.log('   基础接口:');
            console.log(`     GET  /                           - 健康检查`);
            console.log(`     GET  /api/test/db                - 测试数据库`);
            console.log(`     GET  /api/test/redis             - 测试Redis（新增）`);
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
            console.log(`     GET  /api/posts/:id              - 获取帖子详情（Redis加速）`);
            console.log(`     POST /api/posts                  - 创建帖子（需token）`);
            console.log(`     PUT  /api/posts/:id              - 更新帖子（需token）`);
            console.log(`     DELETE /api/posts/:id            - 删除帖子（需token）`);
            console.log(`     GET  /api/posts/my/posts         - 我的帖子（需token）`);
            console.log('');
            console.log('   ⭐ 排行榜接口（新增Redis功能）:');
            console.log(`     GET  /api/ranking/hot-posts      - 热门帖子TOP10`);
            console.log(`     GET  /api/ranking/stats          - 排行榜统计`);
            console.log(`     POST /api/ranking/refresh        - 刷新排行榜`);
            console.log('');
        });
    } catch (error) {
        console.error('❌ 服务器启动失败:', error);
        process.exit(1);
    }
};

startServer();
