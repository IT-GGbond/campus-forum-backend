# Redis 扩展完成 - 下一步操作指南

## ✅ 已完成的工作

### 新增文件（4 个）

1. ✅ `src/config/redis.js` - Redis 客户端配置
2. ✅ `src/routes/ranking.js` - 排行榜路由
3. ✅ `src/tasks/syncRedisToMySQL.js` - 定时同步任务
4. ✅ `.env.example` - 环境变量示例

### 修改文件（3 个）

1. ✅ `src/controllers/postController.js` - 帖子控制器（增加 Redis 浏览量统计）
2. ✅ `src/controllers/messageController.js` - 消息控制器（增加 Redis 未读计数）
3. ✅ `app.js` - 主应用文件（集成 Redis 路由和测试接口）

### 新增功能

1. ✅ 帖子浏览量实时统计（Redis INCR）
2. ✅ 热门帖子 TOP10 排行榜（Redis Sorted Set）
3. ✅ 用户未读消息计数（Redis Hash）
4. ✅ 定时同步任务（Redis → MySQL）
5. ✅ Redis 连接测试接口

---

## 🚀 接下来你需要做的事情

### 第 1 步：配置环境变量（在 Linux 虚拟机上）

```bash
# 1. 进入项目目录
cd ~/project/database/RDBMS/back-end

# 2. 复制环境变量示例文件
cp .env.example .env

# 3. 编辑.env文件
nano .env
```

修改以下配置：

```bash
# MySQL配置（改成你的实际配置）
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=campus_forum

# Redis配置（检查是否正确）
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=           # 如果没设置密码，留空

# JWT配置
JWT_SECRET=你的密钥
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3000
NODE_ENV=development

# Redis功能配置（首次启动）
INIT_REDIS=true           # 首次启动设为true，初始化Redis数据
ENABLE_SYNC=true          # 启用定时同步任务
```

### 第 2 步：验证 Redis 服务

```bash
# 测试Redis是否运行
redis-cli ping
# 应该返回：PONG

# 查看Redis版本
redis-server --version

# 查看Redis状态
sudo systemctl status redis-server
```

### 第 3 步：启动后端服务

```bash
# 确保在back-end目录
cd ~/project/database/RDBMS/back-end

# 启动服务
node app.js
```

**预期看到以下输出：**

```
✅ 数据库连接成功！
   主机: 127.0.0.1
   数据库: campus_forum
✅ Redis连接成功！
   地址: 127.0.0.1:6379
🚀 Redis客户端已就绪！
🔄 [初始化] 从MySQL同步数据到Redis...
✅ [初始化] 帖子浏览量同步完成（XXX 条）
✅ [初始化] 未读消息同步完成（XXX 个用户）
📅 [定时任务] 启动定时任务...
   ⏰ 浏览量同步任务: 每5分钟执行一次
   ⏰ 排行榜重置任务: 每周一凌晨0点执行

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 校园论坛后端服务启动成功！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   环境: development
   端口: 3000
   本地访问: http://localhost:3000
   网络访问: http://192.168.190.247:3000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 可用接口:
   ...
   ⭐ 排行榜接口（新增Redis功能）:
     GET  /api/ranking/hot-posts      - 热门帖子TOP10
     GET  /api/ranking/stats          - 排行榜统计
     POST /api/ranking/refresh        - 刷新排行榜
```

### 第 4 步：测试 Redis 功能

打开新的终端窗口，执行测试：

```bash
# 测试1：Redis连接
curl http://localhost:3000/api/test/redis

# 测试2：访问帖子（触发浏览量+1）
curl http://localhost:3000/api/posts/1
curl http://localhost:3000/api/posts/1
curl http://localhost:3000/api/posts/1

# 测试3：查看Redis中的浏览量
redis-cli GET post:views:1
# 应该显示：3（或更大）

# 测试4：查看排行榜
curl http://localhost:3000/api/ranking/hot-posts

# 测试5：查看排行榜统计
curl http://localhost:3000/api/ranking/stats
```

### 第 5 步：查看 Redis 数据

```bash
# 进入Redis CLI
redis-cli

# 查看所有Key
KEYS *

# 应该看到类似：
# 1) "post:views:1"
# 2) "post:views:2"
# 3) "ranking:hot:weekly"
# 4) "user:unread:1"
# ...

# 查看帖子浏览量
GET post:views:1

# 查看排行榜（TOP10，带分数）
ZREVRANGE ranking:hot:weekly 0 9 WITHSCORES

# 查看用户未读消息
HGETALL user:unread:1

# 退出Redis
exit
```

---

## 📊 功能验证清单

### ✅ 基础功能

- [ ] Redis 服务正常运行
- [ ] Node.js 成功连接 Redis
- [ ] `/api/test/redis` 接口返回成功

