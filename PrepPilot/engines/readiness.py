"""
Exam Readiness Score Engine - Calculates meaningful readiness score based on multiple factors.
"""
import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Any
from django.db.models import QuerySet, Avg, Count
from django.utils import timezone

from PrepPilot.models import (
    User, Exam, Topic, Subject, TopicPerformance, MockTest, ReadinessScore
)

logger = logging.getLogger(__name__)


class ReadinessEngine:
    """
    Engine for calculating exam readiness score.
    Goes beyond simple syllabus completion to measure actual preparedness.
    """
    
    # Weights for different components
    WEIGHTS = {
        'syllabus_coverage': 0.20,
        'topic_mastery': 0.25,
        'practice_accuracy': 0.20,
        'mock_performance': 0.20,
        'revision_frequency': 0.10,
        'weak_areas_penalty': -0.10,  # Negative weight
        'time_pressure_factor': 0.05,
    }
    
    def __init__(self, exam: Exam):
        self.exam = exam
        self.user = exam.user
    
    def calculate_readiness(self) -> ReadinessScore:
        """
        Calculate comprehensive readiness score and save to database.
        """
        # Calculate component scores
        syllabus_coverage = self._calculate_syllabus_coverage()
        topic_mastery = self._calculate_topic_mastery()
        practice_accuracy = self._calculate_practice_accuracy()
        mock_performance = self._calculate_mock_performance()
        revision_frequency = self._calculate_revision_frequency()
        weak_areas_penalty = self._calculate_weak_areas_penalty()
        time_pressure_factor = self._calculate_time_pressure_factor()
        
        # Calculate weighted overall score
        overall_score = (
            syllabus_coverage * self.WEIGHTS['syllabus_coverage'] +
            topic_mastery * self.WEIGHTS['topic_mastery'] +
            practice_accuracy * self.WEIGHTS['practice_accuracy'] +
            mock_performance * self.WEIGHTS['mock_performance'] +
            revision_frequency * self.WEIGHTS['revision_frequency'] +
            weak_areas_penalty * self.WEIGHTS['weak_areas_penalty'] +
            time_pressure_factor * self.WEIGHTS['time_pressure_factor']
        )
        
        overall_score = max(0, min(100, round(overall_score, 2)))
        
        # Generate explanation and recommendations
        explanation = self._generate_explanation({
            'syllabus_coverage': syllabus_coverage,
            'topic_mastery': topic_mastery,
            'practice_accuracy': practice_accuracy,
            'mock_performance': mock_performance,
            'revision_frequency': revision_frequency,
            'weak_areas_penalty': weak_areas_penalty,
            'time_pressure_factor': time_pressure_factor,
        })
        
        recommendations = self._generate_recommendations({
            'syllabus_coverage': syllabus_coverage,
            'topic_mastery': topic_mastery,
            'practice_accuracy': practice_accuracy,
            'mock_performance': mock_performance,
            'revision_frequency': revision_frequency,
            'weak_areas_penalty': weak_areas_penalty,
        })
        
        # Save to database
        readiness_score = ReadinessScore.objects.create(
            user=self.user,
            exam=self.exam,
            overall_score=Decimal(str(overall_score)),
            syllabus_coverage=Decimal(str(syllabus_coverage)),
            topic_mastery=Decimal(str(topic_mastery)),
            practice_accuracy=Decimal(str(practice_accuracy)),
            mock_performance=Decimal(str(mock_performance)),
            revision_frequency=Decimal(str(revision_frequency)),
            weak_areas_penalty=Decimal(str(abs(weak_areas_penalty))),
            time_pressure_factor=Decimal(str(time_pressure_factor)),
            explanation=explanation,
            recommendations=recommendations,
        )
        
        return readiness_score
    
    def _calculate_syllabus_coverage(self) -> float:
        """Calculate percentage of syllabus covered."""
        topics = Topic.objects.filter(subject__exam=self.exam)
        total_topics = topics.count()
        
        if total_topics == 0:
            return 0.0
        
        # Count topics with some progress
        covered_topics = topics.filter(current_level__gt=0).count()
        
        return round((covered_topics / total_topics) * 100, 2)
    
    def _calculate_topic_mastery(self) -> float:
        """Calculate average mastery level across all topics."""
        topics = Topic.objects.filter(subject__exam=self.exam)
        
        if not topics.exists():
            return 0.0
        
        # Weight by topic importance
        total_weight = 0
        weighted_sum = 0
        
        importance_weights = {
            'critical': 4,
            'high': 3,
            'medium': 2,
            'low': 1,
        }
        
        for topic in topics:
            weight = importance_weights.get(topic.importance, 2)
            total_weight += weight
            weighted_sum += topic.current_level * weight
        
        return round(weighted_sum / total_weight, 2) if total_weight > 0 else 0.0
    
    def _calculate_practice_accuracy(self) -> float:
        """Calculate overall practice accuracy across all topics."""
        performances = TopicPerformance.objects.filter(
            user=self.user,
            topic__subject__exam=self.exam
        )
        
        if not performances.exists():
            return 0.0
        
        total_attempted = sum(p.questions_attempted for p in performances)
        total_correct = sum(p.questions_correct for p in performances)
        
        if total_attempted == 0:
            return 0.0
        
        return round((total_correct / total_attempted) * 100, 2)
    
    def _calculate_mock_performance(self) -> float:
        """Calculate average mock test performance."""
        mock_tests = MockTest.objects.filter(
            user=self.user,
            exam=self.exam,
            status='completed'
        )
        
        if not mock_tests.exists():
            return 50.0  # Neutral score if no mocks taken
        
        avg_percentage = mock_tests.aggregate(avg=Avg('percentage'))['avg'] or 0
        return round(float(avg_percentage), 2)
    
    def _calculate_revision_frequency(self) -> float:
        """Calculate revision frequency score."""
        topics = Topic.objects.filter(subject__exam=self.exam)
        
        if not topics.exists():
            return 0.0
        
        # Check how many topics have been revised recently
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_revisions = topics.filter(
            performances__last_practiced__gte=thirty_days_ago
        ).distinct().count()
        
        total_topics = topics.count()
        
        if total_topics == 0:
            return 0.0
        
        # Score based on proportion of topics revised in last 30 days
        return round((recent_revisions / total_topics) * 100, 2)
    
    def _calculate_weak_areas_penalty(self) -> float:
        """Calculate penalty for weak high-weightage topics."""
        # Find high-weightage topics with low mastery
        weak_critical = Topic.objects.filter(
            subject__exam=self.exam,
            importance__in=['critical', 'high'],
            current_level__lt=50
        )
        
        penalty = 0
        for topic in weak_critical:
            weight_factor = float(topic.weightage) / 100 if topic.weightage > 0 else 0.1
            weakness = (50 - topic.current_level) / 50
            penalty += weight_factor * weakness * 10
        
        return round(min(penalty, 30), 2)  # Cap penalty at 30 points
    
    def _calculate_time_pressure_factor(self) -> float:
        """Calculate factor based on remaining time vs required time."""
        days_remaining = self.exam.days_remaining
        
        if days_remaining <= 0:
            return 0.0
        
        # Estimate days needed for remaining topics
        remaining_topics = Topic.objects.filter(
            subject__exam=self.exam,
            is_completed=False
        )
        
        total_hours_needed = sum(float(t.estimated_hours) for t in remaining_topics)
        hours_per_day = float(self.user.preferred_study_hours_per_day)
        days_needed = total_hours_needed / max(hours_per_day, 1)
        
        if days_needed <= 0:
            return 100.0
        
        ratio = days_remaining / days_needed
        
        if ratio >= 1.5:
            return 100.0
        elif ratio >= 1.0:
            return 80.0
        elif ratio >= 0.7:
            return 60.0
        elif ratio >= 0.5:
            return 40.0
        else:
            return 20.0
    
    def _generate_explanation(self, scores: Dict[str, float]) -> str:
        """Generate human-readable explanation of the readiness score."""
        parts = []
        
        if scores['syllabus_coverage'] >= 80:
            parts.append(f"Syllabus coverage is strong at {scores['syllabus_coverage']:.0f}%.")
        elif scores['syllabus_coverage'] >= 50:
            parts.append(f"Syllabus coverage is moderate at {scores['syllabus_coverage']:.0f}%.")
        else:
            parts.append(f"Syllabus coverage is low at {scores['syllabus_coverage']:.0f}%.")
        
        if scores['topic_mastery'] >= 70:
            parts.append("Topic mastery is good.")
        elif scores['topic_mastery'] >= 50:
            parts.append("Topic mastery is moderate.")
        else:
            parts.append("Topic mastery needs improvement.")
        
        if scores['practice_accuracy'] >= 75:
            parts.append(f"Practice accuracy is strong at {scores['practice_accuracy']:.0f}%.")
        elif scores['practice_accuracy'] >= 50:
            parts.append(f"Practice accuracy is {scores['practice_accuracy']:.0f}%.")
        else:
            parts.append(f"Practice accuracy is low at {scores['practice_accuracy']:.0f}%.")
        
        if scores['mock_performance'] > 0:
            parts.append(f"Mock test average: {scores['mock_performance']:.0f}%.")
        
        if scores['weak_areas_penalty'] > 10:
            parts.append(
                f"Readiness limited by {scores['weak_areas_penalty']:.0f} points "
                f"due to weak performance in high-weightage topics."
            )
        
        if scores['time_pressure_factor'] < 50:
            parts.append("Time pressure is high - remaining time may be insufficient.")
        
        return " ".join(parts)
    
    def _generate_recommendations(self, scores: Dict[str, float]) -> List[str]:
        """Generate actionable recommendations based on scores."""
        recommendations = []
        
        if scores['syllabus_coverage'] < 70:
            recommendations.append(
                "Focus on completing remaining syllabus topics, prioritizing MUST DO items."
            )
        
        if scores['topic_mastery'] < 60:
            recommendations.append(
                "Spend more time on deep understanding rather than just coverage."
            )
        
        if scores['practice_accuracy'] < 65:
            recommendations.append(
                "Increase practice questions. Focus on weak topics identified in performance."
            )
        
        if scores['mock_performance'] < 60 and scores['mock_performance'] > 0:
            recommendations.append(
                "Take more mock tests and analyze mistakes thoroughly."
            )
        elif scores['mock_performance'] == 0:
            recommendations.append(
                "Schedule and take at least 2-3 full-length mock tests before the exam."
            )
        
        if scores['revision_frequency'] < 50:
            recommendations.append(
                "Implement spaced revision. Review completed topics weekly."
            )
        
        if scores['weak_areas_penalty'] > 10:
            recommendations.append(
                "Dedicate extra time to weak high-weightage topics. "
                "Use targeted resources and seek help if needed."
            )
        
        if scores['time_pressure_factor'] < 50:
            recommendations.append(
                "Consider increasing daily study hours or dropping IF TIME topics."
            )
        
        if not recommendations:
            recommendations.append(
                "Maintain current pace. Focus on mock tests and revision."
            )
        
        return recommendations
    
    def get_readiness_trend(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get readiness score trend over time."""
        cutoff = timezone.now() - timedelta(days=days)
        scores = ReadinessScore.objects.filter(
            user=self.user,
            exam=self.exam,
            calculated_at__gte=cutoff
        ).order_by('calculated_at')
        
        return [
            {
                'date': s.calculated_at.date().isoformat(),
                'overall_score': float(s.overall_score),
                'components': {
                    'syllabus_coverage': float(s.syllabus_coverage),
                    'topic_mastery': float(s.topic_mastery),
                    'practice_accuracy': float(s.practice_accuracy),
                    'mock_performance': float(s.mock_performance),
                }
            }
            for s in scores
        ]