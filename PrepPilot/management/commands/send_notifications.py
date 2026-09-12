"""
Django management command to send study reminders and notifications.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from PrepPilot.models import User, StudyPlan, Notification, Exam, TopicPerformance


class Command(BaseCommand):
    help = 'Send study reminders and notifications to users'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=str,
            help='Send notifications for specific user only',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what notifications would be sent without creating them',
        )
    
    def handle(self, *args, **options):
        user_id = options['user_id']
        dry_run = options['dry_run']
        
        users = User.objects.filter(is_active=True)
        
        if user_id:
            users = users.filter(id=user_id)
        
        today = timezone.now().date()
        tomorrow = today + timedelta(days=1)
        next_week = today + timedelta(days=7)
        
        notifications_created = 0
        
        for user in users:
            # 1. Tomorrow's study plan reminder
            tomorrow_plans = StudyPlan.objects.filter(
                user=user,
                date=tomorrow,
                status='pending'
            ).select_related('exam')
            
            for plan in tomorrow_plans:
                msg = (
                    f"You have {plan.total_hours:.1f} hours of study planned for tomorrow "
                    f"({plan.exam.name}). Blocks: {plan.blocks.count()}"
                )
                if not dry_run:
                    Notification.objects.get_or_create(
                        user=user,
                        title="Tomorrow's Study Plan",
                        message=msg,
                        notification_type='study_reminder',
                        related_exam=plan.exam,
                        priority='high',
                    )
                notifications_created += 1
                self.stdout.write(f'  {user.username}: Tomorrow plan reminder for {plan.exam.name}')
            
            # 2. Mock test reminders (3 days before)
            upcoming_mocks = Exam.objects.filter(
                user=user,
                is_active=True
            ).prefetch_related('mock_tests').filter(
                mock_tests__scheduled_date__in=[today + timedelta(days=3), today + timedelta(days=1)],
                mock_tests__status='scheduled'
            ).distinct()
            
            for exam in upcoming_mocks:
                mocks = exam.mock_tests.filter(
                    scheduled_date__in=[today + timedelta(days=3), today + timedelta(days=1)],
                    status='scheduled'
                )
                for mock in mocks:
                    days_until = (mock.scheduled_date - today).days
                    msg = (
                        f"Mock test '{mock.name}' is in {days_until} day(s). "
                        f"Duration: {mock.duration_minutes} minutes."
                    )
                    if not dry_run:
                        Notification.objects.get_or_create(
                            user=user,
                            title=f"Mock Test in {days_until} Day(s)",
                            message=msg,
                            notification_type='mock_test',
                            related_exam=exam,
                            priority='high' if days_until == 1 else 'medium',
                        )
                    notifications_created += 1
                    self.stdout.write(f'  {user.username}: Mock test reminder for {mock.name}')
            
            # 3. Revision due reminders
            due_revisions = TopicPerformance.objects.filter(
                user=user,
                next_revision_date__lte=today,
                mastery_level__lt=80
            ).select_related('topic__subject__exam')[:5]
            
            for perf in due_revisions:
                msg = (
                    f"Revision due for '{perf.topic.name}' "
                    f"(mastery: {perf.mastery_level}%). "
                    f"Last practiced: {perf.last_practiced.date() if perf.last_practiced else 'Never'}"
                )
                if not dry_run:
                    Notification.objects.get_or_create(
                        user=user,
                        title="Revision Due",
                        message=msg,
                        notification_type='revision_due',
                        related_topic=perf.topic,
                        priority='medium',
                    )
                notifications_created += 1
                self.stdout.write(f'  {user.username}: Revision due for {perf.topic.name}')
            
            # 4. Exam approaching (7 days)
            approaching_exams = Exam.objects.filter(
                user=user,
                is_active=True,
                exam_date__in=[today + timedelta(days=7)]
            )
            
            for exam in approaching_exams:
                msg = (
                    f"Your exam '{exam.name}' is in 7 days! "
                    f"Current readiness: {exam.readiness_scores.first().overall_score if exam.readiness_scores.exists() else 'Not calculated'}%"
                )
                if not dry_run:
                    Notification.objects.get_or_create(
                        user=user,
                        title="Exam in 1 Week!",
                        message=msg,
                        notification_type='warning',
                        related_exam=exam,
                        priority='urgent',
                    )
                notifications_created += 1
                self.stdout.write(f'  {user.username}: Exam approaching - {exam.name}')
            
            # 5. Stale study plan (no activity for 3 days)
            recent_plans = StudyPlan.objects.filter(
                user=user,
                date__gte=today - timedelta(days=3),
                date__lt=today
            ).exclude(status='completed')
            
            if not recent_plans.exists() and user.is_onboarded:
                active_exams = Exam.objects.filter(user=user, is_active=True, is_completed=False)
                if active_exams.exists():
                    msg = (
                        "You haven't completed any study blocks in the last 3 days. "
                        "Consistency is key to exam success!"
                    )
                    if not dry_run:
                        Notification.objects.get_or_create(
                            user=user,
                            title="Study Streak Broken",
                            message=msg,
                            notification_type='warning',
                            priority='medium',
                        )
                    notifications_created += 1
                    self.stdout.write(f'  {user.username}: Inactivity warning')
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'DRY RUN: Would create {notifications_created} notifications'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created {notifications_created} notifications'
                )
            )