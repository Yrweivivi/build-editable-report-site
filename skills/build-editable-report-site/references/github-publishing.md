# GitHub 内容发布

## 模式选择

需要 GitHub 同步或 Sites 部署时，先确认仓库可见性。用户未说明时只询问：

> GitHub 仓库希望设为哪种可见性？Public 表示仓库和网站都公开；Private 表示隐藏仓库代码，但网站仍公开。

用户已经说明时不得重复询问。不要要求用户选择直接同步或后端同步，由仓库可见性自动决定：

- **Public 仓库**：浏览器直接读取公开 GitHub 内容，不配置服务器端读取 Secret。
- **Private 仓库**：浏览器只请求同源 `/api/report-content`；Sites 后端使用 `GITHUB_CONTENT_READ_TOKEN` 读取私有仓库的 `content/report.json`。

Private 模式的读取 Token 必须使用只授予目标仓库 Contents 只读权限的 Fine-grained token，并保存为 Sites Secret 或系统凭证；不得进入前端代码、Git、日志、Markdown、JSON 或 `.env` 文件。后端只返回报告内容文件，不提供仓库目录或其他源代码。

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

Private 仓库允许网页端继续直接调用 GitHub Contents API 写入，此时浏览器可能包含仓库 owner 和 repo 名称，但未授权访客仍不能读取 Private 仓库代码。只有用户明确要求隐藏仓库身份时，才增加同源发布代理；不要默认增加永久服务器端写入 Token。

## 仓库权限

- 网页发布：Fine-grained personal access token，只选择目标仓库，只授予 Contents 读写；由用户创建并在每次发布时粘贴。
- Private 仓库后端读取：独立 Fine-grained personal access token，只授予目标仓库 Contents 只读；由用户保存到系统凭证后写入 Sites Secret。
