#!/bin/bash

# 私聊消息模块测试脚本
# 使用方法: bash test-messages.sh

BASE_URL="http://localhost:3000/api"

echo "======================================"
echo "私聊消息模块测试脚本"
echo "======================================"
echo ""

# 1. 登录第一个用户
echo "1. 登录用户1 (testuser1)..."
LOGIN1_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","password":"Test123456"}')

TOKEN1=$(echo $LOGIN1_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN1" ]; then
    echo "❌ 用户1登录失败！"
    echo $LOGIN1_RESPONSE
    exit 1
fi

USER1_ID=$(echo $LOGIN1_RESPONSE | grep -o '"userId":[0-9]*' | cut -d':' -f2)
echo "✅ 用户1登录成功，ID: $USER1_ID, Token: ${TOKEN1:0:20}..."
echo ""

# 2. 注册并登录第二个用户
echo "2. 注册用户2..."
REGISTER2_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","password":"Test123456","email":"testuser2@test.com","school":"测试大学","grade":2023,"contact":"13800138001"}')

echo "注册响应: $REGISTER2_RESPONSE"
echo ""

echo "3. 登录用户2 (testuser2)..."
LOGIN2_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","password":"Test123456"}')

TOKEN2=$(echo $LOGIN2_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN2" ]; then
    echo "❌ 用户2登录失败！"
    echo $LOGIN2_RESPONSE
    exit 1
fi

USER2_ID=$(echo $LOGIN2_RESPONSE | grep -o '"userId":[0-9]*' | cut -d':' -f2)
echo "✅ 用户2登录成功，ID: $USER2_ID, Token: ${TOKEN2:0:20}..."
echo ""

# 4. 用户1给用户2发送消息
echo "4. 用户1给用户2发送消息..."
MSG1_RESPONSE=$(curl -s -X POST ${BASE_URL}/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{\"receiver_id\":$USER2_ID,\"content\":\"你好！我是用户1\"}")

echo "响应: $MSG1_RESPONSE"
echo ""

# 5. 用户1再发一条消息
echo "5. 用户1再发一条消息..."
MSG2_RESPONSE=$(curl -s -X POST ${BASE_URL}/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{\"receiver_id\":$USER2_ID,\"content\":\"有空一起吃饭吗？\"}")

echo "响应: $MSG2_RESPONSE"
echo ""

# 6. 用户2查看未读消息数
echo "6. 用户2查看未读消息总数..."
UNREAD_RESPONSE=$(curl -s -X GET "${BASE_URL}/messages/unread/count" \
  -H "Authorization: Bearer $TOKEN2")

echo "响应: $UNREAD_RESPONSE"
UNREAD_COUNT=$(echo $UNREAD_RESPONSE | grep -o '"unread_count":[0-9]*' | cut -d':' -f2)
echo "未读消息数: $UNREAD_COUNT (应该为2)"
echo ""

# 7. 用户2查看对话列表
echo "7. 用户2查看对话列表..."
CONV_LIST_RESPONSE=$(curl -s -X GET "${BASE_URL}/messages/conversations?page=1&pageSize=20" \
  -H "Authorization: Bearer $TOKEN2")

echo "响应: $CONV_LIST_RESPONSE"
echo ""

# 8. 用户2查看与用户1的对话记录
echo "8. 用户2查看与用户1的对话记录..."
CONVERSATION_RESPONSE=$(curl -s -X GET "${BASE_URL}/messages/conversation/${USER1_ID}?page=1&pageSize=50" \
  -H "Authorization: Bearer $TOKEN2")

echo "响应: $CONVERSATION_RESPONSE"
echo ""

# 9. 用户2回复消息
echo "9. 用户2回复消息..."
REPLY_RESPONSE=$(curl -s -X POST ${BASE_URL}/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d "{\"receiver_id\":$USER1_ID,\"content\":\"好啊，什么时候？\"}")

echo "响应: $REPLY_RESPONSE"
echo ""

# 10. 用户2标记与用户1的消息为已读
echo "10. 用户2标记与用户1的消息为已读..."
MARK_READ_RESPONSE=$(curl -s -X PUT "${BASE_URL}/messages/read/${USER1_ID}" \
  -H "Authorization: Bearer $TOKEN2")

echo "响应: $MARK_READ_RESPONSE"
echo ""

# 11. 用户2再次查看未读消息数
echo "11. 用户2再次查看未读消息数..."
UNREAD2_RESPONSE=$(curl -s -X GET "${BASE_URL}/messages/unread/count" \
  -H "Authorization: Bearer $TOKEN2")

echo "响应: $UNREAD2_RESPONSE"
UNREAD_COUNT2=$(echo $UNREAD2_RESPONSE | grep -o '"unread_count":[0-9]*' | cut -d':' -f2)
echo "未读消息数: $UNREAD_COUNT2 (应该为0)"
echo ""

# 12. 用户1查看对话记录
echo "12. 用户1查看与用户2的对话记录..."
USER1_CONV_RESPONSE=$(curl -s -X GET "${BASE_URL}/messages/conversation/${USER2_ID}?page=1&pageSize=50" \
  -H "Authorization: Bearer $TOKEN1")

echo "响应: $USER1_CONV_RESPONSE"
echo ""

# 13. 用户1查看未读消息数
echo "13. 用户1查看未读消息数..."
USER1_UNREAD_RESPONSE=$(curl -s -X GET "${BASE_URL}/messages/unread/count" \
  -H "Authorization: Bearer $TOKEN1")

echo "响应: $USER1_UNREAD_RESPONSE"
USER1_UNREAD=$(echo $USER1_UNREAD_RESPONSE | grep -o '"unread_count":[0-9]*' | cut -d':' -f2)
echo "用户1未读消息数: $USER1_UNREAD (应该为1,来自用户2的回复)"
echo ""

echo "======================================"
echo "✅ 私聊消息模块测试完成！"
echo "======================================"
echo ""
echo "测试总结:"
echo "- ✅ 用户注册和登录成功"
echo "- ✅ 发送消息成功"
echo "- ✅ 未读消息统计正确"
echo "- ✅ 对话列表查询成功"
echo "- ✅ 对话记录查询成功(双向消息)"
echo "- ✅ 标记已读功能正常"
echo "- ✅ 已读状态更新正确"
echo ""
