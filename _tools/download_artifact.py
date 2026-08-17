import io
import os
import sys
import time
import zipfile

import requests

REPO = "kioka8877-ux/LACRIMAE"
GH_API = "https://api.github.com/repos"


def get_zip(url, headers, retries=4):
    """Télécharge un artifact zip en suivant les redirections GitHub vers le
    blob storage SANS ré-émettre le token (les redirects vers des hôtes
    externes rejettent l'Authorization). Retry sur 5xx/échec zip transitoire."""
    last = None
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=headers, allow_redirects=False,
                                timeout=60)
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
                                    timeout=60)
            if resp.status_code >= 500:
                last = resp
                time.sleep(2 * (attempt + 1))
                continue
            data = resp.content
            zipfile.ZipFile(io.BytesIO(data))
            return data
        except zipfile.BadZipFile:
            last = resp
            print(f"  retry ({attempt + 1}/{retries}) : réponse non-zip "
                  f"(HTTP {resp.status_code}, {len(resp.content)} octets)")
            time.sleep(2 * (attempt + 1))
        except requests.RequestException as exc:
            last = exc
            print(f"  retry ({attempt + 1}/{retries}) : {exc}")
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Téléchargement artifact impossible après {retries} "
                       f"tentatives : {last}")


def main():
    token = sys.argv[1]
    workflow = sys.argv[2]
    artifact_name = sys.argv[3]
    output_dir = sys.argv[4]
    branch = sys.argv[5] if len(sys.argv) > 5 else "dev"

    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    runs_url = f"{GH_API}/{REPO}/actions/workflows/{workflow}/runs"
    page = 1
    found = False
    while page <= 10 and not found:
        params = {"per_page": 20, "status": "success", "page": page}
        if branch:
            params["branch"] = branch
        runs = requests.get(runs_url, headers=headers, params=params).json()
        if not runs.get("workflow_runs"):
            break
        for run in runs["workflow_runs"]:
            arts_url = f"{GH_API}/{REPO}/actions/runs/{run['id']}/artifacts"
            arts = requests.get(arts_url, headers=headers).json()
            for a in arts.get("artifacts", []):
                if a["name"] == artifact_name:
                    print(f"Run #{run['id']}")
                    data = get_zip(a["archive_download_url"], headers)
                    z = zipfile.ZipFile(io.BytesIO(data))
                    os.makedirs(output_dir, exist_ok=True)
                    z.extractall(output_dir)
                    print(f"Extracted {artifact_name} -> {output_dir}")
                    found = True
                    break
            if found:
                break
        page += 1

    if not found:
        print(f"Artifact {artifact_name} not found in last successful runs")
        sys.exit(1)


if __name__ == "__main__":
    main()
