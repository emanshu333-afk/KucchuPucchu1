"""
Daily Plan Engine - Generates day-by-day study plans with purpose-driven blocks.
"""
import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from django.db.models import QuerySet
from django.utils import timezone

from PrepPilot.models import (
    User, Exam, Subject, Topic, StudyPlan, StudyBlock, Resource
)
from PrepPilot.engines.topic_priority import TopicPriorityEngine
from PrepPilot.engines.time_budget import TimeBudgetEngine
from PrepPilot.engines.resource_matcher import ResourceMatcherEngine

logger = logging.getLogger(__name__)


class DailyPlanEngine:
    """
    Engine for generating detailed day-by-day study plans.
    Each study block has a clear purpose: LEARN → PRACTICE → TEST → ANALYZE → REVISE
    """
    
    BLOCK_TYPES = ['learn', 'practice', 'test', 'analyze', 'revise', 'mock']
    
    # Default block durations (minutes)
    DEFAULT_BLOCK_DURATIONS = {
        'learn': 60,
        'practice': 45,
        'test': 30,
        'analyze': 15,
        'revise': 30,
        'mock': 180,
    }
    
    def __init__(self, exam: Exam):
        self.exam = exam
        self.user = exam.user
        self.priority_engine = TopicPriorityEngine(exam)
        self.budget_engine = TimeBudgetEngine(exam)
        self.resource_engine = ResourceMatcherEngine(self.user)
        
        self.days_remaining = exam.days_remaining
        self.hours_per_day = float(self.user.preferred_study_hours_per_day)
        self.minutes_per_day = int(self.hours_per_day * 60)
        
        # Get topic allocations
        self.budget_data = self.budget_engine.allocate_subject_hours()
        self.topic_priorities = self.priority_engine.calculate_all_priorities()
    
    def generate_full_plan(self, start_date: Optional[date] = None) -> List[Dict[str, Any]]:
        """
        Generate complete day-by-day study plan from start_date to exam date.
        """
        if start_date is None:
            start_date = timezone.now().date()
        
        end_date = self.exam.exam_date
        if start_date > end_date:
            return []
        
        # Get all topics ordered by priority
        all_topics = self._get_ordered_topics()
        
        # Calculate topic schedule
        topic_schedule = self._schedule_topics(all_topics, start_date, end_date)
        
        # Generate daily plans
        daily_plans = []
        current_date = start_date
        
        for day_topics in topic_schedule:
            if current_date > end_date:
                break
                
            daily_plan = self._create_daily_plan(current_date, day_topics)
            daily_plans.append(daily_plan)
            current_date += timedelta(days=1)
        
        # Add mock test days
        self._schedule_mock_tests(daily_plans, start_date, end_date)
        
        return daily_plans
    
    def _get_ordered_topics(self) -> List[Topic]:
        """Get all topics ordered by priority and subject."""
        must_do = list(self.priority_engine.get_must_do_topics())
        should_do = list(self.priority_engine.get_should_do_topics())
        if_time = list(self.priority_engine.get_if_time_topics())
        
        # Interleave subjects for variety
        ordered = []
        max_len = max(len(must_do), len(should_do), len(if_time))
        
        for i in range(max_len):
            for topic_list in [must_do, should_do, if_time]:
                if i < len(topic_list):
                    ordered.append(topic_list[i])
        
        return ordered
    
    def _schedule_topics(
        self,
        topics: List[Topic],
        start_date: date,
        end_date: date
    ) -> List[List[Topic]]:
        """
        Distribute topics across days based on allocated hours.
        """
        total_days = (end_date - start_date).days + 1
        daily_schedule = [[] for _ in range(total_days)]
        
        # Get topic hours from budget
        topic_hours = {}
        for subject_alloc in self.budget_data['allocations'].values():
            subject_id = subject_alloc['subject_id']
            subject_topics = Topic.objects.filter(subject_id=subject_id)
            topic_allocations = self.budget_engine.allocate_topic_hours(
                Subject.objects.get(id=subject_id)
            )
            for alloc in topic_allocations:
                topic_hours[alloc['topic_id']] = alloc['allocated_hours']
        
        # Distribute topics across days
        day_idx = 0
        daily_minutes = self.minutes_per_day
        
        for topic in topics:
            topic_id = str(topic.id)
            allocated_hours = topic_hours.get(topic_id, float(topic.estimated_hours))
            allocated_minutes = int(allocated_hours * 60)
            
            # Skip if no time allocated
            if allocated_minutes <= 0:
                continue
            
            # Find days with available time
            while allocated_minutes > 0 and day_idx < total_days:
                day_used = sum(
                    self.DEFAULT_BLOCK_DURATIONS.get(b['block_type'], 60)
                    for b in daily_schedule[day_idx]
                )
                available = daily_minutes - day_used
                
                if available >= 30:  # Minimum block size
                    daily_schedule[day_idx].append(topic)
                    allocated_minutes -= min(available, allocated_minutes)
                else:
                    day_idx += 1
        
        return daily_schedule
    
    def _create_daily_plan(self, plan_date: date, topics: List[Topic]) -> Dict[str, Any]:
        """Create detailed daily plan with study blocks."""
        blocks = []
        total_minutes = 0
        block_order = 0
        
        for topic in topics:
            # Get resource sequence for this topic
            resource_sequence = self.resource_engine.get_recommended_sequence(topic)
            
            for step in resource_sequence:
                objective = step['objective']
                block_type = self._map_objective_to_block_type(objective)
                duration = step['estimated_minutes']
                resources = step['resources']
                
                if total_minutes + duration > self.minutes_per_day:
                    break  # Day is full
                
                block = {
                    'order': block_order,
                    'topic_id': str(topic.id),
                    'topic_name': topic.name,
                    'block_type': block_type,
                    'objective': objective,
                    'duration_minutes': duration,
                    'description': step['description'],
                    'resources': resources,
                    'learning_objectives': [objective],
                }
                blocks.append(block)
                total_minutes += duration
                block_order += 1
        
        # Add revision block if time permits
        if total_minutes < self.minutes_per_day - 30:
            rev_block = self._create_revision_block(block_order, total_minutes)
            if rev_block:
                blocks.append(rev_block)
                total_minutes += rev_block['duration_minutes']
        
        return {
            'date': plan_date.isoformat(),
            'total_hours': round(total_minutes / 60, 2),
            'blocks': blocks,
        }
    
    def _map_objective_to_block_type(self, objective: str) -> str:
        """Map learning objective to block type."""
        mapping = {
            'theory': 'learn',
            'examples': 'learn',
            'practice': 'practice',
            'test': 'test',
            'analyze': 'analyze',
            'revision': 'revise',
        }
        return mapping.get(objective, 'learn')
    
    def _create_revision_block(self, order: int, used_minutes: int) -> Optional[Dict[str, Any]]:
        """Create a revision block for the end of the day."""
        available = self.minutes_per_day - used_minutes
        if available < 15:
            return None
        
        duration = min(available, 30)
        return {
            'order': order,
            'topic_id': None,
            'topic_name': 'Daily Revision',
            'block_type': 'revise',
            'objective': 'revision',
            'duration_minutes': duration,
            'description': 'Review key concepts and mistakes from today',
            'resources': [],
            'learning_objectives': ['revision'],
        }
    
    def _schedule_mock_tests(
        self,
        daily_plans: List[Dict[str, Any]],
        start_date: date,
        end_date: date
    ):
        """Schedule mock tests at regular intervals."""
        total_days = (end_date - start_date).days + 1
        
        # Schedule mock tests every 7-10 days, starting from day 7
        mock_interval = max(7, total_days // 4)
        mock_days = list(range(7, total_days, mock_interval))
        
        for day_offset in mock_days:
            if day_offset < len(daily_plans):
                # Replace last block with mock test or add if space
                plan = daily_plans[day_offset]
                used = sum(b['duration_minutes'] for b in plan['blocks'])
                
                if used + 180 <= self.minutes_per_day:
                    plan['blocks'].append({
                        'order': len(plan['blocks']),
                        'topic_id': None,
                        'topic_name': 'Mock Test',
                        'block_type': 'mock',
                        'objective': 'mock',
                        'duration_minutes': 180,
                        'description': 'Full-length mock test',
                        'resources': [],
                        'learning_objectives': ['mock_test'],
                    })
                    plan['total_hours'] = round(
                        (used + 180) / 60, 2
                    )
    
    def save_plan_to_database(self, daily_plans: List[Dict[str, Any]]) -> List[StudyPlan]:
        """Save generated plan to database."""
        saved_plans = []
        
        for plan_data in daily_plans:
            plan_date = date.fromisoformat(plan_data['date'])
            
            # Create or update study plan
            study_plan, created = StudyPlan.objects.update_or_create(
                user=self.user,
                exam=self.exam,
                date=plan_date,
                defaults={
                    'total_hours': Decimal(str(plan_data['total_hours'])),
                    'status': 'pending',
                }
            )
            
            # Create study blocks
            StudyBlock.objects.filter(study_plan=study_plan).delete()
            
            for block_data in plan_data['blocks']:
                topic = None
                if block_data['topic_id']:
                    topic = Topic.objects.get(id=block_data['topic_id'])
                
                StudyBlock.objects.create(
                    study_plan=study_plan,
                    topic=topic,
                    block_type=block_data['block_type'],
                    order=block_data['order'],
                    planned_duration=block_data['duration_minutes'],
                    description=block_data['description'],
                    resources=block_data['resources'],
                    learning_objectives=block_data['learning_objectives'],
                )
            
            saved_plans.append(study_plan)
        
        return saved_plans
    
    def regenerate_from_date(self, from_date: date) -> List[Dict[str, Any]]:
        """Regenerate plan from a specific date (for recovery)."""
        return self.generate_full_plan(start_date=from_date)