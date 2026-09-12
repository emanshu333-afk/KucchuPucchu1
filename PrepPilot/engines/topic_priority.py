"""
Topic Priority Engine - Classifies topics into MUST DO, SHOULD DO, IF TIME categories.
"""
import logging
from decimal import Decimal
from typing import List, Dict, Any
from django.db.models import QuerySet

from PrepPilot.models import Topic, Subject

logger = logging.getLogger(__name__)


class TopicPriorityEngine:
    """
    Engine for calculating topic priorities based on multiple factors:
    - Exam importance
    - Topic weightage
    - Student weakness
    - Time required
    - Expected marks/benefit
    - Remaining time
    """
    
    # Weights for priority calculation
    WEIGHTS = {
        'importance': 0.30,
        'weakness': 0.25,
        'weightage': 0.20,
        'difficulty': 0.15,
        'time_factor': 0.10,
    }
    
    IMPORTANCE_SCORES = {
        'critical': 100,
        'high': 75,
        'medium': 50,
        'low': 25,
    }
    
    DIFFICULTY_SCORES = {
        1: 20,  # Very Easy
        2: 40,  # Easy
        3: 60,  # Moderate
        4: 80,  # Hard
        5: 100, # Very Hard
    }
    
    PRIORITY_THRESHOLDS = {
        'must_do': 70,
        'should_do': 40,
        'if_time': 0,
    }
    
    def __init__(self, exam):
        self.exam = exam
        self.days_remaining = exam.days_remaining
        self.total_hours_available = exam.total_study_hours_available
    
    def calculate_priority_for_topic(self, topic: Topic) -> Dict[str, Any]:
        """
        Calculate priority score and category for a single topic.
        """
        # Importance score
        importance_score = self.IMPORTANCE_SCORES.get(topic.importance, 50)
        
        # Weakness score (inverse of current level)
        weakness_score = 100 - topic.current_level
        
        # Weightage score (normalized)
        weightage_score = min(float(topic.weightage) * 2, 100)
        
        # Difficulty score
        difficulty_score = self.DIFFICULTY_SCORES.get(topic.difficulty, 60)
        
        # Time factor (penalize topics that take too long relative to available time)
        hours_ratio = float(topic.estimated_hours) / max(self.total_hours_available, 1)
        time_factor_score = min(hours_ratio * 100, 100)
        # Invert: less time = higher score (easier to fit in)
        time_factor_score = 100 - time_factor_score
        
        # Calculate weighted total
        total_score = (
            importance_score * self.WEIGHTS['importance'] +
            weakness_score * self.WEIGHTS['weakness'] +
            weightage_score * self.WEIGHTS['weightage'] +
            difficulty_score * self.WEIGHTS['difficulty'] +
            time_factor_score * self.WEIGHTS['time_factor']
        )
        
        total_score = round(total_score, 2)
        
        # Determine category
        if total_score >= self.PRIORITY_THRESHOLDS['must_do']:
            priority = 'must_do'
        elif total_score >= self.PRIORITY_THRESHOLDS['should_do']:
            priority = 'should_do'
        else:
            priority = 'if_time'
        
        return {
            'topic_id': str(topic.id),
            'topic_name': topic.name,
            'priority': priority,
            'priority_score': total_score,
            'breakdown': {
                'importance': importance_score,
                'weakness': weakness_score,
                'weightage': weightage_score,
                'difficulty': difficulty_score,
                'time_factor': time_factor_score,
            }
        }
    
    def calculate_all_priorities(self) -> List[Dict[str, Any]]:
        """Calculate priorities for all topics in the exam."""
        topics = Topic.objects.filter(subject__exam=self.exam).select_related('subject')
        results = []
        
        for topic in topics:
            priority_data = self.calculate_priority_for_topic(topic)
            results.append(priority_data)
            
            # Update topic in database
            topic.priority = priority_data['priority']
            topic.priority_score = Decimal(str(priority_data['priority_score']))
            topic.save(update_fields=['priority', 'priority_score'])
        
        # Sort by priority score descending
        results.sort(key=lambda x: x['priority_score'], reverse=True)
        return results
    
    def get_priority_distribution(self) -> Dict[str, int]:
        """Get count of topics in each priority category."""
        topics = Topic.objects.filter(subject__exam=self.exam)
        distribution = {
            'must_do': 0,
            'should_do': 0,
            'if_time': 0,
        }
        for topic in topics:
            distribution[topic.priority] += 1
        return distribution
    
    def get_must_do_topics(self) -> QuerySet:
        """Get all MUST DO topics ordered by priority score."""
        return Topic.objects.filter(
            subject__exam=self.exam,
            priority='must_do'
        ).order_by('-priority_score')
    
    def get_should_do_topics(self) -> QuerySet:
        """Get all SHOULD DO topics ordered by priority score."""
        return Topic.objects.filter(
            subject__exam=self.exam,
            priority='should_do'
        ).order_by('-priority_score')
    
    def get_if_time_topics(self) -> QuerySet:
        """Get all IF TIME topics ordered by priority score."""
        return Topic.objects.filter(
            subject__exam=self.exam,
            priority='if_time'
        ).order_by('-priority_score')