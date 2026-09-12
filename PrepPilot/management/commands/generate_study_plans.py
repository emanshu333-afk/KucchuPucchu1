"""
Django management command to generate study plans for all active exams.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from PrepPilot.models import Exam, StudyPlan
from PrepPilot.engines.daily_plan import DailyPlanEngine


class Command(BaseCommand):
    help = 'Generate study plans for all active exams'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--exam-id',
            type=str,
            help='Generate plan for specific exam only',
        )
        parser.add_argument(
            '--days-ahead',
            type=int,
            default=30,
            help='Number of days ahead to generate plans for',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Overwrite existing plans',
        )
    
    def handle(self, *args, **options):
        exam_id = options['exam_id']
        days_ahead = options['days_ahead']
        force = options['force']
        
        queryset = Exam.objects.filter(is_active=True, is_completed=False)
        
        if exam_id:
            queryset = queryset.filter(id=exam_id)
        
        exams = queryset.select_related('user').prefetch_related('subjects__topics')
        
        if not exams.exists():
            self.stdout.write(
                self.style.WARNING('No active exams found')
            )
            return
        
        total_plans = 0
        
        for exam in exams:
            self.stdout.write(f'Generating plan for: {exam.name}')
            
            # Check if plans already exist
            existing_count = StudyPlan.objects.filter(
                exam=exam,
                date__gte=timezone.now().date()
            ).count()
            
            if existing_count > 0 and not force:
                self.stdout.write(
                    self.style.WARNING(
                        f'  Skipping - {existing_count} existing plans found. Use --force to overwrite.'
                    )
                )
                continue
            
            try:
                engine = DailyPlanEngine(exam)
                plans = engine.generate_full_plan()
                saved_plans = engine.save_plan_to_database(plans)
                
                total_plans += len(saved_plans)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  Generated {len(saved_plans)} days of study plans'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  Error: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully generated {total_plans} study plans total'
            )
        )