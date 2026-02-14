import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker

from accounts.models import User
from projects.models import Project, Dataset, Task, Comment

fake = Faker()
Faker.seed(42)
random.seed(42)

REVIEW_TEXTS = [
    "The product quality exceeded my expectations. Fast shipping too!",
    "Terrible experience. The item arrived damaged and customer service was unhelpful.",
    "Average product, nothing special. It works as described.",
    "Absolutely love this! Best purchase I've made this year.",
    "Not worth the price. Cheaply made and fell apart after a week.",
    "Great value for money. Would definitely recommend to friends.",
    "The delivery was delayed by two weeks. Very disappointed.",
    "Excellent customer service. They resolved my issue immediately.",
    "Product looks nothing like the photos. Misleading advertisement.",
    "Solid build quality and works perfectly. Very satisfied.",
    "Returned it the same day. Complete waste of money.",
    "Good product but the instructions were confusing.",
    "Five stars! This is exactly what I was looking for.",
    "Mediocre at best. I've seen better alternatives for less.",
    "The packaging was eco-friendly which I really appreciate.",
    "Stopped working after three days. Requesting a refund.",
    "Surprisingly good quality for the price point.",
    "Would not recommend. Had a terrible experience overall.",
    "Perfect gift idea! My friend absolutely loved it.",
    "The sizing was completely off. Had to exchange twice.",
    "Incredible attention to detail. Clearly a premium product.",
    "It does the job but nothing more. Basic functionality.",
    "Worst purchase I've ever made. Stay away from this seller.",
    "Quick delivery and the product matched the description perfectly.",
    "The material feels cheap but it works fine for now.",
    "Outstanding quality! Already ordered two more for friends.",
    "Took forever to arrive and when it did, it was the wrong item.",
    "Decent product for everyday use. No complaints so far.",
    "Way too expensive for what you get. Not worth it.",
    "Love the design and functionality. Modern and sleek.",
    "Customer support ghosted me after I reported an issue.",
    "This replaced my old one and it's so much better.",
    "Fragile packaging. Arrived with a crack on the side.",
    "Highly recommend this to anyone looking for reliability.",
    "The app that comes with it is buggy and frustrating.",
    "Simple, effective, and affordable. What more could you ask for?",
    "I regret not buying this sooner. Game changer!",
    "False advertising. The features listed are not all included.",
    "My kids love this product. Great for the whole family.",
    "Overrated and overhyped. It's just an average product.",
]

REJECTION_COMMENTS = [
    "The label doesn't match the sentiment. The text is clearly negative but was labeled positive.",
    "Please re-read the review more carefully. The overall tone is sarcastic, not genuinely positive.",
    "Incorrect label. This is a neutral statement, not a negative one.",
    "The reviewer is expressing satisfaction, this should be labeled positive.",
    "Mixed signals in the text but the dominant sentiment is negative. Please reconsider.",
    "This review is clearly positive despite mentioning a minor issue. Re-label accordingly.",
    "Wrong classification. Read the full context before assigning a label.",
    "The sarcasm in this review makes it negative, not positive. Please fix.",
    "Ambiguous text but the last sentence clarifies the sentiment. Re-evaluate.",
    "Missed the key negative phrase. The customer is clearly unsatisfied.",
]


