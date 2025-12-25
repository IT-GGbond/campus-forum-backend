#!/bin/bash
# Redis功能完整性测试脚本

echo "=========================================="
echo "   Redis功能完整性测试"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000"

# 测试1：Redis连接测试
echo "【测试1】Redis连接测试"
curl -s "${BASE_URL}/api/test/redis" | jq '.'
echo ""
echo ""

# 测试2：浏览量测试
echo "【测试2】浏览量实时统计测试"
echo "步骤1：获取当前浏览量"
redis-cli GET post:views:1
echo ""

echo "步骤2：访问帖子3次"
for i in {1..3}; do
    curl -s "${BASE_URL}/api/posts/1" > /dev/null
    echo "  第${i}次访问完成"
done
echo ""

echo "步骤3：验证Redis浏览量增加"
redis-cli GET post:views:1
echo ""
echo "✅ 如果浏览量增加了3，测试通过"
echo ""
echo ""

# 测试3：排行榜测试
echo "【测试3】热门排行榜测试"
echo "步骤1：查看TOP10热门帖子"
curl -s "${BASE_URL}/api/ranking/hot-posts?limit=5" | jq '.data[].post_id'
echo ""

echo "步骤2：查看排行榜统计"
curl -s "${BASE_URL}/api/ranking/stats" | jq '.'
echo ""

echo "步骤3：验证Redis排行榜数据"
redis-cli ZRANGE ranking:hot:weekly -5 -1
echo ""
echo "✅ 如果返回了帖子ID列表，测试通过"
echo ""
echo ""

# 测试4：未读消息测试（需要登录）
echo "【测试4】未读消息计数测试（需要登录token）"
echo "说明：需要先登录获取token，然后手动测试"
echo ""
echo "测试步骤："
echo "1. 登录获取token："
echo "   curl -X POST ${BASE_URL}/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"username\":\"user1\",\"password\":\"123456\"}'"
echo ""
echo "2. 发送消息："
echo "   curl -X POST ${BASE_URL}/api/messages \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"receiver_id\":2,\"content\":\"测试消息\"}'"
echo ""
echo "3. 验证Redis未读数："
echo "   redis-cli HGET user:unread:2 messages"
echo ""
echo "4. 查看未读数API："
echo "   curl ${BASE_URL}/api/messages/unread/count \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""
echo ""

# 测试5：Redis数据完整性
echo "【测试5】Redis数据完整性检查"
echo ""
echo "1. 浏览量Key数量："
redis-cli KEYS "post:views:*" | wc -l
echo ""

echo "2. 排行榜成员数："
redis-cli ZCARD ranking:hot:weekly
echo ""

echo "3. 未读消息Hash数量："
redis-cli KEYS "user:unread:*" | wc -l
echo ""

echo "4. Redis总Key数量："
redis-cli DBSIZE
echo ""

echo "5. Redis内存使用："
redis-cli INFO memory | grep "used_memory_human"
echo ""

echo "=========================================="
echo "   功能测试完成！"
echo "=========================================="
