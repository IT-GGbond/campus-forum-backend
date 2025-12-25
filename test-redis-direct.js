// 直接测试Redis连接和API
const redis = require('redis');

async function testRedis() {
    console.log('开始测试Redis...\n');

    const client = redis.createClient({
        socket: {
            host: '127.0.0.1',
            port: 6379
        }
    });

    client.on('error', (err) => {
        console.error('❌ Redis错误:', err.message);
    });

    client.on('ready', () => {
        console.log('✅ Redis就绪');
    });

    try {
        console.log('1. 正在连接Redis...');
        await client.connect();
        console.log('   ✅ 连接成功\n');

        console.log('2. 检查连接状态:');
        console.log('   - isReady:', client.isReady);
        console.log('   - isOpen:', client.isOpen);
        console.log();

        console.log('3. 测试基本命令:');
        await client.set('test:key', '123');
        const val = await client.get('test:key');
        console.log('   ✅ SET/GET:', val);

        const newVal = await client.incr('test:key');
        console.log('   ✅ INCR:', newVal);
        console.log();

        console.log('4. 测试Sorted Set:');
        await client.zAdd('test:ranking', { score: 100, value: '1' });
        await client.zIncrBy('test:ranking', 1, '1');
        const score = await client.zScore('test:ranking', '1');
        console.log('   ✅ ZADD/ZINCRBY/ZSCORE:', score);

        // 测试正序（分数从低到高）
        const rangeAsc = await client.zRange('test:ranking', 0, -1);
        console.log('   ✅ ZRANGE (正序):', rangeAsc);

        // 测试倒序（使用负数索引：-1是最高分）
        const rangeDesc = await client.zRange('test:ranking', -1, -1);
        console.log('   ✅ ZRANGE (倒序TOP1):', rangeDesc);
        console.log();

        console.log('5. 测试获取带分数的结果:');
        console.log('   使用 zRange + zScore 组合');
        const topIds = await client.zRange('test:ranking', -1, -1);
        if (topIds.length > 0) {
            const score = await client.zScore('test:ranking', topIds[0]);
            console.log('   ✅ TOP1结果:', { post_id: topIds[0], score: score });
        }

        console.log('\n✅ 所有测试通过！');

        await client.quit();
    } catch (err) {
        console.error('\n❌ 测试失败:', err);
        process.exit(1);
    }
}

testRedis();
