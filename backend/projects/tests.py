from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import User
from .models import Project, Dataset, Task, Comment


class ModelTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin", password="admin123", role=User.Role.ADMIN
        )
        self.annotator = User.objects.create_user(
            username="ann", password="ann123", role=User.Role.ANNOTATOR
        )
        self.reviewer = User.objects.create_user(
            username="rev", password="rev123", role=User.Role.REVIEWER
        )
        self.project = Project.objects.create(
            name="Test Project", created_by=self.admin
        )
        self.dataset = Dataset.objects.create(
            project=self.project,
            name="Test Dataset",
            labels=["positive", "negative"],
        )

    def test_task_default_status(self):
        task = Task.objects.create(
            dataset=self.dataset, text_content="Sample text"
        )
        self.assertEqual(task.status, Task.Status.UNCLAIMED)

    def test_task_str(self):
        task = Task.objects.create(
            dataset=self.dataset, text_content="Sample text"
        )
        self.assertIn("UNCLAIMED", str(task).upper())


class TaskWorkflowAPITest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin", password="admin123", role=User.Role.ADMIN
        )
        self.annotator = User.objects.create_user(
            username="ann", password="ann123", role=User.Role.ANNOTATOR
        )
        self.reviewer = User.objects.create_user(
            username="rev", password="rev123", role=User.Role.REVIEWER
        )
        self.project = Project.objects.create(
            name="Test", created_by=self.admin
        )
        self.dataset = Dataset.objects.create(
            project=self.project, name="DS", labels=["pos", "neg"]
        )
        self.task = Task.objects.create(
            dataset=self.dataset, text_content="Review this."
        )
        self.client = APIClient()

    def _login(self, username, password):
        resp = self.client.post("/api/auth/login/", {
            "username": username, "password": password
        })
        token = resp.json()["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_claim_unclaimed(self):
        self._login("ann", "ann123")
        resp = self.client.post(f"/api/tasks/{self.task.id}/claim/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "in_progress")

    def test_claim_already_claimed(self):
        self.task.status = Task.Status.IN_PROGRESS
        self.task.assigned_to = self.annotator
        self.task.save()
        self._login("ann", "ann123")
        resp = self.client.post(f"/api/tasks/{self.task.id}/claim/")
        self.assertEqual(resp.status_code, 400)

    def test_submit_requires_annotation(self):
        self.task.status = Task.Status.IN_PROGRESS
        self.task.assigned_to = self.annotator
        self.task.save()
        self._login("ann", "ann123")
        resp = self.client.post(f"/api/tasks/{self.task.id}/submit/", {})
        self.assertEqual(resp.status_code, 400)

    def test_submit_success(self):
        self.task.status = Task.Status.IN_PROGRESS
        self.task.assigned_to = self.annotator
        self.task.save()
        self._login("ann", "ann123")
        resp = self.client.post(
            f"/api/tasks/{self.task.id}/submit/",
            {"annotation": {"label": "pos"}, "time_spent_seconds": 30},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "submitted")

    def test_approve_success(self):
        self.task.status = Task.Status.SUBMITTED
        self.task.assigned_to = self.annotator
        self.task.annotation = {"label": "pos"}
        self.task.save()
        self._login("rev", "rev123")
        resp = self.client.post(f"/api/tasks/{self.task.id}/approve/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "approved")

    def test_approve_unclaimed_returns_400(self):
        self._login("rev", "rev123")
        resp = self.client.post(f"/api/tasks/{self.task.id}/approve/")
        self.assertEqual(resp.status_code, 400)

    def test_reject_requires_comment(self):
        self.task.status = Task.Status.SUBMITTED
        self.task.save()
        self._login("rev", "rev123")
        resp = self.client.post(f"/api/tasks/{self.task.id}/reject/", {})
        self.assertEqual(resp.status_code, 400)

    def test_reject_success(self):
        self.task.status = Task.Status.SUBMITTED
        self.task.assigned_to = self.annotator
        self.task.save()
        self._login("rev", "rev123")
        resp = self.client.post(
            f"/api/tasks/{self.task.id}/reject/",
            {"comment": "Incorrect label, please re-check."},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "in_progress")
        self.assertEqual(Comment.objects.filter(task=self.task).count(), 1)

    def test_annotator_cannot_approve(self):
        self.task.status = Task.Status.SUBMITTED
        self.task.save()
        self._login("ann", "ann123")
        resp = self.client.post(f"/api/tasks/{self.task.id}/approve/")
        self.assertEqual(resp.status_code, 403)

    def test_reviewer_cannot_claim(self):
        self._login("rev", "rev123")
        resp = self.client.post(f"/api/tasks/{self.task.id}/claim/")
        self.assertEqual(resp.status_code, 403)


class MetricsAPITest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin", password="admin123", role=User.Role.ADMIN
        )
        self.client = APIClient()

    def test_metrics_returns_expected_keys(self):
        resp = self.client.post("/api/auth/login/", {
            "username": "admin", "password": "admin123"
        })
        token = resp.json()["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        resp = self.client.get("/api/metrics/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        for key in ["total_tasks", "completed", "rejected", "completion_rate",
                     "rejection_rate", "avg_time_per_task", "daily_throughput",
                     "per_annotator", "label_distribution"]:
            self.assertIn(key, data)
