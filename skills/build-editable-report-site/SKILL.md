---
name: build-editable-report-site
description: 将已经确认的 Markdown 分析报告及其 Excel、CSV、JSON、图片等附件，转换为结论先行、图表可视化、叙事文字可原位编辑且数据层锁定的 HTML/React 报告站点，并完成本地验证、GitHub 版本管理、网页内容发布和 Sites 打包部署。适用于把既有 Markdown 或分析文件生成 HTML 报告、沿用扁平洞察样式发布新报告、更新并重新部署已有报告，或搭建可编辑报告网页；不负责重新采集数据、重新执行业务分析或修改未经用户确认的事实结论。
---

# 可编辑 HTML 报告发布

将确认后的 Markdown 和结构化数据转换为可发布报告。保持 Excel、Markdown、数据 JSON 为事实存档；网页只承担展示和叙事文字微调。

## 稳定边界

- 只使用 `assets/editorial-flat-site/` 的结论先行扁平样式。不要搜索其他模板，不要复刻第三方网站。
- 保持 Markdown 的信息密度。允许为网页阅读调整标题和层级，不得删减重要数字、解释、限制或来源。
- 将叙事文字写入 `content/report.json`，将图表数值、表格、SKU 明细和下载清单写入 `data/report-data.json`。
- 网页编辑只能更新 `content/report.json`；不得让页面修改数据文件、Markdown 或 Excel。
- 没有结构化数据时可以生成文字报告，但不得猜测图表数值。
- 数据与 Markdown 冲突、关键来源不明确或输入审计失败时停止受影响模块，并报告恢复条件。

## 执行流程

1. 读取 `references/input-contract.md`，确认唯一 Markdown 正文、数据文件、附件、输出目录和发布目标。
2. 审计输入：

```bash
python3 scripts/audit_inputs.py \
  --markdown REPORT.md \
  --data METRICS.json \
  --attachment ANALYSIS.xlsx \
  --output audit.json
```

3. 只有审计状态为 `pass` 才初始化新网站：

```bash
python3 scripts/init_report_site.py \
  --output SITE_DIR \
  --markdown REPORT.md \
  --attachment ANALYSIS.xlsx
```

如已明确 GitHub 仓库，再追加 `--github-owner`、`--github-repo`、`--allowed-github-login`。不要把 Token 传给脚本。

4. 读取 `references/content-model.md`，从 Markdown 提取结论、解释、章节说明、方法和限制；从结构化数据生成图表、指标、表格和下载项。
5. 读取 `references/report-presentation.md`，按“结论—解释—证据—下钻—来源”组织页面。每条重要结论都要展示对应数据表或在附录中提供完整表。
6. 修改 `app/layout.tsx` 的网页 metadata；修改 `content/report.json` 和 `data/report-data.json`。不要把报告数据硬编码进 `app/page.tsx`。
7. 配置网页发布时读取 `references/github-publishing.md`。Token 必须由用户在页面中每次粘贴，只存在当前页面内存。
8. 执行严格校验和构建：

```bash
node scripts/verify_report_project.mjs SITE_DIR --strict
npm run lint
npm run build
```

9. 按 `references/deployment-qa.md` 在浏览器完成主流程、刷新、响应式和编辑边界验证。
10. 用户已经授权 GitHub 同步时，按 GitHub 发布工作流提交源代码。公开部署前必须确认公开范围和下载文件可见性。
11. 项目含 `.openai/hosting.json` 时使用 Sites 构建与托管流程：推送准确源代码、打包、保存版本、部署、轮询到终态，并打开成功的线上地址。

## 更新已有报告

- 优先使用已有项目和样式，不重新初始化。
- 先拉取远端最新分支并检查用户未提交修改。
- 重新从最新 Markdown 和数据生成内容；保留用户已经在网页发布到 `content/report.json` 的文字修改，除非用户明确要求用 Markdown 覆盖。
- 数据更新只修改 `data/report-data.json` 和附件；叙事更新只修改 `content/report.json`。
- 重新执行严格校验、构建、浏览器验证和部署。

## 完成标准

- 输入审计通过，或已明确列出暂停模块。
- 页面信息密度不低于确认后的 Markdown。
- 重要结论都有解释、数据证据和来源。
- 叙事文字可原位编辑；图表、指标、表格、SKU 和下载路径不可编辑。
- 页面发布只写 `content/report.json`，Token 不持久化。
- 严格校验、lint、build 和浏览器主流程通过。
- GitHub 源代码与部署版本对应；线上状态成功。
- 报告未验证项、公开下载风险和未执行的真实 Token 发布测试已如实披露。
