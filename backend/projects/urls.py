from django.urls import path
from . import views

urlpatterns = [
    path("projects/", views.project_list, name="project-list"),
    path("projects/<int:pk>/", views.project_detail, name="project-detail"),
    path("projects/<int:project_id>/datasets/", views.dataset_create, name="dataset-create"),
    path("datasets/<int:pk>/", views.dataset_detail, name="dataset-detail"),
    path("datasets/<int:dataset_id>/tasks/", views.task_list, name="task-list"),
    path("datasets/<int:dataset_id>/tasks/bulk/", views.task_bulk_create, name="task-bulk-create"),
    path("tasks/<int:pk>/claim/", views.task_claim, name="task-claim"),
    path("tasks/<int:pk>/submit/", views.task_submit, name="task-submit"),
    path("tasks/<int:pk>/approve/", views.task_approve, name="task-approve"),
    path("tasks/<int:pk>/reject/", views.task_reject, name="task-reject"),
    path("tasks/queue/", views.task_queue, name="task-queue"),
    path("tasks/review-queue/", views.review_queue, name="review-queue"),
    path("metrics/", views.metrics, name="metrics"),
    path("tasks/rejection-history/", views.rejection_history, name="rejection-history"),
]
