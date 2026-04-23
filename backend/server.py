#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import subprocess
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs


ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / ".cache" / "backend"
JOBS_DIR = CACHE_DIR / "jobs"
HISTORY_FILE = CACHE_DIR / "history.json"
PORT = int(os.environ.get("BACKEND_PORT", "3010"))
PYTHON = os.environ.get("PYTHON", "python3")
MAX_HISTORY = 20

ACTIVE_JOB_ID: str | None = None
LOCK = threading.Lock()


def ensure_dirs() -> None:
  JOBS_DIR.mkdir(parents=True, exist_ok=True)


def read_json(path: Path, default):
  try:
    return json.loads(path.read_text(encoding="utf-8"))
  except Exception:
    return default


def atomic_write_json(path: Path, payload) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  with tempfile.NamedTemporaryFile("w", delete=False, dir=path.parent, encoding="utf-8") as tmp:
    json.dump(payload, tmp, ensure_ascii=False, indent=2)
    tmp.flush()
    os.fsync(tmp.fileno())
    tmp_path = Path(tmp.name)
  tmp_path.replace(path)


def load_history():
  data = read_json(HISTORY_FILE, [])
  if isinstance(data, list):
    return data
  return []


def save_history(items):
  atomic_write_json(HISTORY_FILE, items[:MAX_HISTORY])


def compact_history_entry(entry: dict):
  keep_keys = {
    "id",
    "prompt",
    "seconds",
    "tone",
    "complexity",
    "stylePreset",
    "audience",
    "platform",
    "intensity",
    "motionLevel",
    "visualDensity",
    "narrativeTemplate",
    "goal",
    "pacing",
    "brief",
    "audioMood",
    "focus",
    "state",
    "stage",
    "progress",
    "message",
    "qualityScore",
    "outputPath",
    "error",
    "updatedAt",
  }
  return {key: entry.get(key) for key in keep_keys if key in entry}


def get_unsplash_usage():
  rate_file = ROOT / ".cache" / "unsplash-rate-limit.json"
  state = read_json(rate_file, {"windowStart": int(time.time() * 1000), "requestCount": 0})
  window_start = int(state.get("windowStart", int(time.time() * 1000)))
  request_count = int(state.get("requestCount", 0))
  limit = 50
  remaining = max(0, limit - request_count)
  return {
    "used": request_count,
    "remaining": remaining,
    "limit": limit,
    "resetAt": window_start + 60 * 60 * 1000,
  }


def write_job_status(job_id: str, status: dict) -> None:
  status_path = JOBS_DIR / job_id / "status.json"
  atomic_write_json(status_path, status)


def read_job_status(job_id: str):
  status_path = JOBS_DIR / job_id / "status.json"
  return read_json(status_path, None)


def read_job_payload(job_id: str):
  payload_path = JOBS_DIR / job_id / "payload.json"
  return read_json(payload_path, None)


def start_render_job(job_id: str) -> None:
  global ACTIVE_JOB_ID
  payload = read_job_payload(job_id)
  if not payload:
    write_job_status(
      job_id,
      {
        "id": job_id,
        "state": "error",
        "stage": "error",
        "progress": 100,
        "message": "Job payload not found.",
        "updatedAt": int(time.time() * 1000),
      },
    )
    with LOCK:
      ACTIVE_JOB_ID = None
    return

  worker = [
    "npx",
    "tsx",
    "bin/backend-render.ts",
    "--job-file",
    str(JOBS_DIR / job_id / "payload.json"),
    "--status-file",
    str(JOBS_DIR / job_id / "status.json"),
  ]

  proc = subprocess.Popen(
    worker,
    cwd=str(ROOT),
    env={**os.environ, "PYTHON": PYTHON},
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
  )

  assert proc.stdout is not None
  for line in proc.stdout:
    print(f"[{job_id}] {line.rstrip()}", flush=True)

  return_code = proc.wait()
  final_status = read_job_status(job_id) or {}
  if return_code != 0 and final_status.get("state") != "error":
    final_status = {
      **final_status,
      "id": job_id,
      "state": "error",
      "stage": "error",
      "progress": 100,
      "message": "Generation failed.",
      "error": f"Worker exited with code {return_code}",
      "updatedAt": int(time.time() * 1000),
    }
    write_job_status(job_id, final_status)

  if final_status.get("state") == "complete":
    history = load_history()
    history.insert(0, compact_history_entry(final_status))
    save_history(history)
  else:
    history = load_history()
    history.insert(0, compact_history_entry(final_status))
    save_history(history)

  with LOCK:
    ACTIVE_JOB_ID = None


