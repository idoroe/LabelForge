from rest_framework import serializers
from .models import Project, Dataset, Task, Comment
from accounts.serializers import UserSerializer


class ProjectSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Project
        fields = ["id", "name", "description", "created_by", "created_at"]


class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name", "description"]


class DatasetSerializer(serializers.ModelSerializer):
    task_counts = serializers.SerializerMethodField()

    class Meta:
        model = Dataset
        fields = ["id", "project", "name", "labels", "created_at", "task_counts"]

    def get_task_counts(self, obj):
        tasks = obj.tasks.all()
        return {
            "total": tasks.count(),
            "unclaimed": tasks.filter(status=Task.Status.UNCLAIMED).count(),
            "in_progress": tasks.filter(status=Task.Status.IN_PROGRESS).count(),
            "submitted": tasks.filter(status=Task.Status.SUBMITTED).count(),
            "approved": tasks.filter(status=Task.Status.APPROVED).count(),
            "rejected": tasks.filter(status=Task.Status.REJECTED).count(),
        }


class DatasetCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ["id", "name", "labels"]


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "task", "author", "body", "created_at"]


class TaskSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    dataset_name = serializers.CharField(source="dataset.name", read_only=True)
    dataset_labels = serializers.JSONField(source="dataset.labels", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id", "dataset", "dataset_name", "dataset_labels",
            "text_content", "status", "assigned_to",
            "annotation", "submitted_at", "reviewed_by",
            "reviewed_at", "time_spent_seconds", "comments",
        ]


class TaskBulkCreateSerializer(serializers.Serializer):
    tasks = serializers.ListField(
        child=serializers.DictField(), min_length=1
    )
