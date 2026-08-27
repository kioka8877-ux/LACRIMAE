import importlib.util
from pathlib import Path


MODULE_PATH = Path(__file__).parents[1] / "CODEBASE" / "f00_reveal.py"
spec = importlib.util.spec_from_file_location("f00_reveal", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_build_filter_crop_with_mirror():
    value = module.build_filter("crop", True)
    assert "crop=1080:1920" in value
    assert value.endswith(",hflip")


def test_build_filter_blur_without_mirror():
    value = module.build_filter("blur", False)
    assert "boxblur=24:12" in value
    assert "overlay=(W-w)/2:(H-h)/2" in value
    assert not value.endswith(",hflip")


def test_normalize_source_marks_sixth_as_final(tmp_path):
    source = tmp_path / "source.mp4"
    source.write_bytes(b"placeholder")
    row = module.normalize_source_row({"source": str(source), "in_seconds": 1, "out_seconds": 4}, 6)
    assert row["role"] == "final_reveal"
    assert row["in_seconds"] == 1
    assert row["out_seconds"] == 4


def test_normalize_source_rejects_invalid_range(tmp_path):
    source = tmp_path / "source.mp4"
    source.write_bytes(b"placeholder")
    try:
        module.normalize_source_row({"source": str(source), "in_seconds": 4, "out_seconds": 4}, 1)
    except ValueError as exc:
        assert "OUT" in str(exc)
    else:
        raise AssertionError("Une plage IN/OUT vide doit être rejetée")
