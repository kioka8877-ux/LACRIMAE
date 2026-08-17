import io
import os
import sys
import time
import zipfile

import requests

REPO = "kioka8877-ux/LACRIMAE"
GH_API = "https://api.github.com/repos"


def backoff_sleep(attempt):
    # backoff exponentiel borné : 3, 6, 12, 24, 48, 60, 60, 60 ...
    secs = min(60, 3 * (2 ** attempt))
    time.sleep(secs)


def get_zip(url, headers, retries=8):
    """Télécharge un artifact zip en suivant les redirections GitHub vers le
    blob storage SANS ré-émettre le token (les redirects vers des hôtes
    externes rejettent l'Authorization). Retry sur 5xx/429/échec zip
    transitoire avec backoff exponentiel borné (les 503 de l'API artifacts
    GitHub sont transitoires et finissent par passer)."""
    last = None
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=headers, allow_redirects=False,
                                timeout=90)
            while resp.status_code in (301, 302, 303, 307, 308):
                loc = resp.headers.get("Location")
                if not loc:
                    break
                if loc.startswith("/"):
                    from urllib.parse import urljoin
                    loc = urljoin(url, loc)
                headers2 = headers
                if loc.startswith("https://"):
                    # hôte externe (blob storage) : PAS de token
                    headers2 = {"User-Agent": headers.get("User-Agent", "")}
                resp = requests.get(loc, headers=headers2, allow_redirects=False,
                                    timeout=90)
            if resp.status_code >= 500 or resp.status_code == 429:
                last = resp
                print(f"  retry ({attempt + 1}/{retries}) : HTTP "
                      f"{resp.status_code}")
                backoff_sleep(attempt)
                continue
            data = resp.content
            zipfile.ZipFile(io.BytesIO(data))
            return data
        except zipfile.BadZipFile:
            last = resp
            print(f"  retry ({attempt + 1}/{retries}) : réponse non-zip "
                  f"(HTTP {resp.status_code}, {len(resp.content)} octets)")
            backoff_sleep(attempt)
        except requests.RequestException as exc:
            last = exc
            print(f"  retry ({attempt + 1}/{retries}) : {exc}")
            backoff_sleep(attempt)
    raise RuntimeError(f"Téléchargement artifact impossible après {retries} "
                       f"tentatives : {last}")


def find_run_id(workflow, artifact_name, branch, headers):
    """Trouve l'ID du run le plus récent (succès) qui contient l'artifact."""
    runs_url = f"{GH_API}/{REPO}/actions/workflows/{workflow}/runs"
    for page in range(1, 11):
        params = {"per_page": 20, "status": "success", "page": page}
        if branch:
            params["branch"] = branch
        try:
            runs = requests.get(runs_url, headers=headers, params=params,
                                timeout=60).json()
        except requests.RequestException as exc:
            print(f"  retry listing runs : {exc}")
            time.sleep(3)
            continue
        if not runs.get("workflow_runs"):
            break
        for run in runs["workflow_runs"]:
            arts_url = f"{GH_API}/{REPO}/actions/runs/{run['id']}/artifacts"
            try:
                arts = requests.get(arts_url, headers=headers, timeout=60).json()
            except requests.RequestException as exc:
                print(f"  retry listing artifacts : {exc}")
                time.sleep(3)
                continue
            for a in arts.get("artifacts", []):
                if a["name"] == artifact_name:
                    return run["id"]
    return None


def main():
    args = sys.argv[1:]
    if args and args[0] == "find":
        # python3 download_artifact.py find <workflow> <artifact_name> <branch>
        workflow = args[1]
        artifact_name = args[2]
        branch = args[3] if len(args) > 3 else "dev"
        headers = {
            "Authorization": f"token {os.environ.get('GH_TOKEN', '')}",
            "Accept": "application/vnd.github.v3+json",
        }
        run_id = find_run_id(workflow, artifact_name, branch, headers)
        if run_id is None:
            print(f"Artifact {artifact_name} not found in last successful runs")
            sys.exit(1)
        print(run_id)
        return

    token = args[0]
    workflow = args[1]
    artifact_name = args[2]
    output_dir = args[3]
    branch = args[4] if len(args) > 4 else "dev"

    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    run_id = find_run_id(workflow, artifact_name, branch, headers)
    if run_id is None:
        print(f"Artifact {artifact_name} not found in last successful runs")
        sys.exit(1)
    print(f"Run #{run_id}")
    arts_url = f"{GH_API}/{REPO}/actions/runs/{run_id}/artifacts"
    arts = requests.get(arts_url, headers=headers, timeout=60).json()
    for a in arts.get("artifacts", []):
        if a["name"] == artifact_name:
            data = get_zip(a["archive_download_url"], headers)
            z = zipfile.ZipFile(io.BytesIO(data))
            os.makedirs(output_dir, exist_ok=True)
            z.extractall(output_dir)
            print(f"Extracted {artifact_name} -> {output_dir}")
            return
    print(f"Artifact {artifact_name} introuvable dans le run #{run_id}")
    sys.exit(1)


if __name__ == "__main__":
    main()
