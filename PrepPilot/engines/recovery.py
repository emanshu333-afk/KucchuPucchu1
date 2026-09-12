"""
Recovery/Replanning Engine - Handles schedule recovery when students fall behind.
"""
import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Any, Optional
from django.db.models import QuerySet, Sum
from django.utils import timezone

from PrepPilot.models import (
    User, Exam, Topic, StudyPlan, StudyBlock, RecoveryPlan
)
from PrepPilot.engines.daily_plan import DailyPlanEngine
from PrepPilot.engines.topic_priority import TopicPriorityEngine
from PrepPilot.engines.time_budget import TimeBudgetEngine

logger = logging.getLogger(__name__)


class RecoveryEngine:
    """
    Engine for analyzing delays and generating recovery plans.
    Does NOT simply push everything forward - intelligently replans.
    """
    
    def __init__(self, exam: Exam):
        self.exam = exam
        self.user = exam.user
        self.daily_plan_engine = DailyPlanEngine(exam)
        self.priority_engine = TopicPriorityEngine(exam)
        self.budget_engine = TimeBudgetEngine(exam)
    
    def analyze_progress(self) -> Dict[str, Any]:
        """
        Analyze current progress vs planned schedule.
        Returns hours behind, completion rates, and problem areas.
        """
        today = timezone.now().date()
        
        # Get all past study plans
        past_plans = StudyPlan.objects.filter(
            user=self.user,
            exam=self.exam,
            date__lt=today
        ).order_by('date')
        
        total_planned_hours = sum(float(p.total_hours) for p in past_plans)
        total_completed_hours = 0
        completed_blocks = 0
        total_blocks = 0
        
        topic_completion = {}
        
        for plan in past_plans:
            blocks = plan.blocks.all()
            total_blocks += blocks.count()
            
            for block in blocks:
                if block.status == 'completed':
                    completed_blocks += 1
                    total_completed_hours += block.actual_duration or block.planned_duration
                    if block.topic:
                        topic_id = str(block.topic.id)
                        if topic_id not in topic_completion:
                            topic_completion[topic_id] = {'completed': 0, 'total': 0}
                        topic_completion[topic_id]['completed'] += 1
                if block.topic:
                    topic_id = str(block.topic.id)
                    if topic_id not in topic_completion:
                        topic_completion[topic_id] = {'completed': 0, 'total': 0}
                    topic_completion[topic_id]['total'] += 1
        
        hours_behind = max(0, total_planned_hours - total_completed_hours)
        completion_rate = (completed_blocks / total_blocks * 100) if total_blocks > 0 else 0
        
        # Identify topics that are behind
        behind_topics = []
        for topic_id, data in topic_completion.items():
            if data['total'] > 0:
                rate = (data['completed'] / data['total']) * 100
                if rate < 50:
                    topic = Topic.objects.get(id=topic_id)
                    behind_topics.append({
                        'topic_id': topic_id,
                        'topic_name': topic.name,
                        'priority': topic.priority,
                        'completion_rate': round(rate, 1),
                        'blocks_pending': data['total'] - data['completed'],
                    })
        
        # Sort by priority (must_do first)
        priority_order = {'must_do': 0, 'should_do': 1, 'if_time': 2}
        behind_topics.sort(key=lambda x: (priority_order.get(x['priority'], 3), -x['completion_rate']))
        
        return {
            'total_planned_hours': round(total_planned_hours, 2),
            'total_completed_hours': round(total_completed_hours, 2),
            'hours_behind': round(hours_behind, 2),
            'completion_rate': round(completion_rate, 1),
            'total_blocks': total_blocks,
            'completed_blocks': completed_blocks,
            'behind_topics': behind_topics,
            'days_elapsed': (today - past_plans.first().date).days if past_plans.exists() else 0,
        }
    
    def generate_recovery_plan(self) -> RecoveryPlan:
        """
        Generate a recovery plan based on current delay.
        Determines what to keep, postpone, reduce, or remove.
        """
        analysis = self.analyze_progress()
        hours_behind = analysis['hours_behind']
        
        if hours_behind <= 1:
            # Minor delay - no major recovery needed
            return self._create_minor_recovery(analysis)
        
        # Get remaining topics
        today = timezone.now().date()
        remaining_topics = self._get_remaining_topics(today)
        
        # Categorize actions
        actions = self._determine_recovery_actions(
            remaining_topics,
            hours_behind,
            analysis['behind_topics']
        )
        
        # Generate new schedule
        new_plan = self.daily_plan_engine.regenerate_from_date(today)
        
        # Create recovery plan record
        recovery_plan = RecoveryPlan.objects.create(
            user=self.user,
            exam=self.exam,
            trigger_reason=self._generate_trigger_reason(analysis),
            hours_behind=Decimal(str(hours_behind)),
            priority_topics_moved_forward=actions['priority_moved_forward'],
            low_priority_topics_postponed=actions['low_priority_postponed'],
            optional_topics_removed=actions['optional_removed'],
            additional_revision_hours=Decimal(str(actions['additional_revision_hours'])),
            mock_tests_rescheduled=actions['mock_tests_rescheduled'],
            new_study_plan=new_plan,
        )
        
        return recovery_plan
    
    def _get_remaining_topics(self, from_date: date) -> QuerySet:
        """Get topics not yet completed."""
        completed_topic_ids = StudyBlock.objects.filter(
            study_plan__user=self.user,
            study_plan__exam=self.exam,
            study_plan__date__gte=from_date,
            status='completed',
            topic__isnull=False
        ).values_list('topic_id', flat=True).distinct()
        
        return Topic.objects.filter(
            subject__exam=self.exam
        ).exclude(id__in=completed_topic_ids).order_by('-priority_score')
    
    def _determine_recovery_actions(
        self,
        remaining_topics: QuerySet,
        hours_behind: float,
        behind_topics: List[Dict]
    ) -> Dict[str, Any]:
        """
        Determine what to keep, postpone, reduce, or remove.
        """
        # Separate by priority
        must_do = [t for t in remaining_topics if t.priority == 'must_do']
        should_do = [t for t in remaining_topics if t.priority == 'should_do']
        if_time = [t for t in remaining_topics if t.priority == 'if_time']
        
        # Calculate available hours
        days_remaining = self.exam.days_remaining
        hours_per_day = float(self.user.preferred_study_hours_per_day)
        available_hours = days_remaining * hours_per_day
        
        # Calculate required hours for each priority
        must_do_hours = sum(float(t.estimated_hours) for t in must_do)
        should_do_hours = sum(float(t.estimated_hours) for t in should_do)
        if_time_hours = sum(float(t.estimated_hours) for t in if_time)
        
        total_required = must_do_hours + should_do_hours + if_time_hours
        deficit = total_required - available_hours
        
        actions = {
            'priority_moved_forward': [],
            'low_priority_postponed': [],
            'optional_removed': [],
            'additional_revision_hours': 0,
            'mock_tests_rescheduled': [],
        }
        
        # Always keep MUST DO topics
        for topic in must_do:
            actions['priority_moved_forward'].append({
                'topic_id': str(topic.id),
                'topic_name': topic.name,
                'reason': 'High priority - must complete for exam readiness',
            })
        
        # Handle deficit
        if deficit > 0:
            # First, postpone IF TIME topics
            if_time_sorted = sorted(if_time, key=lambda t: float(t.priority_score))
            postponed_hours = 0
            
            for topic in if_time_sorted:
                if postponed_hours >= deficit:
                    break
                actions['optional_removed'].append({
                    'topic_id': str(topic.id),
                    'topic_name': topic.name,
                    'reason': 'Low priority - removed to fit schedule',
                    'estimated_hours': float(topic.estimated_hours),
                })
                postponed_hours += float(topic.estimated_hours)
            
            # If still deficit, postpone SHOULD DO topics
            remaining_deficit = deficit - postponed_hours
            if remaining_deficit > 0:
                should_do_sorted = sorted(should_do, key=lambda t: float(t.priority_score))
                for topic in should_do_sorted:
                    if remaining_deficit <= 0:
                        break
                    actions['low_priority_postponed'].append({
                        'topic_id': str(topic.id),
                        'topic_name': topic.name,
                        'reason': 'Postponed due to time constraints',
                        'estimated_hours': float(topic.estimated_hours),
                    })
                    remaining_deficit -= float(topic.estimated_hours)
        
        # Add revision time for weak areas
        weak_topics = [t for t in behind_topics if t['priority'] in ['must_do', 'should_do']]
        if weak_topics:
            actions['additional_revision_hours'] = min(len(weak_topics) * 0.5, 3)
        
        return actions
    
    def _generate_trigger_reason(self, analysis: Dict) -> str:
        """Generate human-readable trigger reason."""
        hours = analysis['hours_behind']
        rate = analysis['completion_rate']
        
        if hours > 10:
            severity = "significantly"
        elif hours > 5:
            severity = "moderately"
        else:
            severity = "slightly"
        
        return (
            f"You are {severity} behind schedule by {hours:.1f} hours. "
            f"Overall completion rate: {rate:.1f}%. "
            f"{len(analysis['behind_topics'])} topics need attention."
        )
    
    def _create_minor_recovery(self, analysis: Dict) -> RecoveryPlan:
        """Create a minor recovery plan for small delays."""
        recovery_plan = RecoveryPlan.objects.create(
            user=self.user,
            exam=self.exam,
            trigger_reason=f"Minor delay of {analysis['hours_behind']:.1f} hours. Adjusting schedule slightly.",
            hours_behind=Decimal(str(analysis['hours_behind'])),
            priority_topics_moved_forward=[],
            low_priority_topics_postponed=[],
            optional_topics_removed=[],
            additional_revision_hours=Decimal('0.5'),
            mock_tests_rescheduled=[],
            new_study_plan=self.daily_plan_engine.regenerate_from_date(timezone.now().date()),
        )
        return recovery_plan
    
    def apply_recovery_plan(self, recovery_plan: RecoveryPlan) -> Dict[str, Any]:
        """
        Apply the recovery plan - update database with new schedule.
        """
        # Delete future study plans
        today = timezone.now().date()
        StudyPlan.objects.filter(
            user=self.user,
            exam=self.exam,
            date__gte=today
        ).delete()
        
        # Save new study plans
        new_plans = self.daily_plan_engine.save_plan_to_database(
            recovery_plan.new_study_plan
        )
        
        # Mark recovery plan as applied
        recovery_plan.is_applied = True
        recovery_plan.applied_at = timezone.now()
        recovery_plan.save(update_fields=['is_applied', 'applied_at'])
        
        return {
            'success': True,
            'plans_created': len(new_plans),
            'message': 'Recovery plan applied successfully. New schedule generated.',
        }
    
    def get_recovery_options(self) -> List[Dict[str, Any]]:
        """
        Get multiple recovery options for user to choose from.
        """
        analysis = self.analyze_progress()
        hours_behind = analysis['hours_behind']
        
        options = []
        
        # Option 1: Standard recovery (current algorithm)
        standard = self.generate_recovery_plan()
        options.append({
            'id': 'standard',
            'name': 'Smart Recovery (Recommended)',
            'description': 'AI optimizes by prioritizing high-value topics, postponing low-priority ones',
            'hours_recovered': hours_behind,
            'topics_affected': len(standard.optional_topics_removed) + len(standard.low_priority_topics_postponed),
            'plan': standard,
        })
        
        # Option 2: Intensive recovery (increase study hours)
        intensive = self._generate_intensive_recovery(hours_behind)
        options.append({
            'id': 'intensive',
            'name': 'Intensive Recovery',
            'description': 'Increase daily study hours to catch up without dropping topics',
            'additional_hours_per_day': intensive['additional_hours'],
            'new_daily_hours': intensive['new_daily_hours'],
            'plan': intensive['plan'],
        })
        
        # Option 3: Minimal recovery (just push forward)
        minimal = self._generate_minimal_recovery(hours_behind)
        options.append({
            'id': 'minimal',
            'name': 'Minimal Adjustment',
            'description': 'Push unfinished tasks forward, extend schedule if possible',
            'days_extended': minimal['days_extended'],
            'plan': minimal['plan'],
        })
        
        return options
    
    def _generate_intensive_recovery(self, hours_behind: float) -> Dict[str, Any]:
        """Generate recovery plan with increased study hours."""
        days_remaining = self.exam.days_remaining
        current_hours = float(self.user.preferred_study_hours_per_day)
        additional_hours = min(hours_behind / days_remaining, 3)  # Max 3 extra hours
        new_hours = current_hours + additional_hours
        
        # Recalculate budget with new hours
        self.budget_engine.recalculate_on_hours_change(new_hours)
        
        # Generate new plan
        new_plan = self.daily_plan_engine.generate_full_plan()
        
        return {
            'additional_hours': round(additional_hours, 1),
            'new_daily_hours': round(new_hours, 1),
            'plan': new_plan,
        }
    
    def _generate_minimal_recovery(self, hours_behind: float) -> Dict[str, Any]:
        """Generate minimal recovery - just push forward."""
        days_remaining = self.exam.days_remaining
        current_hours = float(self.user.preferred_study_hours_per_day)
        
        # Calculate how many extra days needed
        extra_days = int(hours_behind / current_hours) + 1
        extended_date = self.exam.exam_date + timedelta(days=extra_days)
        
        # Note: This would require exam date change which may not be possible
        # So we just compress the schedule
        new_plan = self.daily_plan_engine.generate_full_plan()
        
        return {
            'days_extended': extra_days,
            'extended_exam_date': extended_date.isoformat(),
            'plan': new_plan,
        }