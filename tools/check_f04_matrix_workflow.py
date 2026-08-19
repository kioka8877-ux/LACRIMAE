from pathlib import Path
try:
    import yaml
except Exception as exc:
    raise SystemExit(f"PyYAML indisponible: {exc}")
path = Path('.github/workflows/lacrimae_f04_matrix.yml')
data = yaml.safe_load(path.read_text(encoding='utf-8'))
assert 'jobs' in data and {'prepare','render','aggregate'} <= set(data['jobs'])
assert data['jobs']['render']['strategy']['fail-fast'] is False
assert data['jobs']['render']['needs'] == 'prepare'
text = path.read_text(encoding='utf-8')
for required in ['tools/f04_prepare_matrix.py','tools/download_artifact_run.py','tools/f04_aggregate.py','f04-clip-*','clip_ids','source_run_id']:
    assert required in text, required
print('F04 matrix workflow static checks: OK')
