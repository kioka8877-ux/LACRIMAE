import json
import os
import subprocess
import sys
from datetime import datetime, timezone


def main():
    fregate = sys.argv[1]
    ledger_path = sys.argv[2] if len(sys.argv) > 2 else "TRACKING/LACRIMAE_LEDGER.json"
    brief_path = sys.argv[3] if len(sys.argv) > 3 else "TRACKING/LACRIMAE_BRIEF.json"

    if os.path.exists(ledger_path):
        with open(ledger_path, encoding="utf-8") as f:
            ledger = json.load(f)
        # Migration : les anciens ledgers portaient "gate_actuelle"/"gates"
        # (hérésie) — les frégates remplacent les gates.
        if "gates" in ledger and "fregates" not in ledger:
            ledger["fregates"] = ledger.pop("gates")
        if "gate_actuelle" in ledger and "fregate_actuelle" not in ledger:
            ledger["fregate_actuelle"] = ledger.pop("gate_actuelle")
    else:
        ledger = {"pipeline": "LACRIMAE_DEV", "fregates": {}}

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ledger["fregate_actuelle"] = fregate
    ledger["fregates"][fregate] = now
    ledger["derniere_mise_a_jour"] = now

    if os.path.exists(brief_path):
        with open(brief_path, encoding="utf-8") as f:
            ledger["brief"] = json.load(f)

    os.makedirs(os.path.dirname(ledger_path) or ".", exist_ok=True)
    with open(ledger_path, "w", encoding="utf-8") as f:
        json.dump(ledger, f, indent=2, ensure_ascii=False)

    print(f"Ledger updated: fregate={fregate}")


if __name__ == "__main__":
    main()
