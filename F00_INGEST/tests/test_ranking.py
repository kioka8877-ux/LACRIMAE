import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "CODEBASE" / "f00_ranking.py"


def run_ranking(tmp_path, request):
    clips = {
        "schema_version": "dev8.reveal-clips.v1",
        "fps": 30,
        "sources": [{"id": f"reveal_{i:02d}", "file": f"clips/reveal_{i:02d}.mp4"} for i in range(1, 7)],
    }
    clips_path = tmp_path / "reveal_sources.json"
    request_path = tmp_path / "ranking_request.json"
    out = tmp_path / "out"
    clips_path.write_text(json.dumps(clips), encoding="utf-8")
    request_path.write_text(json.dumps(request), encoding="utf-8")
    subprocess.run(["python3", str(SCRIPT), "--clips-manifest", str(clips_path), "--request", str(request_path), "--out", str(out)], check=True)
    return json.loads((out / "ranking_manifest.json").read_text(encoding="utf-8"))


def test_ranking_normalizes_descending_entries(tmp_path):
    data = run_ranking(tmp_path, {"title": "Test", "entries": [
        {"rank": 1, "source_id": "reveal_06", "duration_seconds": 6, "label": "ONE", "final_rank": True},
        {"rank": 3, "source_id": "reveal_04", "duration_seconds": 3, "label": "THREE"},
        {"rank": 6, "source_id": "reveal_01", "duration_seconds": 3, "label": "SIX"},
    ]})
    assert [entry["rank"] for entry in data["entries"]] == [6, 3, 1]
    assert data["final_rank"]["role"] == "final_rank"
    assert data["entries"][0]["text_style"]["font_family"] == "Arial Black"


def test_ranking_allows_silent_sfx(tmp_path):
    data = run_ranking(tmp_path, {"entries": [
        {"rank": 1, "source_id": "reveal_01", "label": "ONE", "sfx": {"enabled": False}},
    ]})
    assert data["entries"][0]["sfx"]["enabled"] is False
    assert data["entries"][0]["sfx"]["file"] == ""


def test_ranking_rejects_unknown_source(tmp_path):
    clips = tmp_path / "clips.json"
    request = tmp_path / "request.json"
    out = tmp_path / "out"
    clips.write_text(json.dumps({"sources": [{"id": "reveal_01", "file": "clips/a.mp4"}]}), encoding="utf-8")
    request.write_text(json.dumps({"entries": [{"rank": 1, "source_id": "missing", "label": "X"}]}), encoding="utf-8")
    result = subprocess.run(["python3", str(SCRIPT), "--clips-manifest", str(clips), "--request", str(request), "--out", str(out)], capture_output=True, text=True)
    assert result.returncode != 0
