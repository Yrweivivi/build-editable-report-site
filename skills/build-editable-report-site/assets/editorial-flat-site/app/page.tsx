"use client";

import { useEffect, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type ElementType, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import initialContent from "../content/report.json";
import reportData from "../data/report-data.json";

type ReportContent = typeof initialContent;
type Finding = ReportContent["findings"][number];
type Section = ReportContent["sections"][number];
type ContentBlock = Section["blocks"][number];
type RuntimeConfig = {
  githubPublishingEnabled: boolean;
  owner: string;
  repo: string;
  branch: string;
  contentPath: string;
  allowedGithubLogin: string;
};

function EditableText({ as: Tag = "span", value, editMode, onChange, className, multiline = true }: {
  as?: ElementType;
  value: string;
  editMode: boolean;
  onChange: (value: string) => void;
  className?: string;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) ref.current.innerText = value;
  }, [value]);

  const onPaste = (event: ReactClipboardEvent<HTMLElement>) => {
    event.preventDefault();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(event.clipboardData.getData("text/plain"));
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    onChange(event.currentTarget.innerText);
  };

  return (
    <Tag
      ref={(node: HTMLElement | null) => { ref.current = node; }}
      className={className}
      contentEditable={editMode}
      suppressContentEditableWarning
      data-editable={editMode ? "true" : undefined}
      role={editMode ? "textbox" : undefined}
      aria-multiline={editMode ? multiline : undefined}
      spellCheck={editMode}
      onInput={(event: FormEvent<HTMLElement>) => onChange(event.currentTarget.innerText)}
      onPaste={onPaste}
      onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    >
      {value}
    </Tag>
  );
}

