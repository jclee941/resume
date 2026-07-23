from __future__ import annotations

import json
import sys
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path
from typing import Final
from unittest.mock import patch
from zipfile import ZipFile

from pptx.presentation import Presentation as PPTXPresentation

BUILD_DIR = Path(__file__).resolve().parent
if str(BUILD_DIR.parent) not in sys.path:
    sys.path.insert(0, str(BUILD_DIR.parent))

from build.pptx_engine import ResumeData, generate
from build.pptx_publication import PPTXPublicationError
from build.pptx_templates import TEMPLATES

TA_SOURCE: Final[ResumeData] = {
    "personal": {"name": "Fixture", "birthDate": "1994.10.17"},
    "education": {"school": "Fixture School", "status": "Graduated", "major": "CS"},
    "summary": {"grade": "Senior", "totalExperience": "1 year", "expertise": ["Security"]},
    "current": {"company": "(주)Fixture", "position": "Engineer"},
    "careers": [],
    "certifications": [],
    "projects": [],
}


class PPTXPublicationTest(unittest.TestCase):
    def test_rejects_ancestor_symlink_without_modifying_redirected_output(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            source_path = directory / "source.json"
            redirected_directory = directory / "redirected"
            destination_directory = directory / "destination"
            redirected_output = redirected_directory / "ta.pptx"
            previous_output = b"previous output"
            redirected_directory.mkdir()
            _ = source_path.write_text(json.dumps(TA_SOURCE), encoding="utf-8")
            _ = redirected_output.write_bytes(previous_output)
            destination_directory.symlink_to(redirected_directory, target_is_directory=True)

            from build.test_pptx_profiles import run_pptx_cli

            result = run_pptx_cli(
                "ta",
                "--data",
                str(source_path),
                "--output",
                str(destination_directory / "ta.pptx"),
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(redirected_output.read_bytes(), previous_output)
            self.assertTrue(destination_directory.is_symlink())
            self.assertEqual(list(redirected_directory.glob(".*")), [])

    def test_rejects_symlink_destination_without_modifying_target(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            source_path = directory / "source.json"
            target_path = directory / "previous-output.pptx"
            output_path = directory / "ta.pptx"
            previous_output = b"previous output"
            _ = source_path.write_text(json.dumps(TA_SOURCE), encoding="utf-8")
            _ = target_path.write_bytes(previous_output)
            output_path.symlink_to(target_path)

            from build.test_pptx_profiles import run_pptx_cli

            result = run_pptx_cli("ta", "--data", str(source_path), "--output", str(output_path))

            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(target_path.read_bytes(), previous_output)
            self.assertTrue(output_path.is_symlink())

    def test_preserves_existing_output_when_save_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            output_path = directory / "ta.pptx"
            previous_output = b"previous output"
            _ = output_path.write_bytes(previous_output)
            spec = replace(TEMPLATES["ta"], output_path=output_path)

            def save_partial_output_then_fail(
                _presentation: PPTXPresentation, destination: str
            ) -> None:
                _ = Path(destination).write_bytes(b"partial output")
                raise OSError("simulated save failure")

            with patch("pptx.presentation.Presentation.save", new=save_partial_output_then_fail):
                with self.assertRaisesRegex(OSError, "simulated save failure"):
                    _ = generate(spec, TA_SOURCE)

            self.assertEqual(output_path.read_bytes(), previous_output)
            self.assertEqual(list(directory.glob(".*")), [])

    def test_preserves_existing_output_when_validation_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            output_path = directory / "ta.pptx"
            previous_output = b"previous output"
            _ = output_path.write_bytes(previous_output)
            spec = replace(TEMPLATES["ta"], output_path=output_path)

            def save_zip_without_presentation(
                _presentation: PPTXPresentation, destination: str
            ) -> None:
                with ZipFile(destination, "w") as archive:
                    archive.writestr("placeholder.txt", "not a presentation")

            with patch("pptx.presentation.Presentation.save", new=save_zip_without_presentation):
                with self.assertRaisesRegex(PPTXPublicationError, "ppt/presentation.xml"):
                    _ = generate(spec, TA_SOURCE)

            self.assertEqual(output_path.read_bytes(), previous_output)
            self.assertEqual(list(directory.glob(".*")), [])


if __name__ == "__main__":
    _ = unittest.main()
