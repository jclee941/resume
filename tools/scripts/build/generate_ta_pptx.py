#!/usr/bin/env python3
"""
TA형 이력서 생성 - Thin wrapper for pptx_engine

Usage: python generate_ta_pptx.py
"""

import sys
from pathlib import Path

if __package__ is None:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from build.pptx_engine import generate
from build.pptx_templates import TEMPLATES

if __name__ == "__main__":
    generate(TEMPLATES["ta"])
