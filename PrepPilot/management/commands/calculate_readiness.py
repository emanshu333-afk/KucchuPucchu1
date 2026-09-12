"""
Django management command to calculate readiness scores for exams.
"""
from django.core.management.base import BaseCommand

from PrepPilot.models import Exam
from PrepPilot.engines.readiness import ReadinessEngine


class Command(BaseCommand):
    help = 'Calculate exam readiness scores'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--exam-id',
            type=str,
            help='Calculate readiness for specific exam only',
        )
        parser.add_argument(
            '--all-users',
            action='store_true',
            help='Calculate for all users\' exams',
        )
    
    def handle(self, *args, **options):
        exam_id = options['exam_id']
        all_users = options['all_users']
        
        queryset = Exam.objects.filter(is_active=True)
        
        if exam_id:
            queryset = queryset.filter(id=exam_id)
        
        if not all_users:
            # In a real scenario, you'd filter by specific user
            pass
        
        exams = queryset.select_related('user').prefetch_related('subjects__topics')
        
        if not exams.exists():
            self.stdout.write(self.style.WARNING('No exams found'))
            return
        
        for exam in exams:
            self.stdout.write(f'Calculating readiness for: {exam.name} ({exam.user.username})')
            
            engine = ReadinessEngine(exam)
            readiness = engine.calculate_readiness()
            
            self.stdout.write(f'  Overall Score: {readiness.overall_score}/100')
            self.stdout.write(f'  Syllabus Coverage: {readiness.syllabus_coverage}%')
            self.stdout.write(f'  Topic Mastery: {readiness.topic_mastery}%')
            self.stdout.write(f'  Practice Accuracy: {readiness.practice_accuracy}%')
            self.stdout.write(f'  Mock Performance: {readiness.mock_performance}%')
            self.stdout.write(f'  Revision Frequency: {readiness.revision_frequency}%')
            self.stdout.write(f'  Weak Areas Penalty: -{readiness.weak_areas_penalty}')
            self.stdout.write(f'  Time Pressure Factor: {readiness.time_pressure_factor}%')
            self.stdout.write(f'  Explanation: {readiness.explanation}')
            
            if readiness.recommendations:
                self.stdout.write('  Recommendations:')
                for rec in readiness.recommendations:
                    self.stdout.write(f'    - {rec}')
        
        self.stdout.write(self.style.SUCCESS('Readiness calculation complete'))