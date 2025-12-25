#!/bin/bash
# 校园论坛Redis性能测试脚本
# 使用Apache Bench进行并发压力测试

echo "=========================================="
echo "   校园论坛 Redis 性能测试"
echo "=========================================="
echo ""

# 配置
BASE_URL="http://localhost:3000"
CONCURRENCY=10
REQUESTS=1000

# 测试1：帖子详情接口（包含Redis浏览量+1）
echo "【测试1】帖子详情接口性能测试"
echo "- 接口: GET /api/posts/1"
echo "- 并发: ${CONCURRENCY} 个用户"
echo "- 请求: ${REQUESTS} 次"
echo ""

ab -n $REQUESTS -c $CONCURRENCY "${BASE_URL}/api/posts/1" > /tmp/test_post_detail.txt 2>&1

# 提取关键指标
echo "测试结果："
grep "Requests per second" /tmp/test_post_detail.txt
grep "Time per request" /tmp/test_post_detail.txt | head -1
grep "Failed requests" /tmp/test_post_detail.txt
echo ""
echo "详细报告已保存到: /tmp/test_post_detail.txt"
echo ""

# 测试2：排行榜接口（Redis Sorted Set查询）
echo "=========================================="
echo "【测试2】热门排行榜接口性能测试"
echo "- 接口: GET /api/ranking/hot-posts"
echo "- 并发: ${CONCURRENCY} 个用户"
echo "- 请求: ${REQUESTS} 次"
echo ""

ab -n $REQUESTS -c $CONCURRENCY "${BASE_URL}/api/ranking/hot-posts" > /tmp/test_ranking.txt 2>&1

echo "测试结果："
grep "Requests per second" /tmp/test_ranking.txt
grep "Time per request" /tmp/test_ranking.txt | head -1
grep "Failed requests" /tmp/test_ranking.txt
echo ""
echo "详细报告已保存到: /tmp/test_ranking.txt"
echo ""

# 测试3：排行榜统计接口
echo "=========================================="
echo "【测试3】排行榜统计接口性能测试"
echo "- 接口: GET /api/ranking/stats"
echo "- 并发: ${CONCURRENCY} 个用户"
echo "- 请求: ${REQUESTS} 次"
echo ""

ab -n $REQUESTS -c $CONCURRENCY "${BASE_URL}/api/ranking/stats" > /tmp/test_stats.txt 2>&1

echo "测试结果："
grep "Requests per second" /tmp/test_stats.txt
grep "Time per request" /tmp/test_ranking.txt | head -1
grep "Failed requests" /tmp/test_stats.txt
echo ""
echo "详细报告已保存到: /tmp/test_stats.txt"
echo ""

# Redis数据验证
echo "=========================================="
echo "【Redis数据验证】"
echo ""

echo "1. 浏览量数据："
redis-cli GET post:views:1
echo ""

echo "2. 排行榜TOP5："
redis-cli ZRANGE ranking:hot:weekly -5 -1
echo ""

echo "3. Redis数据库大小："
redis-cli DBSIZE
echo ""

echo "4. Redis内存使用："
redis-cli INFO memory | grep "used_memory_human"
echo ""

echo "=========================================="
echo "   测试完成！"
echo "=========================================="
echo ""
echo "详细报告文件："
echo "  - /tmp/test_post_detail.txt"
echo "  - /tmp/test_ranking.txt"
echo "  - /tmp/test_stats.txt"