### ✅ 帖子浏览量功能

- [ ] 访问帖子详情时浏览量增加
- [ ] Redis 中的 `post:views:{id}` 正确递增
- [ ] 前端显示的浏览量来自 Redis
- [ ] 定时任务同步到 MySQL（等待 5 分钟）

### ✅ 排行榜功能

- [ ] `/api/ranking/hot-posts` 返回 TOP10 帖子
- [ ] 帖子按浏览量（或热度）排序
- [ ] Redis 中的 `ranking:hot:weekly` 包含所有帖子
- [ ] 手动刷新排行榜功能正常

### ✅ 未读消息功能

- [ ] 发送消息后接收者未读数+1
- [ ] `/api/messages/unread-count` 返回正确数量
- [ ] 标记已读后未读数-1
- [ ] Redis 中的 `user:unread:{id}` 正确更新

---

## 🔧 常见问题解决

### 问题 1：Redis 连接失败

**错误信息：**

```
❌ Redis连接错误: connect ECONNREFUSED 127.0.0.1:6379
```

**解决方案：**

```bash
# 1. 检查Redis是否运行
sudo systemctl status redis-server

# 2. 如果未运行，启动它
sudo systemctl start redis-server

# 3. 设置开机自启
sudo systemctl enable redis-server
```

### 问题 2：INIT_REDIS 初始化失败

**错误信息：**

```
❌ [初始化] 同步失败: ...
```

**解决方案：**

```bash
# 1. 检查MySQL数据是否存在
mysql -u root -p
USE campus_forum;
SELECT COUNT(*) FROM posts;

# 2. 如果数据为空，先运行数据生成脚本
# 3. 然后重启Node.js服务
```

### 问题 3：定时任务不执行

**现象：** 5 分钟后 MySQL 中的浏览量没有更新

**解决方案：**

```bash
# 1. 检查.env中是否启用了定时任务
ENABLE_SYNC=true

# 2. 查看Node.js控制台是否有定时任务日志
# 应该每5分钟看到：
# 🔄 [定时任务] 开始同步Redis浏览量到MySQL...
# ✅ [定时任务] 同步完成！
```

### 问题 4：排行榜为空

**现象：** `/api/ranking/hot-posts` 返回空数组

**解决方案：**

```bash
# 1. 手动刷新排行榜
curl -X POST http://localhost:3000/api/ranking/refresh

# 2. 或者在Redis CLI中检查
redis-cli ZCARD ranking:hot:weekly

# 3. 如果为0，说明没有帖子数据
# 需要先访问几个帖子来触发排行榜数据生成
```

---

## 📈 性能测试（可选）

### 简单压力测试

```bash
# 安装Apache Bench
sudo apt-get install apache2-utils

# 并发测试：10个并发，共1000次请求
ab -n 1000 -c 10 http://localhost:3000/api/posts/1

# 查看结果：
# - Requests per second（每秒处理请求数）
# - Time per request（平均响应时间）
```

### 对比测试

```bash
# 1. 记录使用Redis前的性能数据
# 2. 注释掉postController中的Redis代码
# 3. 重启服务
# 4. 再次运行ab测试
# 5. 对比两次测试结果
```

---

## 📝 下一步工作

### 1. 前端集成（可选）

如果需要在前端显示热门排行榜：

```javascript
// 在前端调用排行榜API
async function fetchHotPosts() {
  const response = await fetch(
    "http://localhost:3000/api/ranking/hot-posts?limit=10"
  );
  const data = await response.json();
  console.log("热门帖子:", data.data);
}
```

### 2. 编写课程报告

参考文档：`doc/redis-extension-plan.md` 第 6 节

需要包含：

- Redis 选型说明
- 使用场景描述
- 数据结构设计
- 代码实现截图
- 性能测试数据
- 部署架构图

### 3. 准备演示

准备以下演示内容：

- [ ] 演示 Redis 连接测试
- [ ] 演示帖子浏览量实时增长
- [ ] 演示热门排行榜
- [ ] 演示未读消息统计
- [ ] 展示 Redis CLI 中的数据
- [ ] 展示性能对比数据

---

## 📚 参考文档

1. **完整实施方案：** `doc/redis-extension-plan.md`
2. **测试指南：** `REDIS_TEST_GUIDE.md`
3. **Redis 命令参考：** https://redis.io/commands

---

## 🎉 总结

你现在已经完成了：

- ✅ 3 个核心 Redis 扩展功能
- ✅ 4 种 Redis 数据结构的使用
- ✅ 混合数据库架构（MySQL + Redis）
- ✅ 定时同步任务
- ✅ 完整的测试用例

**立即开始测试吧！** 🚀

有任何问题随时问我！
