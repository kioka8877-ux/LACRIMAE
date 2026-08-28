"""Gatsby backend — FLEET gateway and F03_EVENT_STORE foundation.

The backend keeps event-store access centralized and makes check-in atomic.
Secondary modules should call the service layer rather than opening SQLite directly.
"""
from __future__ import annotations

import csv
import io
import os
import sqlite3
import uuid
from contextlib import asynccontextmanager, closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import qrcode
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("GATSBY_DB_PATH", ROOT / "data" / "gatsby.db"))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="SeatRoom API", version="0.2.0", description="Invitation and QR check-in API for SeatRoom", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("GATSBY_ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, timeout=10, isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def init_db() -> None:
    with closing(get_db()) as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                event_date TEXT,
                venue TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS guests (
                id TEXT PRIMARY KEY,
                event_id TEXT NOT NULL REFERENCES events(id),
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                table_number TEXT NOT NULL,
                is_scanned INTEGER NOT NULL DEFAULT 0,
                scanned_at TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS audit_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT NOT NULL,
                guest_id TEXT,
                module TEXT NOT NULL,
                action TEXT NOT NULL,
                status TEXT NOT NULL,
                trace_id TEXT NOT NULL,
                details TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_guests_event ON guests(event_id);
            CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
            CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_events(event_id, created_at);
            """
        )
        event = db.execute("SELECT id FROM events LIMIT 1").fetchone()
        if not event:
            db.execute(
                "INSERT INTO events (id, name, event_date, venue, created_at) VALUES (?, ?, ?, ?, ?)",
                ("event-grand-bal", "Le Grand Bal — Édition I", "2026-09-21", "La Roseraie", utc_now()),
            )
        db.execute("ALTER TABLE audit_events ADD COLUMN is_anomaly INTEGER DEFAULT 0")
        db.execute("CREATE TABLE IF NOT EXISTS event_meta (event_id TEXT PRIMARY KEY, theme TEXT, photo_url TEXT, groom_name TEXT, bride_name TEXT)")


class GuestOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    phone: str
    table_number: str
    is_scanned: bool
    scanned_at: str | None = None


class CheckinResponse(BaseModel):
    status: Literal["SUCCESS", "ALREADY_SCANNED", "INVALID", "ERROR"]
    message: str
    trace_id: str
    guest_id: str | None = None
    name: str | None = None
    table: str | None = None
    scanned_at: str | None = None


class GuestCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=1, max_length=30)
    table_number: str = Field(min_length=1, max_length=80)


@app.get("/health")
def health() -> dict[str, str]:
    with closing(get_db()) as db:
        db.execute("SELECT 1").fetchone()
    return {"status": "ok", "service": "gatsby-api", "fleet_status": "OPERATIONAL"}


@app.get("/api/guests", response_model=list[GuestOut])
def list_guests(event_id: str = "event-grand-bal", q: str = "") -> list[GuestOut]:
    like = f"%{q.strip()}%"
    with closing(get_db()) as db:
        rows = db.execute(
            """
            SELECT id, first_name, last_name, phone, table_number, is_scanned, scanned_at
            FROM guests
            WHERE event_id = ? AND (first_name || ' ' || last_name LIKE ? OR phone LIKE ? OR table_number LIKE ?)
            ORDER BY last_name, first_name
            """,
            (event_id, like, like, like),
        ).fetchall()
    return [GuestOut(**{**dict(row), "is_scanned": bool(row["is_scanned"])}) for row in rows]


@app.post("/api/guests", response_model=GuestOut)
def create_guest(payload: GuestCreate, event_id: str = "event-grand-bal") -> GuestOut:
    guest_id = str(uuid.uuid4())
    now = utc_now()
    with closing(get_db()) as db:
        db.execute(
            "INSERT INTO guests (id, event_id, first_name, last_name, phone, table_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (guest_id, event_id, payload.first_name, payload.last_name, payload.phone, payload.table_number, now),
        )
    return GuestOut(id=guest_id, **payload.model_dump(), is_scanned=False)


@app.post("/api/check-in/{guest_token}", response_model=CheckinResponse)
def check_in(guest_token: str, event_id: str = "event-grand-bal") -> CheckinResponse:
    trace_id = str(uuid.uuid4())
    now = utc_now()
    with closing(get_db()) as db:
        db.execute("BEGIN IMMEDIATE")
        guest = db.execute(
            "SELECT * FROM guests WHERE id = ? AND event_id = ?", (guest_token, event_id)
        ).fetchone()
        if guest is None:
            db.execute(
                "INSERT INTO audit_events (event_id, module, action, status, trace_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (event_id, "F01_CHECKIN", "CHECK_IN", "INVALID", trace_id, "unknown_guest_token", now),
            )
            db.commit()
            return CheckinResponse(status="INVALID", message="Invitation inconnue.", trace_id=trace_id)
        if guest["is_scanned"]:
            db.execute(
                "INSERT INTO audit_events (event_id, guest_id, module, action, status, trace_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (event_id, guest["id"], "F01_CHECKIN", "CHECK_IN", "ALREADY_SCANNED", trace_id, guest["scanned_at"], now),
            )
            db.commit()
            return CheckinResponse(
                status="ALREADY_SCANNED",
                message="Cette invitation a déjà été scannée.",
                trace_id=trace_id,
                guest_id=guest["id"],
                name=f"{guest['first_name']} {guest['last_name']}",
                table=guest["table_number"],
                scanned_at=guest["scanned_at"],
            )
        updated = db.execute(
            "UPDATE guests SET is_scanned = 1, scanned_at = ? WHERE id = ? AND event_id = ? AND is_scanned = 0",
            (now, guest["id"], event_id),
        ).rowcount
        if updated != 1:
            db.rollback()
            return CheckinResponse(status="ERROR", message="Le contrôle doit être réessayé.", trace_id=trace_id)
        db.execute(
            "INSERT INTO audit_events (event_id, guest_id, module, action, status, trace_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (event_id, guest["id"], "F01_CHECKIN", "CHECK_IN", "SUCCESS", trace_id, guest["table_number"], now),
        )
        db.commit()
    return CheckinResponse(
        status="SUCCESS",
        message="Invitation valide.",
        trace_id=trace_id,
        guest_id=guest["id"],
        name=f"{guest['first_name']} {guest['last_name']}",
        table=guest["table_number"],
        scanned_at=now,
    )


@app.get("/api/dashboard/stats")
def dashboard_stats(event_id: str = "event-grand-bal") -> dict[str, float | int]:
    with closing(get_db()) as db:
        row = db.execute(
            "SELECT COUNT(*) AS total, COALESCE(SUM(is_scanned), 0) AS present FROM guests WHERE event_id = ?",
            (event_id,),
        ).fetchone()
    total = int(row["total"])
    present = int(row["present"])
    return {"total": total, "present": present, "remaining": total - present, "rate": round((present / total) * 100, 1) if total else 0.0}


@app.post("/api/import")
def import_guests(file: UploadFile = File(...), event_id: str = "event-grand-bal") -> dict[str, int | str]:
    if not file.filename or not file.filename.lower().endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Le fichier doit être CSV ou Excel.")
    return {"status": "PENDING", "module": "F06_IMPORT", "filename": file.filename, "rows_received": 0}


@app.get("/api/qr/{guest_id}.png")
def generate_qr(guest_id: str, event_id: str = "event-grand-bal") -> StreamingResponse:
    with closing(get_db()) as db:
        guest = db.execute("SELECT id FROM guests WHERE id = ? AND event_id = ?", (guest_id, event_id)).fetchone()
    if guest is None:
        raise HTTPException(status_code=404, detail="Invitation inconnue.")
    image = qrcode.make(guest_id)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/png", headers={"Content-Disposition": f"inline; filename=gatsby-{guest_id}.png"})


@app.post("/api/import/csv")
def import_csv(file: UploadFile = File(...), event_id: str = "event-grand-bal") -> dict[str, int | str | list[str]]:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Le fichier doit être au format CSV.")
    raw = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))
    required = {"Nom", "Prénom", "Téléphone", "Table"}
    headers = set(reader.fieldnames or [])
    missing = sorted(required - headers)
    if missing:
        raise HTTPException(status_code=422, detail={"missing_columns": missing})
    imported = 0
    rejected: list[str] = []
    now = utc_now()
    with closing(get_db()) as db:
        db.execute("BEGIN")
        for line_number, row in enumerate(reader, start=2):
            first_name = (row.get("Prénom") or "").strip()
            last_name = (row.get("Nom") or "").strip()
            phone = (row.get("Téléphone") or "").strip()
            table_number = (row.get("Table") or "").strip()
            if not all((first_name, last_name, phone, table_number)):
                rejected.append(f"ligne {line_number}")
                continue
            db.execute(
                "INSERT INTO guests (id, event_id, first_name, last_name, phone, table_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), event_id, first_name, last_name, phone, table_number, now),
            )
            imported += 1
        db.execute(
            "INSERT INTO audit_events (event_id, module, action, status, trace_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (event_id, "F06_IMPORT", "IMPORT_CSV", "SUCCESS", str(uuid.uuid4()), f"imported={imported};rejected={len(rejected)}", now),
        )
        db.commit()
    return {"status": "SUCCESS", "imported": imported, "rejected": len(rejected), "rejected_rows": rejected}


STATIC_DIR = ROOT / "static"
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")