function Insight({ item, editMode, onChange }: { item: Finding; editMode: boolean; onChange: (field: "label" | "title" | "explanation", value: string) => void }) {
  return (
    <div className="insight-copy">
      <EditableText as="span" value={item.label} editMode={editMode} onChange={(value) => onChange("label", value)} multiline={false} />
      <EditableText as="h3" value={item.title} editMode={editMode} onChange={(value) => onChange("title", value)} />
      <EditableText as="p" value={item.explanation} editMode={editMode} onChange={(value) => onChange("explanation", value)} />
      <div className="source-pills">{item.sources.map((source) => <small key={source}>{source}</small>)}</div>
    </div>
  );
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

export default function Home() {
  const [content, setContent] = useState<ReportContent>(initialContent);
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/runtime-config.json", { cache: "no-store" }).then((response) => response.json() as Promise<RuntimeConfig>),
    ]).then(([runtime]) => {
      setConfig(runtime);
      if (!runtime.githubPublishingEnabled || !runtime.owner || !runtime.repo) return;
      const raw = `https://raw.githubusercontent.com/${runtime.owner}/${runtime.repo}/${runtime.branch}/${runtime.contentPath}`;
      fetch(`${raw}?t=${Date.now()}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((remote: ReportContent) => setContent(remote))
        .catch(() => undefined);
    }).catch(() => setConfig(null));
  }, []);

  const updateMeta = (field: keyof ReportContent["meta"], value: string) => {
    setContent((current) => ({ ...current, meta: { ...current.meta, [field]: value } }));
  };

  const updateFinding = (index: number, field: "label" | "title" | "explanation", value: string) => {
    setContent((current) => ({
      ...current,
      findings: current.findings.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) as ReportContent["findings"],
    }));
  };

  const updateSection = (index: number, field: "kicker" | "title" | "summary", value: string) => {
    setContent((current) => ({
      ...current,
      sections: current.sections.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) as ReportContent["sections"],
    }));
  };

  const updateBlock = (sectionIndex: number, blockIndex: number, field: string, value: string | string[]) => {
    setContent((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) => currentSectionIndex === sectionIndex ? {
        ...section,
        blocks: section.blocks.map((block, currentBlockIndex) => currentBlockIndex === blockIndex ? { ...block, [field]: value } as ContentBlock : block) as Section["blocks"],
      } : section) as ReportContent["sections"],
    }));
  };

  const publish = async () => {
    if (!config?.githubPublishingEnabled || !config.owner || !config.repo) {
      setStatus("当前项目尚未配置 GitHub 内容发布。");
      return;
    }
    if (!token.trim()) {
      setStatus("请粘贴仅授权该仓库 Contents 写入权限的 GitHub Token。");
      return;
    }
    setStatus("正在验证并发布……");
    try {
      const headers = { Authorization: `Bearer ${token.trim()}`, Accept: "application/vnd.github+json" };
      const user = await fetch("https://api.github.com/user", { headers }).then((response) => response.ok ? response.json() : Promise.reject(new Error("Token 无效或无法访问 GitHub。")));
      if (config.allowedGithubLogin && user.login !== config.allowedGithubLogin) throw new Error(`当前 Token 属于 ${user.login}，不允许发布此报告。`);
      const api = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.contentPath}`;
      const existing = await fetch(`${api}?ref=${encodeURIComponent(config.branch)}`, { headers }).then((response) => response.ok ? response.json() : Promise.reject(new Error("无法读取远端内容文件。")));
      const response = await fetch(api, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "content: 更新报告叙事文字",
          content: encodeBase64(`${JSON.stringify(content, null, 2)}\n`),
          sha: existing.sha,
          branch: config.branch,
        }),
      });
      if (!response.ok) throw new Error(`GitHub 发布失败（${response.status}）。请检查仓库权限或远端版本冲突。`);
      setStatus("发布成功。刷新页面后将从 GitHub 读取最新文字。");
      setToken("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "发布失败。");
    }
  };

  const renderBlock = (block: ContentBlock, sectionIndex: number, blockIndex: number) => {
    if (block.type === "chart-group") {
      return (
        <div className="content-block" key={blockIndex}>
          <div className="subsection-head"><div><EditableText as="h3" value={block.title} editMode={editMode} onChange={(value) => updateBlock(sectionIndex, blockIndex, "title", value)} /></div><EditableText as="p" value={block.note} editMode={editMode} onChange={(value) => updateBlock(sectionIndex, blockIndex, "note", value)} /></div>
          <div className="comparison data-locked">
            {block.dataIds.map((dataId) => {
              const chart = reportData.charts[dataId as keyof typeof reportData.charts];
              return <div className="distribution" key={dataId}><div className="chart-head"><div><p className="eyebrow">{chart.eyebrow}</p><h3>{chart.title}</h3></div></div><div className="bars">{chart.rows.map((row) => <div className="bar-row" key={row.label}><span>{row.label}</span><div className="track"><i style={{ width: `${Math.min(row.value, 100)}%` }} /></div><b>{row.display}</b><small>{row.detail}</small></div>)}</div></div>;
            })}
          </div>
        </div>
      );
    }
    if (block.type === "metrics") {
      const metrics = reportData.metrics[block.dataId as keyof typeof reportData.metrics];
      return <div className="content-block" key={blockIndex}><div className="subsection-head"><div><EditableText as="h3" value={block.title} editMode={editMode} onChange={(value) => updateBlock(sectionIndex, blockIndex, "title", value)} /></div><EditableText as="p" value={block.note} editMode={editMode} onChange={(value) => updateBlock(sectionIndex, blockIndex, "note", value)} /></div><div className="metric-lines data-locked">{metrics.map((item) => <div key={item.label}><span>{item.label}</span><i style={{ width: `${Math.min(item.value, 100)}%` }} /><b>{item.display}<small>{item.count}</small></b></div>)}</div></div>;
    }
    if (block.type === "table") {
      const table = reportData.tables[block.dataId as keyof typeof reportData.tables];
      return <div className="content-block" key={blockIndex}><div className="subsection-head"><div><EditableText as="h3" value={block.title} editMode={editMode} onChange={(value) => updateBlock(sectionIndex, blockIndex, "title", value)} /></div><EditableText as="p" value={block.note} editMode={editMode} onChange={(value) => updateBlock(sectionIndex, blockIndex, "note", value)} /></div><div className="table-wrap data-locked"><table><thead><tr>{table.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div></div>;
    }
    if (block.type === "callout") {
      return <div className={`evidence-callout ${block.tone}`} key={blockIndex}><EditableText as="b" value={block.label} editMode={editMode} onChange={(value) => updateBlock(sectionIndex, blockIndex, "label", value)} multiline={false} /><EditableText as="p" value={block.text} editMode={editMode} onChange={(value) => updateBlock(sectionIndex, blockIndex, "text", value)} /></div>;
    }
    if (block.type === "details") {
      return <details key={blockIndex}><summary><EditableText value={block.summary} editMode={editMode} onChange={(value) => updateBlock(sectionIndex, blockIndex, "summary", value)} multiline={false} /></summary><div className="detail-copy">{block.paragraphs.map((paragraph, paragraphIndex) => <EditableText as="p" key={paragraphIndex} value={paragraph} editMode={editMode} onChange={(value) => updateBlock(sectionIndex, blockIndex, "paragraphs", block.paragraphs.map((item, itemIndex) => itemIndex === paragraphIndex ? value : item))} />)}</div></details>;
    }
    return null;
  };

  return (
    <main className={editMode ? "edit-mode" : ""}>
      <nav className="topbar" aria-label="报告导航">
        <a className="brand" href="#top" onClick={(event) => editMode && event.preventDefault()}><EditableText as="span" value={content.meta.brandEyebrow} editMode={editMode} onChange={(value) => updateMeta("brandEyebrow", value)} multiline={false} /><EditableText as="b" value={content.meta.brandTitle} editMode={editMode} onChange={(value) => updateMeta("brandTitle", value)} multiline={false} /></a>
        <div className="navlinks">{content.sections.map((section) => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}</div>
        <button className="edit-trigger" onClick={() => setEditMode((value) => !value)} aria-pressed={editMode}>{editMode ? "退出编辑" : "编辑"}</button>
      </nav>

      {editMode && <aside className="edit-strip" aria-label="报告编辑工具栏"><span>点击页面中的文字直接修改</span><input aria-label="GitHub Token" type="password" autoComplete="off" placeholder="粘贴 GitHub Token" value={token} onChange={(event) => setToken(event.target.value)} /><button onClick={publish}>发布到 GitHub</button><button className="secondary" onClick={() => setEditMode(false)}>完成编辑</button>{status && <output>{status}</output>}</aside>}

      <article id="top">
        <header className="hero">
          <div className="hero-meta"><EditableText value={content.meta.reportLabel} editMode={editMode} onChange={(value) => updateMeta("reportLabel", value)} multiline={false} /><EditableText value={content.meta.reportDate} editMode={editMode} onChange={(value) => updateMeta("reportDate", value)} multiline={false} /></div>
          <div className="hero-grid"><div><EditableText as="p" className="eyebrow" value={content.meta.heroKicker} editMode={editMode} onChange={(value) => updateMeta("heroKicker", value)} multiline={false} /><h1><EditableText value={content.meta.heroTitle} editMode={editMode} onChange={(value) => updateMeta("heroTitle", value)} /><br /><EditableText as="em" value={content.meta.heroAccent} editMode={editMode} onChange={(value) => updateMeta("heroAccent", value)} /></h1></div><div className="hero-context"><EditableText as="p" value={content.meta.subtitle} editMode={editMode} onChange={(value) => updateMeta("subtitle", value)} /></div></div>
          <div className="signal" aria-hidden="true"><span /><i /><span /><i /><span /></div>
          <EditableText as="p" className="hero-deck" value={content.meta.heroSummary} editMode={editMode} onChange={(value) => updateMeta("heroSummary", value)} />
        </header>

        <section className="report-map" aria-label="报告结论索引"><EditableText as="p" className="eyebrow" value={content.meta.findingsKicker} editMode={editMode} onChange={(value) => updateMeta("findingsKicker", value)} multiline={false} />{content.findings.map((item, index) => <a href={`#${item.target}`} key={index} onClick={(event) => editMode && event.preventDefault()}><span>{String(index + 1).padStart(2, "0")} · <EditableText value={item.label} editMode={editMode} onChange={(value) => updateFinding(index, "label", value)} multiline={false} /></span><EditableText as="b" value={item.title} editMode={editMode} onChange={(value) => updateFinding(index, "title", value)} /></a>)}</section>
        <aside className="status-note"><EditableText as="span" value={content.meta.boundaryLabel} editMode={editMode} onChange={(value) => updateMeta("boundaryLabel", value)} multiline={false} /><EditableText as="p" value={content.meta.boundaryText} editMode={editMode} onChange={(value) => updateMeta("boundaryText", value)} /></aside>

        {content.sections.map((section, sectionIndex) => <section id={section.id} className="report-section" key={section.id}><header className="section-title"><EditableText as="p" className="eyebrow" value={section.kicker} editMode={editMode} onChange={(value) => updateSection(sectionIndex, "kicker", value)} multiline={false} /><EditableText as="h2" value={section.title} editMode={editMode} onChange={(value) => updateSection(sectionIndex, "title", value)} /><EditableText as="p" value={section.summary} editMode={editMode} onChange={(value) => updateSection(sectionIndex, "summary", value)} /></header>{section.findingIndexes.map((findingIndex) => <Insight key={findingIndex} item={content.findings[findingIndex]} editMode={editMode} onChange={(field, value) => updateFinding(findingIndex, field, value)} />)}{section.blocks.map((block, blockIndex) => renderBlock(block, sectionIndex, blockIndex))}</section>)}

        <section className="appendix"><div className="download-panel"><div><EditableText as="p" className="eyebrow" value={content.appendix.kicker} editMode={editMode} onChange={(value) => setContent((current) => ({ ...current, appendix: { ...current.appendix, kicker: value } }))} /><EditableText as="h2" value={content.appendix.title} editMode={editMode} onChange={(value) => setContent((current) => ({ ...current, appendix: { ...current.appendix, title: value } }))} /><EditableText as="p" value={content.appendix.text} editMode={editMode} onChange={(value) => setContent((current) => ({ ...current, appendix: { ...current.appendix, text: value } }))} /></div><div className="data-locked">{reportData.downloads.map((item) => <a href={item.href} download key={item.href}>{item.label}<span>{item.meta}</span></a>)}</div></div></section>
        <footer><div><EditableText as="b" value={content.footer.title} editMode={editMode} onChange={(value) => setContent((current) => ({ ...current, footer: { ...current.footer, title: value } }))} multiline={false} /><EditableText value={content.footer.text} editMode={editMode} onChange={(value) => setContent((current) => ({ ...current, footer: { ...current.footer, text: value } }))} /></div><p>DATA LOCKED · NARRATIVE EDITABLE</p></footer>
      </article>
    </main>
  );
}
