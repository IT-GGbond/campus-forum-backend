// 定时同步任务：将Redis数据同步到MySQL
const redisClient = require('../config/redis');
const { pool } = require('../config/db');

/**
 * 将Redis浏览量同步到MySQL
 */
async function syncViewCounts() {
    try {
        console.log('🔄 [定时任务] 开始同步Redis浏览量到MySQL...');
        const startTime = Date.now();

        // 获取所有浏览量Key
        const keys = await redisClient.keys('post:views:*');

        if (keys.length === 0) {
            console.log('✅ [定时任务] 无需同步（没有浏览量数据）');
            return;
        }

        let syncCount = 0;
        let errorCount = 0;

        // 批量同步
        for (const key of keys) {
            try {
                const postId = key.split(':')[2];
                const views = await redisClient.get(key);

                // 更新MySQL
                await pool.query(
                    'UPDATE posts SET view_count = ? WHERE post_id = ?',
                    [parseInt(views), parseInt(postId)]
                );

                syncCount++;
            } catch (err) {
                console.error(`❌ [定时任务] 同步帖子 ${key} 失败:`, err.message);
                errorCount++;
            }
        }

        const duration = Date.now() - startTime;
        console.log(`✅ [定时任务] 同步完成！`);
        console.log(`   - 成功: ${syncCount} 条`);
        console.log(`   - 失败: ${errorCount} 条`);
        console.log(`   - 耗时: ${duration}ms`);
    } catch (err) {
        console.error('❌ [定时任务] 同步失败:', err);
    }
}

/**
 * 清理过期排行榜数据（每周重置）
 */
async function resetWeeklyRanking() {
    try {
        console.log('🔄 [定时任务] 重置周排行榜...');

        // 获取当前排行榜数据量
        const count = await redisClient.zCard('ranking:hot:weekly');

        // 删除旧排行榜
        await redisClient.del('ranking:hot:weekly');

        console.log(`✅ [定时任务] 排行榜已重置（删除了 ${count} 条记录）`);
    } catch (err) {
        console.error('❌ [定时任务] 重置失败:', err);
    }
}

/**
 * 初始化Redis数据（从MySQL同步）
 * 用于系统启动时初始化Redis数据
 */
async function initRedisFromMySQL() {
    try {
        console.log('🔄 [初始化] 从MySQL同步数据到Redis...');

        // 1. 同步帖子浏览量
        const [posts] = await pool.query(
            'SELECT post_id, view_count FROM posts WHERE status = "normal"'
        );

        for (const post of posts) {
            // 设置浏览量
            await redisClient.set(`post:views:${post.post_id}`, post.view_count.toString());
            // 添加到排行榜
            await redisClient.zAdd('ranking:hot:weekly', {
                score: post.view_count,
                value: post.post_id.toString()
            });
        }

        console.log(`✅ [初始化] 帖子浏览量同步完成（${posts.length} 条）`);

        // 2. 同步用户未读消息数
        const [messages] = await pool.query(`
            SELECT receiver_id, COUNT(*) as unread_count
            FROM messages
            WHERE is_read = 0
            GROUP BY receiver_id
        `);

        for (const msg of messages) {
            await redisClient.hSet(
                `user:unread:${msg.receiver_id}`,
                'messages',
                msg.unread_count.toString()
            );
        }

        console.log(`✅ [初始化] 未读消息同步完成（${messages.length} 个用户）`);
    } catch (err) {
        console.error('❌ [初始化] 同步失败:', err);
    }
}

// 启动定时任务
function startScheduledTasks() {
    console.log('📅 [定时任务] 启动定时任务...');

    // 每5分钟同步一次浏览量到MySQL
    const syncInterval = setInterval(syncViewCounts, 5 * 60 * 1000);
    console.log('   ⏰ 浏览量同步任务: 每5分钟执行一次');

    // 每周一凌晨0点重置排行榜
    const checkResetInterval = setInterval(() => {
        const now = new Date();
        // 每周一(1) 且 0点 且 前5分钟
        if (now.getDay() === 1 && now.getHours() === 0 && now.getMinutes() < 5) {
            resetWeeklyRanking();
        }
    }, 5 * 60 * 1000);
    console.log('   ⏰ 排行榜重置任务: 每周一凌晨0点执行');

    // 优雅关闭
    process.on('SIGINT', () => {
        clearInterval(syncInterval);
        clearInterval(checkResetInterval);
        console.log('👋 [定时任务] 已停止');
    });
}

module.exports = {
    syncViewCounts,
    resetWeeklyRanking,
    initRedisFromMySQL,
    startScheduledTasks
};
