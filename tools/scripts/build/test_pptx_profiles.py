#!/usr/bin/env python3
from __future__ import annotations

import ast
import datetime
import json
import subprocess
import sys
import tempfile
import unittest
from xml.etree import ElementTree
from pathlib import Path
from typing import Final
from zipfile import ZipFile

BUILD_DIR = Path(__file__).resolve().parent
if str(BUILD_DIR.parent) not in sys.path:
    sys.path.insert(0, str(BUILD_DIR.parent))

from build.pptx_engine import ResumeData, get_current_age
from build.pptx_templates import TEMPLATES

PYTHON_311_BUILD_SOURCES: Final = (
    "pptx_engine.py",
    "pptx_layouts.py",
    "pptx_publication.py",
    "pptx_ta.py",
    "pptx_templates.py",
    "generate_pptx.py",
    "generate_ta_pptx.py",
)


TA_SOURCE: Final[ResumeData] = {
    "personal": {"name": "Fixture", "birthDate": "1994.10.17"},
    "education": {"school": "Fixture School", "status": "Graduated", "major": "CS"},
    "summary": {"grade": "Senior", "totalExperience": "1 year", "expertise": ["Security"]},
    "current": {"company": "(주)Fixture", "position": "Engineer"},
    "careers": [],
    "certifications": [],
    "projects": [],
}


def pptx_observation(path: Path) -> tuple[str, str, tuple[tuple[int, int], ...]]:
    with ZipFile(path) as archive:
        document = ElementTree.fromstring(archive.read("ppt/presentation.xml"))
        size = document.find("{http://schemas.openxmlformats.org/presentationml/2006/main}sldSz")
        if size is None:
            raise AssertionError("presentation has no slide size")
        slides = tuple(
            archive.read(name)
            for name in sorted(
                name
                for name in archive.namelist()
                if name.startswith("ppt/slides/slide") and name.endswith(".xml")
            )
        )
    return (
        size.attrib["cx"],
        size.attrib["cy"],
        tuple((slide.count(b"<a:tbl"), slide.count(b"<a:tr")) for slide in slides),
    )


def run_pptx_cli(*arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(BUILD_DIR / "generate_pptx.py"), *arguments],
        capture_output=True,
        cwd=BUILD_DIR,
        text=True,
        check=False,
    )


class PPTXProfileCharacterizationTest(unittest.TestCase):
    def test_build_sources_accept_python_311_grammar(self) -> None:
        for source_name in PYTHON_311_BUILD_SOURCES:
            source_path = BUILD_DIR / source_name
            with self.subTest(source=source_name):
                _ = ast.parse(
                    source_path.read_text(encoding="utf-8"),
                    filename=str(source_path),
                    feature_version=(3, 11),
                )

    def test_korean_age_does_not_increment_before_birthday(self) -> None:
        age = get_current_age("1994.10.17", datetime.date(2026, 7, 23))

        self.assertEqual(age, 31)

    def test_named_profiles_preserve_template_observations(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_path = Path(temporary_directory)
            source_path = temporary_path / "source.json"
            output_path = temporary_path / "ta.pptx"
            _ = source_path.write_text(json.dumps(TA_SOURCE), encoding="utf-8")

            result = run_pptx_cli(
                "ta",
                "--data",
                str(source_path),
                "--output",
                str(output_path),
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("Layout profile: ta", result.stdout)
            self.assertEqual(
                pptx_observation(output_path),
                ("12192000", "6858000", ((3, 15), (3, 5))),
            )

    def test_ta_profile_accepts_current_master_resume_contract(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            output_path = Path(temporary_directory) / "ta.pptx"

            result = run_pptx_cli(
                "ta",
                "--data",
                str(TEMPLATES["ta"].source_path),
                "--output",
                str(output_path),
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(output_path.is_file())

    def test_profile_list_reports_only_supported_template_profiles(self) -> None:
        result = run_pptx_cli("--list-profiles")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("ta", result.stdout)
        self.assertNotIn("shinhan", result.stdout.lower())

    def test_unknown_profile_fails_clearly(self) -> None:
        result = run_pptx_cli("ta", "--profile", "missing")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unknown layout profile: missing", result.stderr)


if __name__ == "__main__":
    _ = unittest.main()
