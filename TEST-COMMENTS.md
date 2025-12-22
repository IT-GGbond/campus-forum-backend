# 评论模块测试说明

## 测试前准备

1. 确保后端服务已启动:

```bash
ssh dbadmin@192.168.190.247
cd /home/dbadmin/campus-forum-backend
node app.js
```

2. 上传测试脚本到服务器:

```bash
scp test-comments.sh dbadmin@192.168.190.247:/home/dbadmin/campus-forum-backend/
```

## 运行测试

```bash
ssh dbadmin@192.168.190.247
cd /home/dbadmin/campus-forum-backend
bash test-comments.sh
```

## 测试内容

1. ✅ 注册测试用户(testuser1)
2. ✅ 用户登录获取 token
3. ✅ 创建测试帖子
4. ✅ 创建 2 条顶级评论
5. ✅ 回复第 1 条评论(测试 parent_id 自引用)
6. ✅ 获取帖子评论列表(验证层级结构)
7. ✅ 检查帖子 comment_count 是否从 0 更新到 3
8. ✅ 获取当前用户的评论列表
9. ✅ 删除第 1 条评论(测试级联删除回复)
10. ✅ 再次获取评论列表(验证回复也被删除)
11. ✅ 检查 comment_count 是否从 3 更新到 1

## 预期结果

- 用户注册成功(如果用户已存在会返回错误,可忽略)
- 登录成功获取 token
- 创建测试帖子成功
- 所有评论请求返回成功状态
- 评论创建后帖子的 comment_count 增加
- 回复评论显示正确的 parent_id
- 删除评论时级联删除所有回复
- comment_count 事务更新正确

## 注意事项

- 脚本会自动注册 testuser1 用户,如果已存在会提示错误但不影响后续测试
- 脚本会创建新的测试帖子,确保 category_id=1 的分类存在
- 删除评论后 comment_count 应该正确减少(删除 1 条评论+1 条回复,共减 2)
