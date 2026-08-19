#!/usr/bin/env python3
from __future__ import annotations
import io
import os
import sys
import time
import zipfile
from pathlib import Path
import requests

REPO = 'kioka8877-ux/LACRIMAE'
API = 'https://api.github.com'


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit('usage: download_f04_artifacts_run.py RUN_ID OUTPUT_DIR')
    run_id, output_dir = sys.argv[1:]
    token = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
    if not token:
        raise SystemExit('GH_TOKEN/GITHUB_TOKEN manquant')
    headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}
    url = f'{API}/repos/{REPO}/actions/runs/{run_id}/artifacts'
    data = requests.get(url, headers=headers, timeout=90)
    data.raise_for_status()
    artifacts = [a for a in data.json().get('artifacts', []) if a['name'].startswith('f04-clip-') and not a.get('expired')]
    if not artifacts:
        raise SystemExit(f'Aucun artifact f04-clip-* dans le run {run_id}')
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    for artifact in artifacts:
        for attempt in range(5):
            response = requests.get(artifact['archive_download_url'], headers=headers, timeout=180)
            if response.status_code in (429, 500, 502, 503, 504):
                time.sleep(2 ** attempt)
                continue
            response.raise_for_status()
            try:
                with zipfile.ZipFile(io.BytesIO(response.content)) as z:
                    z.extractall(out)
                print(f"Reused {artifact['name']} from run {run_id}")
                break
            except zipfile.BadZipFile:
                time.sleep(2 ** attempt)
        else:
            raise SystemExit(f"Artifact illisible: {artifact['name']}")
    print(f'Reused {len(artifacts)} F04 artifact(s) from run {run_id}')


if __name__ == '__main__':
    main()
