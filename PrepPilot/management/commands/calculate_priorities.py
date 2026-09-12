"""
Django management command to calculate topic priorities for exams.
"""
from django.core.management.base import BaseCommand

from PrepPilot.models import Exam
from PrepPilot.engines.topic_priority import TopicPriorityEngine


class Command(BaseCommand):
    help = 'Calculate topic priorities for exams'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--exam-id',
            type=str,
            help='Calculate priorities for specific exam only',
        )
        parser.add_argument(
            '--recalculate-all',
            action='store_true',
            help='Recalculate all priorities even if already set',
        )
    
    def handle(self, *args, **options):
        exam_id = options['exam_id']
        recalculate = options['recalculate_all']
        
        queryset = Exam.objects.filter(is_active=True).prefetch_related('subjects__topics')
        
        if exam_id:
            queryset = queryset.filter(id=exam_id)
        
        exams = queryset
        
        if not exams.exists():
            self.stdout.write(self.style.WARNING('No exams found'))
            return
        
        for exam in exams:
            self.stdout.write(f'Calculating priorities for: {exam.name}')
            
            engine = TopicPriorityEngine(exam)
            priorities = engine.calculate_all_priorities()
            distribution = engine.get_priority_distribution()
            
            self.stdout.write(f'  MUST DO: {distribution["must_do"]}')
            self.stdout.write(f'  SHOULD DO: {distribution["should_do"]}')
            self.stdout.write(f'  IF TIME: {distribution["if_time"]}')
            
            # Show top 5 must-do topics
            must_do = engine.get_must_do_topics()[:5]
            if must_do:
                self.stdout.write('  Top MUST DO topics:')
                for topic in must_do:
                    self.stdout.write(f'    - {topic.name} (score: {topic.priority_score})')
        
        self.stdout.write(self.style.SUCCESS('Priority calculation complete'))