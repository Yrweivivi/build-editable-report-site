# 输入契约

## 必须输入

1. 唯一的确认版 Markdown 报告。
2. HTML 网站输出目录。
3. 报告标题、日期或版本标识。

## 条件输入

- 需要图表时：Excel、CSV、TSV、JSON 或分析流程生成的 `metrics.json`。
- 需要下载时：Excel、Markdown、PDF 或其他明确允许公开的附件。
- 需要网页端发布时：GitHub owner、repo、branch 和允许发布的 GitHub login。
- 需要部署时：已有 Sites `project_id`，或创建新站点的授权。

## 输入优先级

1. 用户最新确认。
2. 确认版 Markdown。
3. 结构化数据和底表。
4. 已部署网页中的最新叙事内容。
5. 模型判断。

Markdown 与结构化数据冲突时停止相关模块，不自行选一个数字。

## 公开性检查

部署前列出全部下载附件。公开站点的 `public/downloads/` 文件以及公开 GitHub 仓库中的文件均视为公开。存在敏感或权限不明文件时必须暂停公开部署并请求确认。
