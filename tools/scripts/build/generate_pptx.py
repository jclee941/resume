#!/usr/bin/env python3
"""
CLI wrapper for PPTX generation.

Usage:
    python generate_pptx.py ta              # Generate TA resume
    python generate_pptx.py ta --output custom.pptx
    python generate_pptx.py --list          # Show available templates
"""

import argparse
import sys
from dataclasses import replace
from pathlib import Path

if __package__ is None:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from build.pptx_engine import generate
from build.pptx_layouts import (
    UnsupportedTemplateProfileError,
    layout_profile_by_name,
    list_layout_profiles,
)
from build.pptx_templates import TEMPLATES


def main():
    parser = argparse.ArgumentParser(
        description="Generate PPTX resume from JSON data"
    )
    parser.add_argument(
        "template",
        nargs="?",
        choices=list(TEMPLATES.keys()),
        help="Template type to generate",
    )
    parser.add_argument(
        "--list", "-l",
        action="store_true",
        help="List available templates",
    )
    parser.add_argument(
        "--list-profiles",
        action="store_true",
        help="List available layout profiles",
    )
    parser.add_argument(
        "--profile",
        help="Require the selected template layout profile",
    )
    parser.add_argument(
        "--data", "-d",
        type=Path,
        help="Override source data path",
    )
    parser.add_argument(
        "--output", "-o",
        type=Path,
        help="Override output path",
    )
    
    args = parser.parse_args()
    
    if args.list:
        print("Available templates:")
        for name, spec in TEMPLATES.items():
            print(f"  {name:10} - {spec.name}")
            print(f"             Source:   {spec.source_path}")
            print(f"             Template: {spec.template_path}")
            print(f"             Output:   {spec.output_path}")
        return 0

    if args.list_profiles:
        print("Available layout profiles:")
        for profile in list_layout_profiles():
            print(
                f"  {profile.name:10} - "
                f"{profile.slide_width_emu}x{profile.slide_height_emu} EMU, "
                f"title {profile.title_size_pt}pt"
            )
        return 0
    
    if not args.template:
        parser.print_help()
        return 1
    
    try:
        spec = TEMPLATES[args.template]
        if args.profile:
            profile = layout_profile_by_name(args.profile)
            if profile.name != spec.layout_profile.name:
                raise UnsupportedTemplateProfileError(
                    template_name=args.template,
                    profile_name=profile.name,
                    expected_profile_name=spec.layout_profile.name,
                )
            spec = replace(spec, layout_profile=profile)
        if args.data:
            spec = replace(spec, source_path=args.data)
        if args.output:
            spec = replace(spec, output_path=args.output)
        _ = generate(spec)
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
