#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] ?? ".");
const strict = process.argv.includes("--strict");
const errors = [];
const required = [
  "app/page.tsx",
  "app/layout.tsx",
  "content/report.json",
  "data/report-data.json",
  "public/runtime-config.json",
  "package.json",
];

for (const file of required) {
  try { await access(path.join(root, file)); } catch { errors.push(`缺少文件：${file}`); }
}

const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
let content;
let data;
let runtime;
try { content = await readJson("content/report.json"); } catch (error) { errors.push(`content/report.json 无法解析：${error.message}`); }
try { data = await readJson("data/report-data.json"); } catch (error) { errors.push(`data/report-data.json 无法解析：${error.message}`); }
try { runtime = await readJson("public/runtime-config.json"); } catch (error) { errors.push(`runtime-config.json 无法解析：${error.message}`); }

if (content && data) {
  if (!Array.isArray(content.findings) || !content.findings.length) errors.push("至少需要一条核心结论。");
  if (!Array.isArray(content.sections) || !content.sections.length) errors.push("至少需要一个正文板块。");
  const sectionIds = new Set(content.sections?.map((section) => section.id));
  for (const [index, finding] of (content.findings ?? []).entries()) {
    if (!sectionIds.has(finding.target)) errors.push(`结论 ${index + 1} 的 target 不存在：${finding.target}`);
    if (!finding.sources?.length) errors.push(`结论 ${index + 1} 缺少来源。`);
  }
  for (const section of content.sections ?? []) {
    for (const block of section.blocks ?? []) {
      if (block.type === "chart-group") for (const id of block.dataIds ?? []) if (!data.charts?.[id]) errors.push(`图表数据不存在：${id}`);
      if (block.type === "metrics" && !data.metrics?.[block.dataId]) errors.push(`指标数据不存在：${block.dataId}`);
      if (block.type === "table" && !data.tables?.[block.dataId]) errors.push(`表格数据不存在：${block.dataId}`);
    }
  }
  for (const item of data.downloads ?? []) {
    if (!item.href?.startsWith("/downloads/")) errors.push(`下载路径必须位于 /downloads/：${item.href}`);
    else try { await access(path.join(root, "public", item.href)); } catch { errors.push(`下载文件不存在：${item.href}`); }
  }
  if (strict) {
    const serialized = JSON.stringify({ content, data });
    for (const placeholder of ["MODEL-001", "YYYY.MM.DD", "中位数示例", "卖点示例"]) if (serialized.includes(placeholder)) errors.push(`仍包含模板占位内容：${placeholder}`);
  }
}

if (runtime) {
  const serialized = JSON.stringify(runtime).toLowerCase();
  if (serialized.includes("token") && Object.keys(runtime).some((key) => /token|secret/i.test(key))) errors.push("runtime-config.json 不得包含 Token 或 Secret 字段。");
  if (runtime.githubPublishingEnabled && (!runtime.owner || !runtime.repo || !runtime.allowedGithubLogin)) errors.push("启用 GitHub 发布时必须配置 owner、repo 和 allowedGithubLogin。");
}

try {
  const page = await readFile(path.join(root, "app/page.tsx"), "utf8");
  if (!page.includes("data-locked")) errors.push("页面缺少数据锁定区域标记。");
  if (!page.includes("contentEditable={editMode}")) errors.push("页面缺少叙事文字原位编辑能力。");
  if (!page.includes("content/report.json")) errors.push("GitHub 发布目标未限制为叙事内容文件。");
} catch {}

if (errors.length) {
  console.error(JSON.stringify({ status: "failed", errors }, null, 2));
  process.exit(2);
}
console.log(JSON.stringify({ status: "passed", root, strict }, null, 2));
