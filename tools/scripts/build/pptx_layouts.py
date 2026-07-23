from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable, Final, ParamSpec, TypeVar

Parameters = ParamSpec("Parameters")
ReturnValue = TypeVar("ReturnValue")

if TYPE_CHECKING:
    from typing import override
else:
    def override(method: Callable[Parameters, ReturnValue], /) -> Callable[Parameters, ReturnValue]:
        return method


@dataclass(frozen=True, slots=True)
class TableLayout:
    rows: int
    columns: int
    header_rows: int
    header_columns: int
    header_size_pt: int
    body_size_pt: int
    max_entries: int
    max_technology_items: int
    hide_empty_rows: bool


@dataclass(frozen=True, slots=True)
class PPTXLayoutProfile:
    name: str
    slide_width_emu: int
    slide_height_emu: int
    title_size_pt: int
    table_layouts: tuple[TableLayout, ...]

    def table_layout(self, rows: int, columns: int) -> TableLayout:
        for layout in self.table_layouts:
            if layout.rows == rows and layout.columns == columns:
                return layout
        raise MissingTableLayoutError(profile_name=self.name, rows=rows, columns=columns)


@dataclass(frozen=True, slots=True)
class MissingTableLayoutError(Exception):
    profile_name: str
    rows: int
    columns: int

    @override
    def __str__(self) -> str:
        return f"layout profile {self.profile_name} has no table layout for {self.rows}x{self.columns}"


@dataclass(frozen=True, slots=True)
class UnknownLayoutProfileError(Exception):
    profile_name: str

    @override
    def __str__(self) -> str:
        return f"Unknown layout profile: {self.profile_name}. Available: {', '.join(LAYOUT_PROFILE_NAMES)}"


@dataclass(frozen=True, slots=True)
class UnsupportedTemplateProfileError(Exception):
    template_name: str
    profile_name: str
    expected_profile_name: str

    @override
    def __str__(self) -> str:
        return (
            f"template {self.template_name} requires layout profile {self.expected_profile_name}, "
            f"not {self.profile_name}"
        )


@dataclass(frozen=True, slots=True)
class SlideSizeMismatchError(Exception):
    profile_name: str
    expected_width_emu: int
    expected_height_emu: int
    actual_width_emu: int
    actual_height_emu: int

    @override
    def __str__(self) -> str:
        return (
            f"layout profile {self.profile_name} expects "
            f"{self.expected_width_emu}x{self.expected_height_emu} EMU, got "
            f"{self.actual_width_emu}x{self.actual_height_emu} EMU"
        )


TA_LAYOUT_PROFILE: Final = PPTXLayoutProfile(
    name="ta",
    slide_width_emu=12192000,
    slide_height_emu=6858000,
    title_size_pt=24,
    table_layouts=(
        TableLayout(15, 8, 2, 1, 14, 14, 7, 0, False),
        TableLayout(12, 6, 2, 0, 14, 14, 9, 3, True),
    ),
)

LAYOUT_PROFILES: Final = {
    TA_LAYOUT_PROFILE.name: TA_LAYOUT_PROFILE,
}
LAYOUT_PROFILE_NAMES: Final = tuple(LAYOUT_PROFILES)


def layout_profile_by_name(profile_name: str) -> PPTXLayoutProfile:
    try:
        return LAYOUT_PROFILES[profile_name]
    except KeyError as error:
        raise UnknownLayoutProfileError(profile_name=profile_name) from error


def list_layout_profiles() -> tuple[PPTXLayoutProfile, ...]:
    return tuple(LAYOUT_PROFILES[name] for name in LAYOUT_PROFILE_NAMES)
