import json
import os
import subprocess
import sys
from datetime import datetime, timezone


def main():
    gate = sys.argv[1]
    ledger_path = sys.argv[2] if len(sys.argv) > 2 else "TRACKING/LACRIMAE_LEDGER.json"
    brief_path = sys.argv[3] if len(sys.argv) > 3 else "TRACKING/LACRIMAE_BRIEF.json"

    if os.path.exists(ledger_path):
        with open(ledger_path, encoding="utf-8") as f:
            ledger = json.load(f)
    else:
        ledger = {"pipeline": "LACRIMAE_DEV", "gates": {}}

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ledger["gate_actuelle"] = gate
    ledger["gates"][gate] = now
    ledger["derniere_mise_a_jour"] = now

    if os.path.exists(brief_path):
        with open(brief_path, encoding="utf-8") as f:
            ledger["brief"] = json.load(f)

    os.makedirs(os.path.dirname(ledger_path) or ".", exist_ok=True)
    with open(ledger_path, "w", encoding="utf-8") as f:
        json.dump(ledger, f, indent=2, ensure_ascii=False)

    print(f"Ledger updated: gate={gate}")


if __name__ == "__main__":
    main()
