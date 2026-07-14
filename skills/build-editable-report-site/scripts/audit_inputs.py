#!/usr/bin/env python3
"""Audit source files before building an editable HTML report."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


DATA_SUFFIXES = {".xlsx", ".xlsm", ".csv", ".tsv", ".json"}
ATTACHMENT_SUFFIXES = DATA_SUFFIXES | {".md", ".pdf", ".png", ".jpg", ".jpeg", ".webp"}


def inspect(path_text: str, role: str, allowed: set[str]) -> dict:
    path = Path(path_text).expanduser().resolve()
    errors: list[str] = []
    if not path.exists():
        errors.append("文件不存在")
    elif not path.is_file():
        errors.append("不是普通文件")
    else:
        if path.suffix.lower() not in allowed:
            errors.append(f"不支持的扩展名：{path.suffix or '无扩展名'}")
        if path.stat().st_size == 0:
            errors.append("文件为空")
    return {
        "role": role,
        "path": str(path),
        "suffix": path.suffix.lower(),
        "size_bytes": path.stat().st_size if path.exists() and path.is_file() else None,
        "errors": errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--markdown", required=True)
    parser.add_argument("--data", action="append", default=[])
    parser.add_argument("--attachment", action="append", default=[])
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    files = [inspect(args.markdown, "canonical_markdown", {".md"})]
    files.extend(inspect(path, "structured_data", DATA_SUFFIXES) for path in args.data)
    files.extend(inspect(path, "attachment", ATTACHMENT_SUFFIXES) for path in args.attachment)
    errors = [f"{item['role']}: {item['path']}: {error}" for item in files for error in item["errors"]]
    result = {
        "status": "pass" if not errors else "blocked",
        "canonical_markdown": str(Path(args.markdown).expanduser().resolve()),
        "files": files,
        "errors": errors,
        "warnings": [] if args.data else ["没有结构化数据：可以生成文字报告，但不得自行生成或猜测图表数值。"],
    }
    output = Path(args.output).expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": result["status"], "output": str(output), "errors": len(errors)}, ensure_ascii=False))
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())
