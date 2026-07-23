from pathlib import Path

from .pptx_engine import TemplateSpec
from .pptx_layouts import TA_LAYOUT_PROFILE
from .pptx_ta import handle_ta_profile, handle_ta_projects

ROOT = Path(__file__).parent.parent.parent.parent

TEMPLATES = {
    "ta": TemplateSpec(
        name="TA형 이력서",
        source_path=ROOT / "packages/data/resumes/master/resume_data.json",
        template_path=ROOT / "packages/data/resumes/generated/ta.pptx",
        output_path=ROOT / "packages/data/resumes/generated/ta_filled.pptx",
        table_handlers={(15, 8): handle_ta_profile, (12, 6): handle_ta_projects},
        layout_profile=TA_LAYOUT_PROFILE,
    ),
}
