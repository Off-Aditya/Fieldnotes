import time
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import app


class ResearchJobTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app.app)

    def wait_for_job(self, job_id):
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            response = self.client.get(f"/api/research/{job_id}")
            self.assertEqual(response.status_code, 200)
            job = response.json()
            if job["status"] in ("completed", "failed"):
                return job
            time.sleep(0.01)
        self.fail("Research job did not reach a terminal state.")

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "healthy"})

    def test_job_reports_all_four_stages_and_result(self):
        def successful_run(topic, progress_callback):
            for stage in ("search", "reader", "writer", "critic"):
                progress_callback(stage, "running", f"{stage} started")
                progress_callback(stage, "completed", f"{stage} completed")
            return {
                "report": "# Findings",
                "feedback": "Areas to improve",
                "search_results": "Search material",
                "scraped_content": "Source text",
            }

        with patch.object(app.pipeline, "run_research_pipeline", successful_run):
            created = self.client.post("/api/research", json={"topic": "Example"})
            self.assertEqual(created.status_code, 200)
            job_id = created.json()["job_id"]
            job = self.wait_for_job(job_id)

        self.assertEqual(job["status"], "completed")
        self.assertEqual(job["job_id"], job_id)
        self.assertEqual(
            [job["stages"][name]["status"] for name in ("search", "reader", "writer", "critic")],
            ["completed"] * 4,
        )
        self.assertEqual(job["result"]["report"], "# Findings")
        self.assertTrue(any(event["status"] == "running" for event in job["events"]))

    def test_failed_stage_is_reported_without_exposing_exception(self):
        def failing_run(topic, progress_callback):
            progress_callback("search", "running", "Search started")
            progress_callback("search", "completed", "Search completed")
            progress_callback("reader", "running", "Reader started")
            raise RuntimeError("private detail must stay in backend logs")

        with (
            self.assertLogs(app.logger, level="ERROR") as captured_logs,
            patch.object(app.pipeline, "run_research_pipeline", failing_run),
        ):
            created = self.client.post("/api/research", json={"topic": "Example"})
            self.assertEqual(created.status_code, 200)
            job = self.wait_for_job(created.json()["job_id"])

        self.assertIn("Traceback", "\n".join(captured_logs.output))
        self.assertIn("RuntimeError", "\n".join(captured_logs.output))
        self.assertEqual(job["status"], "failed")
        self.assertEqual(job["error_stage"], "reader")
        self.assertEqual(job["stages"]["reader"]["status"], "failed")
        self.assertIn("Reader failed", job["error"])
        self.assertNotIn("private detail", job["error"])
        self.assertEqual(job["stages"]["search"]["status"], "completed")

    def test_rate_limit_returns_actionable_safe_message(self):
        class SimulatedRateLimit(Exception):
            status_code = 429

        def rate_limited_run(topic, progress_callback):
            progress_callback("writer", "running", "Drafting report")
            raise SimulatedRateLimit("private organization and billing details")

        with (
            self.assertLogs(app.logger, level="ERROR"),
            patch.object(app.pipeline, "run_research_pipeline", rate_limited_run),
        ):
            created = self.client.post("/api/research", json={"topic": "Example"})
            self.assertEqual(created.status_code, 200)
            job = self.wait_for_job(created.json()["job_id"])

        self.assertEqual(job["status"], "failed")
        self.assertEqual(job["error_stage"], "writer")
        self.assertIn("rate limit", job["error"])
        self.assertIn("reset", job["error"])
        self.assertNotIn("private organization", job["error"])


if __name__ == "__main__":
    unittest.main()
