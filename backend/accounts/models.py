from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ANNOTATOR = "annotator", "Annotator"
        REVIEWER = "reviewer", "Reviewer"
        ADMIN = "admin", "Admin"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.ANNOTATOR,
    )

    def __str__(self):
        return f"{self.username} ({self.role})"
