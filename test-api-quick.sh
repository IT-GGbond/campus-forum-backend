#!/bin/bash

# 快速接口测试脚本

BASE_URL="http://192.168.190.247:3000/api"

echo "======================================"
echo "快速接口修复验证"
echo "======================================"
echo ""

# 测试1：帖子列表
echo "【测试1】帖子列表接口"
curl -s "$BASE_URL/posts?page=1&pageSize=5" | jq '{success, message, posts_count: (.data.posts | length), first_post: .data.posts[0].title}'
echo ""
echo "--------------------------------------"
echo ""

# 测试2：帖子详情
echo "【测试2】帖子详情接口（ID=1）"
curl -s "$BASE_URL/posts/1" | jq '{success, message, post_id: .data.post_id, title: .data.title, view_count: .data.view_count}'
echo ""
echo "--------------------------------------"
echo ""

# 测试3：热门排行榜
echo "【测试3】热门排行榜接口"
curl -s "$BASE_URL/ranking/hot-posts?limit=5" | jq '{success, message, count: (.data | length), top3: .data[0:3] | map({post_id, title, hot_score})}'
echo ""
echo "--------------------------------------"
echo ""

# 测试4：评论列表（帖子ID=1）
echo "【测试4】评论列表接口（帖子ID=1）"
curl -s "$BASE_URL/comments/post/1?page=1&pageSize=10" | jq '{success, message, total: .data.total}'
echo ""
echo "--------------------------------------"
echo ""

# 测试5：Redis状态
echo "【测试5】Redis连接状态"
curl -s "$BASE_URL/test/redis" | jq '{success, is_connected: .data.is_connected, db_size: .data.db_size}'
echo ""
echo "--------------------------------------"
echo ""

echo "======================================"
echo "✅ 测试完成"
echo "======================================"
