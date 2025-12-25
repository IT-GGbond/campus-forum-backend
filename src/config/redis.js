// Redis配置文件
const redis = require('redis');
require('dotenv').config();

// 创建Redis客户端
const redisClient = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT) || 6379
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: 0
});

// 连接事件
redisClient.on('connect', () => {
    console.log('✅ Redis连接成功！');
    console.log(`   地址: ${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`);
});

redisClient.on('error', (err) => {
    console.error('❌ Redis错误:', err);
});

redisClient.on('ready', () => {
    console.log('🚀 Redis客户端已就绪！');
    console.log(`   连接状态: ${redisClient.isReady ? '已就绪' : '未就绪'}`);
});

// 连接Redis
redisClient.connect().catch(err => {
    console.error('❌ Redis连接失败:', err);
    console.error('   请确保Redis服务已启动');
});

// 优雅关闭
process.on('SIGINT', async () => {
    try {
        await redisClient.quit();
        console.log('👋 Redis连接已关闭');
    } catch (err) {
        console.error('关闭Redis连接失败:', err);
    }
    process.exit(0);
});

module.exports = redisClient;
