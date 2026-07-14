# Build Editable Report Site Skill

一个面向 Codex 的中文 Skill，用于把已经确认的 Markdown 分析报告、结构化数据和附件，生成可编辑、可追溯、可部署的 HTML/React 报告网站。

它适合市场研究、品类分析、产品策略、竞品分析等需要“结论先行 + 数据证据 + 下钻明细”的报告场景。

## 核心能力

- 将确认版 Markdown 转换为结论先行的 HTML 报告。
- 从 Excel、CSV、TSV 或 JSON 生成图表、指标和明细表。
- 保持 Markdown 的重要结论、解释、限制和信息密度。
- 支持在网页中直接编辑标题、结论和解释文字。
- 锁定图表数值、比例、SKU、价格、排名和数据表。
- 网页端只向 GitHub 更新叙事内容文件，不反向修改 Markdown 或 Excel。
- 支持 GitHub 版本管理和 Sites 打包部署。
- 内置输入审计、项目初始化和严格校验脚本。

## V1 设计范围

当前版本只内置经过验证的 `editorial-flat` 扁平洞察样式：

- 首页直接展示核心结论。
- 正文遵循“结论 → 解释 → 图表或证据 → 下钻 → 来源”。
- 避免传统 BI Dashboard 式的多层卡片堆叠。
- 不包含开源模板搜索、模板自动匹配或第三方网站复刻；这些能力留给后续版本。

## 仓库结构

```text
.
├── README.md
└── skills/
    └── build-editable-report-site/
        ├── SKILL.md
        ├── agents/openai.yaml
        ├── scripts/
        ├── references/
        └── assets/editorial-flat-site/
```

`README.md` 用于人阅读；Skill 运行目录中只保留 Codex 执行所需的指令、脚本、参考资料和网站资产。

## 安装

克隆仓库：

```bash
git clone https://github.com/Yrweivivi/build-editable-report-site.git
```

复制 Skill 到全局 Codex Skill 目录：

```bash
mkdir -p ~/.codex/skills
cp -R build-editable-report-site/skills/build-editable-report-site ~/.codex/skills/
```

重新打开 Codex 任务后即可使用。

## 使用方式

在 Codex 中直接调用：

```text
使用 $build-editable-report-site，
把这份已经确认的 Markdown 和 Excel 生成可编辑 HTML 报告，
完成本地验证，并同步到 GitHub 和 Sites。
```

建议同时提供：

- 唯一的确认版 Markdown 报告路径。
- Excel、CSV、TSV、JSON 或 `metrics.json` 路径。
- 需要随报告下载的附件。
- HTML 输出目录。
- 已有 GitHub 仓库，或创建新仓库的授权。
- 公开或受限部署要求。

## 标准工作流

```text
确认版 Markdown + 结构化数据 + 附件
                  ↓
              输入审计
                  ↓
     content/report.json（可编辑叙事）
     data/report-data.json（锁定数据）
                  ↓
        editorial-flat HTML 报告
                  ↓
       校验 → 构建 → 浏览器验证
                  ↓
          GitHub → Sites 部署
```

## 内容与数据分离

生成的网站将报告拆成三个层次：

- `content/report.json`：标题、结论、解释、章节说明、图表解读、机会和限制。
- `data/report-data.json`：图表数值、分子分母、SKU、价格、排名、表格和下载清单。
- `public/runtime-config.json`：GitHub 仓库、分支、内容路径和允许发布的账号。

网页编辑只允许更新 `content/report.json`。

## GitHub 发布安全

- 使用 Fine-grained personal access token。
- Token 只授权目标仓库的 Contents 读写权限。
- 用户每次在网页发布时手动粘贴 Token。
- Token 只保存在当前页面内存中，发布后清空。
- Token 不写入 localStorage、Cookie、Git、报告文件或部署环境。
- 发布前验证 Token 所属 GitHub 账号。

## 前置条件

- Python 3。
- Node.js 22.13 或更高版本。
- npm。
- 需要 GitHub 同步时安装并登录 GitHub CLI。
- 需要 Sites 部署时，当前 Codex 环境应提供 Sites 构建和托管能力。

## 手动运行输入审计

```bash
python3 skills/build-editable-report-site/scripts/audit_inputs.py \
  --markdown REPORT.md \
  --data METRICS.json \
  --attachment ANALYSIS.xlsx \
  --output audit.json
```

## 手动初始化报告网站

```bash
python3 skills/build-editable-report-site/scripts/init_report_site.py \
  --output SITE_DIR \
  --markdown REPORT.md \
  --attachment ANALYSIS.xlsx
```

如果已经明确 GitHub 仓库，可以追加：

```bash
--github-owner OWNER \
--github-repo REPO \
--allowed-github-login LOGIN
```

不要把 GitHub Token 传入初始化脚本。

## 校验

Skill 结构校验：

```bash
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  skills/build-editable-report-site
```

报告项目严格校验：

```bash
node skills/build-editable-report-site/scripts/verify_report_project.mjs \
  SITE_DIR --strict
```

正式报告还应执行：

```bash
npm run lint
npm run build
```

## 中止条件

出现以下情况时，Skill 不应生成或部署一个看似完整但不可验证的报告：

- Markdown 版本不明确。
- 关键图表没有结构化数据来源。
- Markdown 与数据文件中的关键数字冲突。
- 重要附件缺失。
- 下载文件包含敏感内容但准备公开部署。
- 构建或浏览器验证失败。
- GitHub 或 Sites 认证无效。

## 当前限制

- HTML 修改不会反向更新 Markdown 和 Excel。
- 没有结构化数据时不会自行猜测图表数值。
- V1 只支持当前内置设计样式。
- 生产部署和真实 GitHub Token 写入需要在具体报告任务中单独授权和验证。
