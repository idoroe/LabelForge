from django.utils import timezone
from django.db.models import Q, Count, Avg, F
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from .models import Project, Dataset, Task, Comment
from .serializers import (
    ProjectSerializer, ProjectCreateSerializer,
    DatasetSerializer, DatasetCreateSerializer,
    TaskSerializer, CommentSerializer, TaskBulkCreateSerializer,
)


def is_admin(user):
    return user.role == User.Role.ADMIN


def is_reviewer(user):
    return user.role in (User.Role.REVIEWER, User.Role.ADMIN)


def is_annotator(user):
    return user.role in (User.Role.ANNOTATOR, User.Role.ADMIN)


# --- Projects ---

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def project_list(request):
    if request.method == "GET":
        projects = Project.objects.all().order_by("-created_at")
        return Response(ProjectSerializer(projects, many=True).data)

    if not is_admin(request.user):
        return Response(
            {"detail": "Only admins can create projects."},
            status=status.HTTP_403_FORBIDDEN,
        )
    serializer = ProjectCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    project = serializer.save(created_by=request.user)
    return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def project_detail(request, pk):
    try:
        project = Project.objects.get(pk=pk)
    except Project.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    data = ProjectSerializer(project).data
    data["datasets"] = DatasetSerializer(
        project.datasets.all().order_by("-created_at"), many=True
    ).data
    return Response(data)