class Command(BaseCommand):
    help = "Seed demo data for LabelForge"

    def handle(self, *args, **options):
        if Task.objects.exists():
            self.stdout.write(self.style.WARNING("Data already seeded. Skipping."))
            return

        # Create users
        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults={"role": User.Role.ADMIN, "is_staff": True, "is_superuser": True},
        )
        admin.set_password("admin123")
        admin.save()

        annotator, _ = User.objects.get_or_create(
            username="annotator",
            defaults={"role": User.Role.ANNOTATOR},
        )
        annotator.set_password("annotator123")
        annotator.save()

        reviewer, _ = User.objects.get_or_create(
            username="reviewer",
            defaults={"role": User.Role.REVIEWER},
        )
        reviewer.set_password("reviewer123")
        reviewer.save()

        self.stdout.write(self.style.SUCCESS("Created demo users"))

        # Create project and dataset
        project, _ = Project.objects.get_or_create(
            name="Customer Sentiment Analysis",
            defaults={
                "description": "Classify customer reviews as positive, negative, or neutral sentiment.",
                "created_by": admin,
            },
        )

        dataset, _ = Dataset.objects.get_or_create(
            name="Sentiment v2",
            project=project,
            defaults={"labels": ["positive", "negative", "neutral"]},
        )

        self.stdout.write(self.style.SUCCESS("Created project and dataset"))

        # Create 200 tasks
        labels = ["positive", "negative", "neutral"]
        tasks = []
        for i in range(200):
            text = random.choice(REVIEW_TEXTS)
            if random.random() > 0.5:
                text = fake.sentence(nb_words=random.randint(8, 25))
            tasks.append(Task(dataset=dataset, text_content=text))

        Task.objects.bulk_create(tasks)
        all_tasks = list(Task.objects.filter(dataset=dataset).order_by("id"))
        self.stdout.write(self.style.SUCCESS(f"Created {len(all_tasks)} tasks"))

        now = timezone.now()

        # ~150 approved tasks
        approved_tasks = all_tasks[:150]
        for i, task in enumerate(approved_tasks):
            days_ago = random.randint(1, 30)
            review_date = now - timedelta(days=days_ago, hours=random.randint(0, 23))
            label = random.choice(labels)
            task.status = Task.Status.APPROVED
            task.assigned_to = annotator
            task.annotation = {"label": label}
            task.submitted_at = review_date - timedelta(minutes=random.randint(1, 30))
            task.reviewed_by = reviewer
            task.reviewed_at = review_date
            task.time_spent_seconds = random.randint(8, 120)

        Task.objects.bulk_update(
            approved_tasks,
            ["status", "assigned_to", "annotation", "submitted_at",
             "reviewed_by", "reviewed_at", "time_spent_seconds"],
        )

        # ~18 rejected (now back to in_progress with comments)
        rejected_tasks = all_tasks[150:168]
        for task in rejected_tasks:
            days_ago = random.randint(1, 10)
            label = random.choice(labels)
            task.status = Task.Status.IN_PROGRESS
            task.assigned_to = annotator
            task.annotation = {"label": label}
            task.submitted_at = now - timedelta(days=days_ago)
            task.reviewed_by = reviewer
            task.reviewed_at = now - timedelta(days=days_ago - 1)
            task.time_spent_seconds = random.randint(10, 90)

        Task.objects.bulk_update(
            rejected_tasks,
            ["status", "assigned_to", "annotation", "submitted_at",
             "reviewed_by", "reviewed_at", "time_spent_seconds"],
        )

        # Add rejection comments
        comments = []
        for task in rejected_tasks:
            comments.append(Comment(
                task=task,
                author=reviewer,
                body=random.choice(REJECTION_COMMENTS),
            ))
        Comment.objects.bulk_create(comments)

        # ~12 submitted (waiting for review)
        submitted_tasks = all_tasks[168:180]
        for task in submitted_tasks:
            label = random.choice(labels)
            task.status = Task.Status.SUBMITTED
            task.assigned_to = annotator
            task.annotation = {"label": label}
            task.submitted_at = now - timedelta(hours=random.randint(1, 48))
            task.time_spent_seconds = random.randint(15, 80)

        Task.objects.bulk_update(
            submitted_tasks,
            ["status", "assigned_to", "annotation", "submitted_at", "time_spent_seconds"],
        )

        # Remaining 20 stay as unclaimed (already default)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded: 150 approved, 18 rejected(in_progress), "
            f"12 submitted, 20 unclaimed"
        ))
        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))
