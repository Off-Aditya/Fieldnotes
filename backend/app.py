import logging
import threading
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).with_name(".env"))

import pipeline

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Fieldnotes Research API",
    description="API wrapper for the existing multi-agent research pipeline.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

jobs: dict[str, dict[str, Any]] = {}
pipeline_lock = threading.Lock()
jobs_lock = threading.RLock()

STAGES = [
    {
        "id": "search",
        "label": "Searching the web",
        "detail": "Finding recent sources and useful starting points.",
    },
    {
        "id": "reader",
        "label": "Reading sources",
        "detail": "Selecting relevant URLs and extracting page content.",
    },
    {
        "id": "writer",
        "label": "Writing the report",
        "detail": "Synthesizing gathered material into a structured report.",
    },
    {
        "id": "critic",
        "label": "Reviewing the report",
        "detail": "Checking strengths, gaps, and opportunities to improve.",
    },
]


class ResearchRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=1000)
    depth: str = Field(default="Deep dive")
    anonymous: bool = True


def record_event(job_id: str, stage: str, status: str, message: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            return
        if stage != "job":
            job["current_stage"] = stage
        job["events"].append(
            {"stage": stage, "status": status, "message": message, "timestamp": now}
        )


def update_stage(job_id: str, stage: str, status: str, message: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            return
        stage_state = job["stages"][stage]
        stage_state["status"] = status
        stage_state["message"] = message
        if status == "running":
            stage_state["started_at"] = now
            job["status"] = "running"
            job["current_stage"] = stage
        elif status in ("completed", "failed"):
            stage_state["completed_at"] = now
        job["events"].append(
            {"stage": stage, "status": status, "message": message, "timestamp": now}
        )


def execute_research(job_id: str, topic: str) -> None:
    record_event(job_id, "job", "running", "Preparing the research process.")
    with jobs_lock:
        if job_id in jobs:
            jobs[job_id]["status"] = "running"

    try:
        with pipeline_lock:
            result = pipeline.run_research_pipeline(
                topic,
                progress_callback=lambda stage, status, message: update_stage(
                    job_id, stage, status, message
                ),
            )
        with jobs_lock:
            job = jobs[job_id]
            job["result"] = {
                "topic": topic,
                "report": result.get("report", ""),
                "feedback": result.get("feedback", ""),
                "search_results": result.get("search_results", ""),
                "scraped_content": result.get("scraped_content", ""),
            }
            job["status"] = "completed"
            job["current_stage"] = "critic"
        record_event(job_id, "job", "completed", "Research and review completed.")
    except Exception as exc:
        logger.exception("Research job %s failed", job_id)
        with jobs_lock:
            job = jobs.get(job_id)
            if not job:
                return
            failed_stage = job.get("current_stage")
            if failed_stage in job["stages"]:
                stage = job["stages"][failed_stage]
                stage["status"] = "failed"
                stage["message"] = (
                    f"The AI provider's rate limit was reached during {failed_stage}. "
                    "Wait for the limit to reset or review your provider quota."
                    if getattr(exc, "status_code", None) == 429
                    else "This research step failed. See the backend terminal for details."
                )
                stage["completed_at"] = datetime.now(timezone.utc).isoformat()
            else:
                failed_stage = None
            job["status"] = "failed"
            job["error_stage"] = failed_stage
            if getattr(exc, "status_code", None) == 429 and failed_stage:
                job["error"] = (
                    f"The AI provider's rate limit was reached during {failed_stage}. "
                    "Wait for the limit to reset or review your provider quota."
                )
            else:
                job["error"] = (
                    f"{failed_stage.title()} failed. Check the backend terminal for details."
                    if failed_stage
                    else "Research failed before a step could start. Check the backend terminal for details."
                )
            job["events"].append(
                {
                    "stage": failed_stage or "job",
                    "status": "failed",
                    "message": job["error"],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )


@app.get("/")
def root():
    return {"status": "online", "service": "Fieldnotes Research API"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.post("/api/research")
def start_research(request: ResearchRequest):
    topic = request.topic.strip()
    if not topic:
        raise HTTPException(status_code=422, detail="Research topic cannot be empty.")

    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with jobs_lock:
        jobs[job_id] = {
            "job_id": job_id,
            "topic": topic,
            "depth": request.depth,
            "anonymous": request.anonymous,
            "status": "pending",
            "current_stage": None,
            "error_stage": None,
            "stages": {
                stage["id"]: {
                    "status": "pending",
                    "message": "Waiting to start.",
                    "started_at": None,
                    "completed_at": None,
                }
                for stage in STAGES
            },
            "events": [],
            "result": None,
            "error": None,
            "created_at": now,
        }

    worker = threading.Thread(
        target=execute_research, args=(job_id, topic), daemon=True
    )
    worker.start()

    return {"job_id": job_id, "status": "pending", "topic": topic}


@app.get("/api/research/{job_id}")
def get_research_status(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Research job not found.")
        return deepcopy(job)