# --- Datasets ---

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def dataset_create(request, project_id):
    if not is_admin(request.user):
        return Response(
            {"detail": "Only admins can create datasets."},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = DatasetCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    dataset = serializer.save(project=project)
    return Response(DatasetSerializer(dataset).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dataset_detail(request, pk):
    try:
        dataset = Dataset.objects.get(pk=pk)
    except Dataset.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(DatasetSerializer(dataset).data)


# --- Tasks ---

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def task_list(request, dataset_id):
    try:
        dataset = Dataset.objects.get(pk=dataset_id)
    except Dataset.DoesNotExist:
        return Response({"detail": "Dataset not found."}, status=status.HTTP_404_NOT_FOUND)

    tasks = dataset.tasks.all().order_by("id")
    return Response(TaskSerializer(tasks, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def task_bulk_create(request, dataset_id):
    if not is_admin(request.user):
        return Response(
            {"detail": "Only admins can create tasks."},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        dataset = Dataset.objects.get(pk=dataset_id)
    except Dataset.DoesNotExist:
        return Response({"detail": "Dataset not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = TaskBulkCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    tasks = []
    for item in serializer.validated_data["tasks"]:
        text_content = item.get("text_content", "")
        if not text_content:
            return Response(
                {"detail": "Each task must have text_content."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        tasks.append(Task(dataset=dataset, text_content=text_content))

    Task.objects.bulk_create(tasks)
    return Response(
        {"detail": f"Created {len(tasks)} tasks."},
        status=status.HTTP_201_CREATED,
    )


# --- Task Workflow ---

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def task_claim(request, pk):
    if not is_annotator(request.user):
        return Response(
            {"detail": "Only annotators or admins can claim tasks."},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

    if task.status != Task.Status.UNCLAIMED:
        return Response(
            {"detail": f"Cannot claim task with status '{task.status}'. Task must be unclaimed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    task.status = Task.Status.IN_PROGRESS
    task.assigned_to = request.user
    task.save()
    return Response(TaskSerializer(task).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def task_submit(request, pk):
    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

    if task.status != Task.Status.IN_PROGRESS:
        return Response(
            {"detail": f"Cannot submit task with status '{task.status}'. Task must be in_progress."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if task.assigned_to != request.user:
        return Response(
            {"detail": "Only the assigned user can submit this task."},
            status=status.HTTP_403_FORBIDDEN,
        )

    annotation = request.data.get("annotation")
    if not annotation:
        return Response(
            {"detail": "Annotation data is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    time_spent = request.data.get("time_spent_seconds", 0)

    task.status = Task.Status.SUBMITTED
    task.annotation = annotation
    task.submitted_at = timezone.now()
    task.time_spent_seconds = time_spent
    task.save()
    return Response(TaskSerializer(task).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def task_approve(request, pk):
    if not is_reviewer(request.user):
        return Response(
            {"detail": "Only reviewers or admins can approve tasks."},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

    if task.status != Task.Status.SUBMITTED:
        return Response(
            {"detail": f"Cannot approve task with status '{task.status}'. Task must be submitted."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    task.status = Task.Status.APPROVED
    task.reviewed_by = request.user
    task.reviewed_at = timezone.now()
    task.save()
    return Response(TaskSerializer(task).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def task_reject(request, pk):
    if not is_reviewer(request.user):
        return Response(
            {"detail": "Only reviewers or admins can reject tasks."},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

    if task.status != Task.Status.SUBMITTED:
        return Response(
            {"detail": f"Cannot reject task with status '{task.status}'. Task must be submitted."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    comment_body = request.data.get("comment", "").strip()
    if not comment_body:
        return Response(
            {"detail": "A comment is required when rejecting a task."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    task.status = Task.Status.IN_PROGRESS
    task.reviewed_by = request.user
    task.reviewed_at = timezone.now()
    task.save()

    Comment.objects.create(task=task, author=request.user, body=comment_body)

    return Response(TaskSerializer(task).data)


# --- Queues ---

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def task_queue(request):
    dataset_id = request.query_params.get("dataset_id")
    tasks = Task.objects.filter(
        Q(status=Task.Status.UNCLAIMED) |
        Q(assigned_to=request.user, status__in=[Task.Status.IN_PROGRESS])
    ).order_by("id")

    if dataset_id:
        tasks = tasks.filter(dataset_id=dataset_id)

    return Response(TaskSerializer(tasks, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def review_queue(request):
    if not is_reviewer(request.user):
        return Response(
            {"detail": "Only reviewers or admins can access the review queue."},
            status=status.HTTP_403_FORBIDDEN,
        )

    dataset_id = request.query_params.get("dataset_id")
    tasks = Task.objects.filter(status=Task.Status.SUBMITTED).order_by("submitted_at")

    if dataset_id:
        tasks = tasks.filter(dataset_id=dataset_id)

    return Response(TaskSerializer(tasks, many=True).data)


# --- Metrics ---

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def metrics(request):
    project_id = request.query_params.get("project_id")

    tasks = Task.objects.all()
    if project_id:
        tasks = tasks.filter(dataset__project_id=project_id)

    total = tasks.count()
    approved = tasks.filter(status=Task.Status.APPROVED).count()
    rejected_comments = Comment.objects.filter(task__in=tasks).values("task").distinct().count()

    done = tasks.filter(status__in=[Task.Status.APPROVED, Task.Status.SUBMITTED]).count()
    completion_rate = round(approved / total * 100, 1) if total else 0

    total_reviewed = approved + rejected_comments
    rejection_rate = round(rejected_comments / total_reviewed * 100, 1) if total_reviewed else 0

    avg_time = tasks.filter(
        status=Task.Status.APPROVED, time_spent_seconds__gt=0
    ).aggregate(avg=Avg("time_spent_seconds"))["avg"] or 0

    # Daily throughput
    daily = (
        tasks.filter(status=Task.Status.APPROVED, reviewed_at__isnull=False)
        .extra(select={"date": "DATE(reviewed_at)"})
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )
    daily_throughput = [{"date": str(d["date"]), "count": d["count"]} for d in daily]

    # Per-annotator stats
    annotator_tasks = (
        tasks.filter(assigned_to__isnull=False)
        .values("assigned_to__username")
        .annotate(
            done=Count("id", filter=Q(status=Task.Status.APPROVED)),
            rejected=Count("id", filter=Q(comments__isnull=False)),
            avg_time=Avg("time_spent_seconds", filter=Q(status=Task.Status.APPROVED, time_spent_seconds__gt=0)),
        )
    )
    per_annotator = []
    for a in annotator_tasks:
        total_a = a["done"] + a["rejected"]
        per_annotator.append({
            "username": a["assigned_to__username"],
            "done": a["done"],
            "rejected": a["rejected"],
            "rejection_rate": round(a["rejected"] / total_a * 100, 1) if total_a else 0,
            "avg_time": round(a["avg_time"] or 0, 1),
        })

    # Label distribution
    label_dist_raw = (
        tasks.filter(status=Task.Status.APPROVED, annotation__isnull=False)
        .values_list("annotation", flat=True)
    )
    label_counts = {}
    for ann in label_dist_raw:
        if isinstance(ann, dict):
            label = ann.get("label", "unknown")
            label_counts[label] = label_counts.get(label, 0) + 1

    return Response({
        "total_tasks": total,
        "completed": approved,
        "rejected": rejected_comments,
        "completion_rate": completion_rate,
        "rejection_rate": rejection_rate,
        "avg_time_per_task": round(avg_time, 1),
        "daily_throughput": daily_throughput,
        "per_annotator": per_annotator,
        "label_distribution": label_counts,
    })
