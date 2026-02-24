#!/usr/bin/env python3
"""
신한형 이력서 생성 - Thin wrapper for pptx_engine

Usage: python generate_shinhan_pptx.py
"""

import importlib
import sys
from pathlib import Path

if __package__:
    _engine = importlib.import_module(".pptx_engine", __package__)
    _templates = importlib.import_module(".pptx_templates", __package__)
else:
    build_dir = Path(__file__).resolve().parent
    if str(build_dir) not in sys.path:
        sys.path.insert(0, str(build_dir))
    _engine = importlib.import_module("pptx_engine")
    _templates = importlib.import_module("pptx_templates")

generate = _engine.generate
TEMPLATES = _templates.TEMPLATES


def _exists(path_obj: object) -> bool:
    if isinstance(path_obj, Path):
        return path_obj.exists()
    if isinstance(path_obj, bytes):
        path_obj = path_obj.decode("utf-8", errors="ignore")
    if isinstance(path_obj, str):
        return Path(path_obj).exists()
    return False


if __name__ == "__main__":
    spec = TEMPLATES["shinhan"]
    if not _exists(spec.source_path):
        print(f"⚠️  Skip shinhan pptx generation: source not found: {spec.source_path}")
        raise SystemExit(0)
    if not _exists(spec.template_path):
        print(
            f"⚠️  Skip shinhan pptx generation: template not found: {spec.template_path}"
        )
        raise SystemExit(0)

    generate(spec)
