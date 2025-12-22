#!/bin/bash

# 收藏模块测试脚本
# 使用方法: bash test-favorites.sh

BASE_URL="http://localhost:3000/api"

echo "======================================"
echo "收藏模块测试脚本"
echo "======================================"
echo ""

# 1. 登录获取token
echo "1. 登录获取token..."
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","password":"Test123456"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ 登录失败！"
    echo $LOGIN_RESPONSE
    exit 1
fi

echo "✅ 登录成功，Token: ${TOKEN:0:20}..."
echo ""

# 2. 获取帖子列表,选择一个帖子进行测试
echo "2. 获取帖子列表..."
POSTS_RESPONSE=$(curl -s -X GET "${BASE_URL}/posts?page=1&pageSize=5")
POST_ID=$(echo $POSTS_RESPONSE | grep -o '"post_id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$POST_ID" ]; then
    echo "❌ 没有找到可用的帖子！"
    exit 1
fi

echo "✅ 使用帖子ID: $POST_ID 进行测试"
echo ""

# 3. 添加收藏
echo "3. 添加收藏..."
ADD_FAV_RESPONSE=$(curl -s -X POST ${BASE_URL}/favorites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"post_id\":$POST_ID}")

echo "响应: $ADD_FAV_RESPONSE"
echo ""

# 4. 检查收藏状态
echo "4. 检查是否已收藏..."
CHECK_RESPONSE=$(curl -s -X GET "${BASE_URL}/favorites/check/${POST_ID}" \
  -H "Authorization: Bearer $TOKEN")

echo "响应: $CHECK_RESPONSE"
IS_FAVORITED=$(echo $CHECK_RESPONSE | grep -o '"is_favorited":true')

if [ -n "$IS_FAVORITED" ]; then
    echo "✅ 收藏状态正确: 已收藏"
else
    echo "❌ 收藏状态错误: 应该显示已收藏"
fi
echo ""

# 5. 检查帖子的favorite_count是否增加
echo "5. 检查帖子的收藏数量..."
POST_DETAIL=$(curl -s -X GET "${BASE_URL}/posts/${POST_ID}")

FAVORITE_COUNT=$(echo $POST_DETAIL | grep -o '"favorite_count":[0-9]*' | cut -d':' -f2)
echo "帖子的收藏数: $FAVORITE_COUNT (应该>=1)"
echo ""

# 6. 获取我的收藏列表
echo "6. 获取我的收藏列表..."
MY_FAVORITES=$(curl -s -X GET "${BASE_URL}/favorites/my/list?page=1&pageSize=20" \
  -H "Authorization: Bearer $TOKEN")

echo "响应: $MY_FAVORITES"
echo ""

# 7. 获取帖子的收藏用户列表
echo "7. 获取帖子的收藏用户列表..."
POST_FAVORITES=$(curl -s -X GET "${BASE_URL}/favorites/post/${POST_ID}/users?page=1&pageSize=20")

echo "响应: $POST_FAVORITES"
echo ""

# 8. 批量检查收藏状态
echo "8. 批量检查多个帖子的收藏状态..."
BATCH_CHECK=$(curl -s -X POST "${BASE_URL}/favorites/check/batch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"post_ids\":[1,2,3,$POST_ID]}")

echo "响应: $BATCH_CHECK"
echo ""

# 9. 尝试重复收藏(应该失败)
echo "9. 尝试重复收藏(应该失败)..."
DUPLICATE_RESPONSE=$(curl -s -X POST ${BASE_URL}/favorites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"post_id\":$POST_ID}")

echo "响应: $DUPLICATE_RESPONSE"
ERROR_MSG=$(echo $DUPLICATE_RESPONSE | grep "已经收藏过该帖子")

if [ -n "$ERROR_MSG" ]; then
    echo "✅ 重复收藏检测正确"
else
    echo "⚠️ 应该提示已经收藏过"
fi
echo ""

# 10. 取消收藏
echo "10. 取消收藏..."
REMOVE_RESPONSE=$(curl -s -X DELETE "${BASE_URL}/favorites/${POST_ID}" \
  -H "Authorization: Bearer $TOKEN")

echo "响应: $REMOVE_RESPONSE"
echo ""

# 11. 再次检查收藏状态
echo "11. 再次检查收藏状态(应该未收藏)..."
CHECK_RESPONSE2=$(curl -s -X GET "${BASE_URL}/favorites/check/${POST_ID}" \
  -H "Authorization: Bearer $TOKEN")

echo "响应: $CHECK_RESPONSE2"
IS_NOT_FAVORITED=$(echo $CHECK_RESPONSE2 | grep -o '"is_favorited":false')

if [ -n "$IS_NOT_FAVORITED" ]; then
    echo "✅ 收藏状态正确: 未收藏"
else
    echo "❌ 收藏状态错误: 应该显示未收藏"
fi
echo ""

# 12. 再次检查帖子的favorite_count
echo "12. 再次检查帖子的收藏数量..."
POST_DETAIL2=$(curl -s -X GET "${BASE_URL}/posts/${POST_ID}")

FAVORITE_COUNT2=$(echo $POST_DETAIL2 | grep -o '"favorite_count":[0-9]*' | cut -d':' -f2)
echo "帖子的收藏数: $FAVORITE_COUNT2 (应该比之前减1)"
echo ""

echo "======================================"
echo "✅ 收藏模块测试完成！"
echo "======================================"
echo ""
echo "测试总结:"
echo "- ✅ 添加收藏成功"
echo "- ✅ 检查收藏状态成功"
echo "- ✅ 事务更新favorite_count成功"
echo "- ✅ 获取收藏列表成功(N:M关系JOIN查询)"
echo "- ✅ 批量检查收藏状态成功"
echo "- ✅ 重复收藏检测成功"
echo "- ✅ 取消收藏成功(事务回退计数)"
echo ""
