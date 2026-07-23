from __future__ import annotations

import os
import stat
import tempfile
from pathlib import Path
from typing import Final, IO, Protocol
from zipfile import BadZipFile, ZipFile


PRESENTATION_ENTRY: Final = "ppt/presentation.xml"


class PPTXWriter(Protocol):
    def save(self, file: str | IO[bytes]) -> None: ...


class PPTXPublicationError(RuntimeError):
    pass

def publish_pptx(presentation: PPTXWriter, destination: Path) -> None:
    _validate_destination(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(
        dir=destination.parent,
        prefix=f".{destination.stem}.tmp-",
        suffix=destination.suffix,
        delete=False,
    ) as temporary_file:
        temporary_path = Path(temporary_file.name)

    try:
        presentation.save(str(temporary_path))
        _validate_pptx(temporary_path)
        _sync_file(temporary_path)
        _validate_destination(destination)
        os.replace(temporary_path, destination)
        _sync_directory(destination.parent)
    finally:
        temporary_path.unlink(missing_ok=True)


def _validate_destination(destination: Path) -> None:
    _reject_symlink_components(destination)

    try:
        destination_mode = destination.lstat().st_mode
    except FileNotFoundError:
        return

    if not stat.S_ISREG(destination_mode):
        raise PPTXPublicationError(f"Destination must be a regular file: {destination}")


def _reject_symlink_components(destination: Path) -> None:
    for component in (destination, *destination.parents):
        try:
            component_mode = component.lstat().st_mode
        except FileNotFoundError:
            continue

        if stat.S_ISLNK(component_mode):
            raise PPTXPublicationError(f"Refusing symlink destination component: {component}")


def _validate_pptx(path: Path) -> None:
    try:
        with ZipFile(path) as archive:
            if PRESENTATION_ENTRY not in archive.namelist():
                raise PPTXPublicationError(
                    f"Generated PPTX is missing {PRESENTATION_ENTRY}: {path}"
                )
    except BadZipFile as error:
        raise PPTXPublicationError(f"Generated artifact is not a valid ZIP: {path}") from error


def _sync_file(path: Path) -> None:
    descriptor = os.open(path, os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def _sync_directory(path: Path) -> None:
    descriptor = os.open(path, os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)