def create_job(payload: dict):
  global ACTIVE_JOB_ID
  with LOCK:
    if ACTIVE_JOB_ID is not None:
      return None

    job_id = os.urandom(4).hex()
    ACTIVE_JOB_ID = job_id

  job_dir = JOBS_DIR / job_id
  job_dir.mkdir(parents=True, exist_ok=True)

  now = int(time.time() * 1000)
  job = {
    "id": job_id,
    "prompt": str(payload.get("prompt", "")).strip(),
    "seconds": max(5, min(300, int(payload.get("seconds", 45) or 45))),
    "tone": str(payload.get("tone", "informative")),
    "complexity": str(payload.get("complexity", "medium")),
    "stylePreset": str(payload.get("stylePreset", "cinematic")),
    "audience": str(payload.get("audience", "general")),
    "platform": str(payload.get("platform", "vertical")),
    "intensity": str(payload.get("intensity", "balanced")),
    "motionLevel": str(payload.get("motionLevel", "medium")),
    "visualDensity": str(payload.get("visualDensity", "balanced")),
    "narrativeTemplate": str(payload.get("narrativeTemplate", "problem-solution")),
    "goal": str(payload.get("goal", "")).strip(),
    "pacing": str(payload.get("pacing", "steady")),
    "brief": str(payload.get("brief", "")).strip(),
    "audioMood": str(payload.get("audioMood", "")).strip(),
    "focus": str(payload.get("focus", "full")),
    "state": "queued",
    "stage": "queued",
    "progress": 1,
    "message": "Queued for generation.",
    "updatedAt": now,
  }

  atomic_write_json(job_dir / "payload.json", job)
  write_job_status(job_id, job)

  thread = threading.Thread(target=start_render_job, args=(job_id,), daemon=True)
  thread.start()

  return job_id


class Handler(BaseHTTPRequestHandler):
  def _send_json(self, code: int, payload):
    data = json.dumps(payload).encode("utf-8")
    self.send_response(code)
    self.send_header("Content-Type", "application/json; charset=utf-8")
    self.send_header("Content-Length", str(len(data)))
    self.end_headers()
    self.wfile.write(data)

  def do_GET(self):  # noqa: N802
    parsed = urlparse(self.path)
    if parsed.path == "/health":
      return self._send_json(200, {"ok": True})

    if parsed.path == "/usage":
      return self._send_json(200, get_unsplash_usage())

    if parsed.path == "/history":
      return self._send_json(200, load_history())

    if parsed.path == "/status":
      job_id = parse_qs(parsed.query).get("id", [None])[0]
      if not job_id:
        return self._send_json(400, {"error": "Job id is required."})
      status = read_job_status(job_id)
      if not status:
        return self._send_json(404, {"error": "Job not found."})
      return self._send_json(200, status)

    return self._send_json(404, {"error": "Not found"})

  def do_POST(self):  # noqa: N802
    parsed = urlparse(self.path)
    if parsed.path != "/generate":
      return self._send_json(404, {"error": "Not found"})

    length = int(self.headers.get("Content-Length", "0") or "0")
    body = self.rfile.read(length) if length else b"{}"
    try:
      payload = json.loads(body.decode("utf-8") or "{}")
    except Exception:
      return self._send_json(400, {"error": "Invalid JSON body."})

    job_id = create_job(payload)
    if job_id is None:
      return self._send_json(409, {"error": "A job is already running."})

    return self._send_json(200, {"jobId": job_id})

  def log_message(self, fmt, *args):  # noqa: A003
    return


def main() -> None:
  ensure_dirs()
  print(f"Python backend listening on http://127.0.0.1:{PORT}", flush=True)
  server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
  try:
    server.serve_forever()
  except KeyboardInterrupt:
    pass
  finally:
    server.server_close()


if __name__ == "__main__":
  main()
