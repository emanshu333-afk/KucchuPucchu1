"""
Time Budget Engine - Allocates study time as a limited resource across subjects and topics.
"""
import logging
from decimal import Decimal
from typing import Dict, List, Any
from django.db.models import QuerySet, Sum

from PrepPilot.models import Exam, Subject, Topic, User

logger = logging.getLogger(__name__)


class TimeBudgetEngine:
    """
    Engine for allocating study time across subjects and topics.
    Treats remaining study time as a limited resource budget.
    """
    
    # Time allocation ratios
    REVISION_RATIO = 0.10      # 10% for revision
    MOCK_TEST_RATIO = 0.10     # 10% for mock tests + analysis
    BUFFER_RATIO = 0.05        # 5% buffer for unexpected delays
    
    def __init__(self, exam: Exam):
        self.exam = exam
        self.user = exam.user
        self.days_remaining = exam.days_remaining
        self.hours_per_day = float(self.user.preferred_study_hours_per_day)
        self.total_hours = self.days_remaining * self.hours_per_day
    
    def calculate_total_budget(self) -> Dict[str, float]:
        """Calculate the total time budget breakdown."""
        study_hours = self.total_hours * (1 - self.REVISION_RATIO - self.MOCK_TEST_RATIO - self.BUFFER_RATIO)
        revision_hours = self.total_hours * self.REVISION_RATIO
        mock_test_hours = self.total_hours * self.MOCK_TEST_RATIO
        buffer_hours = self.total_hours * self.BUFFER_RATIO
        
        return {
            'total_hours': round(self.total_hours, 2),
            'study_hours': round(study_hours, 2),
            'revision_hours': round(revision_hours, 2),
            'mock_test_hours': round(mock_test_hours, 2),
            'buffer_hours': round(buffer_hours, 2),
        }
    
    def allocate_subject_hours(self) -> Dict[str, Any]:
        """
        Allocate study hours to subjects based on:
        - Subject weightage
        - Current preparation level (inverse)
        - Topic count and difficulty
        """
        subjects = Subject.objects.filter(exam=self.exam)
        budget = self.calculate_total_budget()
        available_study_hours = budget['study_hours']
        
        # Calculate allocation weights for each subject
        subject_weights = {}
        total_weight = 0
        
        for subject in subjects:
            # Weight factors
            weightage_factor = float(subject.weightage) if subject.weightage > 0 else 100 / subjects.count()
            
            # Inverse preparation level (weaker subjects get more time)
            prep_factor = (100 - subject.preparation_level) / 100
            prep_factor = max(prep_factor, 0.3)  # Minimum 30% weight
            
            # Topic complexity factor
            topics = Topic.objects.filter(subject=subject)
            avg_difficulty = topics.aggregate(avg=models.Avg('difficulty'))['avg'] or 3
            difficulty_factor = avg_difficulty / 5  # Normalize to 0-1
            
            # Combined weight
            weight = weightage_factor * 0.4 + prep_factor * 0.4 + difficulty_factor * 0.2
            subject_weights[subject.id] = weight
            total_weight += weight
        
        # Allocate hours proportionally
        allocations = {}
        for subject in subjects:
            weight = subject_weights[subject.id]
            allocated = (weight / total_weight) * available_study_hours if total_weight > 0 else 0
            allocations[str(subject.id)] = {
                'subject_id': str(subject.id),
                'subject_name': subject.name,
                'allocated_hours': round(allocated, 2),
                'weightage': float(subject.weightage),
                'preparation_level': subject.preparation_level,
                'topic_count': Topic.objects.filter(subject=subject).count(),
            }
            
            # Update subject in database
            subject.allocated_hours = Decimal(str(round(allocated, 2)))
            subject.save(update_fields=['allocated_hours'])
        
        return {
            'budget': budget,
            'allocations': allocations,
        }
    
    def allocate_topic_hours(self, subject: Subject) -> List[Dict[str, Any]]:
        """
        Allocate hours to topics within a subject based on priority.
        """
        topics = Topic.objects.filter(subject=subject).order_by('-priority_score')
        subject_allocated = float(subject.allocated_hours)
        
        # Calculate priority-based weights
        topic_weights = {}
        total_priority_score = sum(float(t.priority_score) for t in topics) or 1
        
        for topic in topics:
            topic_weights[topic.id] = float(topic.priority_score) / total_priority_score
        
        # Allocate hours
        allocations = []
        for topic in topics:
            weight = topic_weights[topic.id]
            allocated = subject_allocated * weight
            
            # Ensure minimum time for must-do topics
            if topic.priority == 'must_do' and allocated < 2:
                allocated = 2
            
            allocations.append({
                'topic_id': str(topic.id),
                'topic_name': topic.name,
                'priority': topic.priority,
                'priority_score': float(topic.priority_score),
                'allocated_hours': round(allocated, 2),
                'estimated_hours': float(topic.estimated_hours),
                'difficulty': topic.difficulty,
            })
        
        return allocations
    
    def recalculate_on_hours_change(self, new_hours_per_day: float) -> Dict[str, Any]:
        """
        Recalculate entire budget when available hours per day changes.
        """
        old_hours_per_day = self.hours_per_day
        self.hours_per_day = new_hours_per_day
        self.total_hours = self.days_remaining * self.hours_per_day
        
        # Update user preference
        self.user.preferred_study_hours_per_day = Decimal(str(new_hours_per_day))
        self.user.save(update_fields=['preferred_study_hours_per_day'])
        
        # Recalculate allocations
        result = self.allocate_subject_hours()
        result['change_summary'] = {
            'old_hours_per_day': old_hours_per_day,
            'new_hours_per_day': new_hours_per_day,
            'old_total_hours': old_hours_per_day * self.days_remaining,
            'new_total_hours': self.total_hours,
            'difference': round(self.total_hours - (old_hours_per_day * self.days_remaining), 2),
        }
        
        return result
    
    def get_daily_budget(self) -> Dict[str, float]:
        """Get daily time budget breakdown."""
        budget = self.calculate_total_budget()
        return {
            'daily_total_hours': self.hours_per_day,
            'daily_study_hours': round(budget['study_hours'] / self.days_remaining, 2) if self.days_remaining > 0 else 0,
            'daily_revision_hours': round(budget['revision_hours'] / self.days_remaining, 2) if self.days_remaining > 0 else 0,
        }
    
    def check_feasibility(self) -> Dict[str, Any]:
        """Check if the current plan is feasible with remaining time."""
        topics = Topic.objects.filter(subject__exam=self.exam)
        total_estimated_hours = sum(float(t.estimated_hours) for t in topics)
        budget = self.calculate_total_budget()
        
        feasible = total_estimated_hours <= budget['study_hours']
        coverage_ratio = budget['study_hours'] / max(total_estimated_hours, 1)
        
        return {
            'feasible': feasible,
            'total_estimated_hours': round(total_estimated_hours, 2),
            'available_study_hours': budget['study_hours'],
            'coverage_ratio': round(coverage_ratio, 2),
            'deficit_hours': round(max(0, total_estimated_hours - budget['study_hours']), 2),
            'recommendation': self._get_feasibility_recommendation(feasible, coverage_ratio),
        }
    
    def _get_feasibility_recommendation(self, feasible: bool, coverage_ratio: float) -> str:
        if feasible:
            return "Plan is feasible. You have sufficient time to cover all topics."
        elif coverage_ratio >= 0.8:
            return "Plan is tight. Consider reducing optional topics or increasing study hours."
        elif coverage_ratio >= 0.6:
            return "Plan is challenging. Focus on MUST DO topics only. Consider skipping IF TIME topics."
        else:
            return "Plan is not feasible. Significantly reduce scope or increase daily study hours."