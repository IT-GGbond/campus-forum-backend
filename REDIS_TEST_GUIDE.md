# Redis 扩展功能 - 快速测试指南

## 1. 测试 Redis 连接

```bash
# 测试Redis服务是否正常
curl http://localhost:3000/api/test/redis
```

预期输出：

```json
{
  "success": true,
  "message": "Redis连接正常",
  "data": {
    "test_value": "OK",
    "db_size": 0,
    "redis_version": "Connected"
  }
}
```

## 2. 测试帖子浏览量统计

```bash
# 多次访问同一帖子，观察浏览量变化
curl http://localhost:3000/api/posts/1
curl http://localhost:3000/api/posts/1
curl http://localhost:3000/api/posts/1

# 在Redis中查看浏览量
redis-cli GET post:views:1
```

## 3. 测试热门帖子排行榜

```bash
# 获取TOP10热门帖子
curl http://localhost:3000/api/ranking/hot-posts

# 获取排行榜统计信息
curl http://localhost:3000/api/ranking/stats

# 刷新排行榜（从MySQL重新加载）
curl -X POST http://localhost:3000/api/ranking/refresh
```

## 4. 测试未读消息统计

```bash
# 需要先登录获取token
TOKEN="your_jwt_token_here"

# 发送消息（未读数+1）
curl -X POST http://localhost:3000/api/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiver_id": 2, "content": "测试消息"}'

# 获取未读消息数
curl http://localhost:3000/api/messages/unread-count \
  -H "Authorization: Bearer $TOKEN"

# 在Redis中查看未读数
redis-cli HGET user:unread:2 messages
```

## 5. 查看 Redis 中的所有数据

```bash
# 进入Redis CLI
redis-cli

# 查看所有Key
KEYS *

# 查看Key数量
DBSIZE

# 查看帖子浏览量
GET post:views:1

# 查看排行榜（带分数）
ZREVRANGE ranking:hot:weekly 0 9 WITHSCORES

# 查看用户未读消息
HGETALL user:unread:1
```

## 6. 性能对比测试

### 方法 1：使用 curl 循环测试

```bash
# 测试100次请求的耗时
time for i in {1..100}; do
  curl -s http://localhost:3000/api/posts/1 > /dev/null
done
```

### 方法 2：使用 Apache Bench

```bash
# 安装ab工具
sudo apt-get install apache2-utils

# 并发测试：10个并发用户，共100次请求
ab -n 100 -c 10 http://localhost:3000/api/posts/1

# 查看结果中的：
# - Requests per second（每秒请求数）
# - Time per request（平均响应时间）
```

## 7. 常见问题排查

### Redis 中没有数据（KEYS \* 返回空）

**原因：** Redis 写入可能失败，或者数据还没有初始化

**解决方案：**

```bash
# 方法1：访问帖子详情来触发数据写入
curl http://localhost:3000/api/posts/1
curl http://localhost:3000/api/posts/2
curl http://localhost:3000/api/posts/3

# 然后检查Redis
redis-cli
KEYS *
# 应该看到：post:views:1, post:views:2 等

# 方法2：手动刷新排行榜
curl -X POST http://localhost:3000/api/ranking/refresh

# 方法3：重启服务并启用初始化
# 修改 .env 文件：
# INIT_REDIS=true

# 然后重启服务
node app.js
```

### Redis 连接失败

```bash
# 检查Redis服务状态
sudo systemctl status redis-server

# 检查Redis端口
netstat -tuln | grep 6379

# 测试Redis连接
redis-cli ping
# 应该返回：PONG
```

### 浏览量不增加

```bash
# 查看Redis日志
tail -f /var/log/redis/redis-server.log

# 检查Node.js日志
# 查看是否有Redis错误信息
```

### 数据不同步

```bash
# 手动执行同步
# 在Node.js代码中调用：
const { syncViewCounts } = require('./src/tasks/syncRedisToMySQL');
await syncViewCounts();
```

## 8. 清理 Redis 数据

```bash
# 谨慎操作！会清空所有Redis数据
redis-cli FLUSHDB

# 删除特定Key
redis-cli DEL post:views:1
redis-cli DEL ranking:hot:weekly
```

## 9. 监控 Redis 性能

```bash
# 实时监控Redis命令
redis-cli MONITOR

# 查看Redis统计信息
redis-cli INFO stats

# 查看慢查询日志
redis-cli SLOWLOG GET 10
```

## 10. 环境变量配置

确保 `.env` 文件包含以下配置：

```bash
# Redis配置
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# 可选功能
INIT_REDIS=false        # 首次启动设为true
ENABLE_SYNC=false       # 生产环境设为true
```
