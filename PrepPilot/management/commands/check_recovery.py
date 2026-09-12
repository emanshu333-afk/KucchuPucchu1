"""
Django management command to check for exams needing recovery and generate plans.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from PrepPilot.models import Exam, RecoveryPlan
from PrepPilot.engines.recovery import RecoveryEngine


class Command(BaseCommand):
    help = 'Check for exams needing recovery and generate recovery plans'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--exam-id',
            type=str,
            help='Check specific exam only',
        )
        parser.add_argument(
            '--auto-apply',
            action='store_true',
            help='Automatically apply recovery plans',
        )
        parser.add_argument(
            '--hours-threshold',
            type=float,
            default=2.0,
            help='Hours behind threshold to trigger recovery',
        )
    
    def handle(self, *args, **options):
        exam_id = options['exam_id']
        auto_apply = options['auto_apply']
        hours_threshold = options['hours_threshold']
        
        queryset = Exam.objects.filter(is_active=True, is_completed=False)
        
        if exam_id:
            queryset = queryset.filter(id=exam_id)
        
        exams = queryset.select_related('user')
        
        if not exams.exists():
            self.stdout.write(self.style.WARNING('No active exams found'))
            return
        
        recovery_count = 0
        
        for exam in exams:
            engine = RecoveryEngine(exam)
            analysis = engine.analyze_progress()
            
            if analysis['hours_behind'] >= hours_threshold:
                self.stdout.write(
                    self.style.WARNING(
                        f'{exam.name}: {analysis["hours_behind"]:.1f} hours behind '
                        f'({analysis["completion_rate"]:.1f}% completion)'
                    )
                )
                
                # Check if recovery plan already exists for today
                today = timezone.now().date()
                existing = RecoveryPlan.objects.filter(
                    exam=exam,
                    created_at__date=today
                ).exists()
                
                if existing:
                    self.stdout.write('  Recovery plan already exists for today')
                    continue
                
                recovery_plan = engine.generate_recovery_plan()
                recovery_count += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  Generated recovery plan: '
                        f'{len(recovery_plan.priority_topics_moved_forward)} priority moved, '
                        f'{len(recovery_plan.optional_topics_removed)} removed'
                    )
                )
                
                if auto_apply:
                    result = engine.apply_recovery_plan(recovery_plan)
                    self.stdout.write(f'  Applied: {result["message"]}')
            else:
                self.stdout.write(
                    f'{exam.name}: On track ({analysis["hours_behind"]:.1f} hours behind)'
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Recovery check complete. {recovery_count} recovery plans generated.'
            )
        )