# GitHub 内容发布

## 初始代码同步

- 使用本机已认证的 GitHub CLI 或可用 GitHub 连接。
- 检查分支、工作区和 diff，只提交本任务文件。
- 使用分支和 PR 工作流；需要正式部署且已获授权时合并到默认分支。

## 网页端发布

网页端只允许 PUT `content/report.json`：

1. 用户每次粘贴细粒度 GitHub Token。
2. 调用 `/user` 验证 Token 所属 login。
3. login 必须等于 `runtime-config.json` 中的 `allowedGithubLogin`。
4. 读取远端内容 SHA。
5. 带 SHA 更新内容，遇到版本冲突必须停止并提示刷新。
6. 发布后清空 Token。

Token 只保存在 React 状态中；不得写入 localStorage、sessionStorage、cookie、日志、Git、内容 JSON 或部署环境。

## 仓库权限

推荐 Fine-grained personal access token：只选择目标仓库，只授予 Contents 读写。Token 创建和粘贴由用户完成。
