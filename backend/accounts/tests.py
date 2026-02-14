from django.test import TestCase
from .models import User


class UserModelTest(TestCase):
    def test_create_user_default_role(self):
        user = User.objects.create_user(username="testuser", password="pass1234")
        self.assertEqual(user.role, User.Role.ANNOTATOR)

    def test_create_user_with_role(self):
        user = User.objects.create_user(
            username="rev", password="pass1234", role=User.Role.REVIEWER
        )
        self.assertEqual(user.role, User.Role.REVIEWER)

    def test_role_choices(self):
        self.assertEqual(User.Role.ANNOTATOR, "annotator")
        self.assertEqual(User.Role.REVIEWER, "reviewer")
        self.assertEqual(User.Role.ADMIN, "admin")

    def test_str(self):
        user = User.objects.create_user(
            username="alice", password="pass1234", role=User.Role.ADMIN
        )
        self.assertEqual(str(user), "alice (admin)")
