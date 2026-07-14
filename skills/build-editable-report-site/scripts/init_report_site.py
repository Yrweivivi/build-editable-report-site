#!/usr/bin/env python3
"""Copy the validated editorial-flat site skeleton into a new project."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_ROOT = SKILL_ROOT / "assets" / "editorial-flat-site"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--markdown", required=True)
    parser.add_argument("--attachment", action="append", default=[])
    parser.add_argument("--github-owner", default="")
    parser.add_argument("--github-repo", default="")
    parser.add_argument("--github-branch", default="main")
    parser.add_argument("--allowed-github-login", default="")
    args = parser.parse_args()

    output = Path(args.output).expanduser().resolve()
    if output.exists() and any(output.iterdir()):
        raise SystemExit(f"输出目录不是空目录，已停止：{output}")
    output.mkdir(parents=True, exist_ok=True)
    shutil.copytree(TEMPLATE_ROOT, output, dirs_exist_ok=True)

    sources = [Path(args.markdown).expanduser().resolve()]
    sources.extend(Path(item).expanduser().resolve() for item in args.attachment)
    downloads_dir = output / "public" / "downloads"
    downloads_dir.mkdir(parents=True, exist_ok=True)
    downloads: list[dict[str, str]] = []
    for source in sources:
        if not source.exists() or not source.is_file():
            raise SystemExit(f"源文件不存在：{source}")
        target = downloads_dir / source.name
        shutil.copy2(source, target)
        downloads.append({
            "label": f"下载 {source.name}",
            "href": f"/downloads/{source.name}",
            "meta": source.suffix.lstrip(".").upper() or "FILE",
        })

    sample = downloads_dir / "report.md"
    if sample.exists() and sample.name not in {source.name for source in sources}:
        sample.unlink()
    data_path = output / "data" / "report-data.json"
    data = json.loads(data_path.read_text(encoding="utf-8"))
    data["downloads"] = downloads
    data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    config_path = output / "public" / "runtime-config.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    config.update({
        "githubPublishingEnabled": bool(args.github_owner and args.github_repo),
        "owner": args.github_owner,
        "repo": args.github_repo,
        "branch": args.github_branch,
        "allowedGithubLogin": args.allowed_github_login,
    })
    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "created", "output": str(output), "downloads": len(downloads)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
