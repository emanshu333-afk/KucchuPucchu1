"""
What-If Simulator Engine - Allows students to test different scenarios.
"""
import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Any, Optional
from django.db.models import QuerySet
from django.utils import timezone

from PrepPilot.models import (
    User, Exam, Topic, Subject, WhatIfScenario, StudyPlan
)
from PrepPilot.engines.topic_priority import TopicPriorityEngine
from PrepPilot.engines.time_budget import TimeBudgetEngine
from PrepPilot.engines.daily_plan import DailyPlanEngine
from PrepPilot.engines.readiness import ReadinessEngine

logger = logging.getLogger(__name__)


class WhatIfEngine:
    """
    Engine for simulating different study scenarios.
    Allows students to test "what if" questions and see projected outcomes.
    """
    
    SCENARIO_TYPES = {
        'hours_change': 'Study Hours Change',
        'topic_skip': 'Skip Topics',
        'subject_focus': 'Subject Focus',
        'deadline_change': 'Deadline Change',
        'custom': 'Custom Scenario',
    }
    
    def __init__(self, exam: Exam):
        self.exam = exam
        self.user = exam.user
        self.priority_engine = TopicPriorityEngine(exam)
        self.budget_engine = TimeBudgetEngine(exam)
        self.daily_plan_engine = DailyPlanEngine(exam)
        self.readiness_engine = ReadinessEngine(exam)
    
    def simulate_hours_change(self, new_hours_per_day: float) -> Dict[str, Any]:
        """
        Simulate: "What if I can only study X hours/day?"
        """
        original_hours = float(self.user.preferred_study_hours_per_day)
        original_total = self.exam.days_remaining * original_hours
        new_total = self.exam.days_remaining * new_hours_per_day
        
        # Recalculate budget
        budget_result = self.budget_engine.recalculate_on_hours_change(new_hours_per_day)
        budget = budget_result['budget']
        
        # Check feasibility
        feasibility = self.budget_engine.check_feasibility()
        
        # Generate new plan
        new_plan = self.daily_plan_engine.generate_full_plan()
        
        # Calculate projected readiness
        projected_readiness = self._estimate_readiness(new_plan, budget)
        
        return {
            'scenario_type': 'hours_change',
            'parameters': {
                'original_hours_per_day': original_hours,
                'new_hours_per_day': new_hours_per_day,
            },
            'original_total_hours': round(original_total, 2),
            'new_total_hours': round(new_total, 2),
            'difference': round(new_total - original_total, 2),
            'budget': budget,
            'feasibility': feasibility,
            'projected_readiness': projected_readiness,
            'new_plan_preview': new_plan[:7],  # First week preview
            'recommendations': self._generate_hours_recommendations(
                original_hours, new_hours_per_day, feasibility
            ),
        }
    
    def simulate_topic_skip(self, topic_ids: List[str]) -> Dict[str, Any]:
        """
        Simulate: "What if I skip these topics?"
        """
        topics_to_skip = Topic.objects.filter(id__in=topic_ids)
        skipped_hours = sum(float(t.estimated_hours) for t in topics_to_skip)
        skipped_weightage = sum(float(t.weightage) for t in topics_to_skip)
        
        # Get remaining topics
        remaining_topics = Topic.objects.filter(
            subject__exam=self.exam
        ).exclude(id__in=topic_ids)
        
        remaining_hours = sum(float(t.estimated_hours) for t in remaining_topics)
        remaining_weightage = sum(float(t.weightage) for t in remaining_topics)
        
        # Check if remaining fits in budget
        budget = self.budget_engine.calculate_total_budget()
        feasible = remaining_hours <= budget['study_hours']
        
        # Calculate impact on readiness
        current_readiness = self.readiness_engine.calculate_readiness()
        
        # Estimate readiness without skipped topics
        # Penalty for skipping weightage
        weightage_penalty = min(skipped_weightage * 0.5, 20)
        projected_readiness = max(0, float(current_readiness.overall_score) - weightage_penalty)
        
        # Generate plan without skipped topics
        new_plan = self._generate_plan_without_topics(topic_ids)
        
        return {
            'scenario_type': 'topic_skip',
            'parameters': {
                'skipped_topic_ids': topic_ids,
                'skipped_count': len(topic_ids),
            },
            'skipped_hours': round(skipped_hours, 2),
            'skipped_weightage': round(skipped_weightage, 2),
            'remaining_hours': round(remaining_hours, 2),
            'remaining_weightage': round(remaining_weightage, 2),
            'feasible': feasible,
            'projected_readiness': round(projected_readiness, 2),
            'readiness_impact': round(projected_readiness - float(current_readiness.overall_score), 2),
            'new_plan_preview': new_plan[:7],
            'recommendations': self._generate_skip_recommendations(
                topics_to_skip, feasible, weightage_penalty
            ),
        }
    
    def simulate_subject_focus(
        self,
        subject_id: str,
        focus_days: int
    ) -> Dict[str, Any]:
        """
        Simulate: "What if I spend next X days only on this subject?"
        """
        subject = Subject.objects.get(id=subject_id)
        subject_topics = Topic.objects.filter(subject=subject, is_completed=False)
        
        # Calculate hours available in focus period
        focus_hours = focus_days * float(self.user.preferred_study_hours_per_day)
        subject_hours_needed = sum(float(t.estimated_hours) for t in subject_topics)
        
        # What happens to other subjects
        other_subjects = Subject.objects.filter(exam=self.exam).exclude(id=subject_id)
        other_topics = Topic.objects.filter(subject__in=other_subjects, is_completed=False)
        other_hours_needed = sum(float(t.estimated_hours) for t in other_topics)
        
        # Remaining days after focus
        remaining_days = self.exam.days_remaining - focus_days
        remaining_hours = remaining_days * float(self.user.preferred_study_hours_per_day)
        
        # Can other topics fit in remaining time?
        other_feasible = other_hours_needed <= remaining_hours
        
        # Projected readiness
        subject_boost = min(20, (focus_hours / max(subject_hours_needed, 1)) * 30)
        other_penalty = 0 if other_feasible else 15
        
        current_readiness = self.readiness_engine.calculate_readiness()
        projected_readiness = float(current_readiness.overall_score) + subject_boost - other_penalty
        projected_readiness = max(0, min(100, projected_readiness))
        
        return {
            'scenario_type': 'subject_focus',
            'parameters': {
                'subject_id': subject_id,
                'subject_name': subject.name,
                'focus_days': focus_days,
            },
            'focus_hours': round(focus_hours, 2),
            'subject_hours_needed': round(subject_hours_needed, 2),
            'subject_coverage_after': round(min(100, (focus_hours / max(subject_hours_needed, 1)) * 100), 1),
            'remaining_days': remaining_days,
            'remaining_hours': round(remaining_hours, 2),
            'other_hours_needed': round(other_hours_needed, 2),
            'other_feasible': other_feasible,
            'projected_readiness': round(projected_readiness, 2),
            'readiness_impact': round(projected_readiness - float(current_readiness.overall_score), 2),
            'recommendations': self._generate_focus_recommendations(
                subject, focus_days, other_feasible, subject_boost, other_penalty
            ),
        }
    
    def simulate_deadline_change(self, new_exam_date: date) -> Dict[str, Any]:
        """
        Simulate: "What if my exam date changes to X?"
        """
        original_date = self.exam.exam_date
        original_days = self.exam.days_remaining
        
        if new_exam_date <= timezone.now().date():
            return {
                'error': 'New exam date must be in the future',
                'scenario_type': 'deadline_change',
            }
        
        new_days = (new_exam_date - timezone.now().date()).days
        days_difference = new_days - original_days
        
        # Recalculate with new days
        original_hours_per_day = float(self.user.preferred_study_hours_per_day)
        new_total_hours = new_days * original_hours_per_day
        original_total_hours = original_days * original_hours_per_day
        
        # Feasibility
        budget = self.budget_engine.calculate_total_budget()
        # Temporarily adjust days_remaining for feasibility check
        self.exam.exam_date = new_exam_date
        feasibility = self.budget_engine.check_feasibility()
        self.exam.exam_date = original_date  # Restore
        
        # Projected readiness
        time_factor_change = (new_days / max(original_days, 1) - 1) * 20
        current_readiness = self.readiness_engine.calculate_readiness()
        projected_readiness = float(current_readiness.overall_score) + time_factor_change
        projected_readiness = max(0, min(100, projected_readiness))
        
        return {
            'scenario_type': 'deadline_change',
            'parameters': {
                'original_date': original_date.isoformat(),
                'new_date': new_exam_date.isoformat(),
            },
            'days_difference': days_difference,
            'original_days': original_days,
            'new_days': new_days,
            'original_total_hours': round(original_total_hours, 2),
            'new_total_hours': round(new_total_hours, 2),
            'hours_difference': round(new_total_hours - original_total_hours, 2),
            'feasibility': feasibility,
            'projected_readiness': round(projected_readiness, 2),
            'readiness_impact': round(projected_readiness - float(current_readiness.overall_score), 2),
            'recommendations': self._generate_deadline_recommendations(
                days_difference, feasibility
            ),
        }
    
    def simulate_custom_scenario(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulate a custom scenario with multiple parameter changes.
        """
        # This is a flexible simulator that can combine multiple changes
        # For now, implement a basic version
        
        results = {}
        
        if 'hours_per_day' in parameters:
            results['hours_change'] = self.simulate_hours_change(parameters['hours_per_day'])
        
        if 'skip_topics' in parameters:
            results['topic_skip'] = self.simulate_topic_skip(parameters['skip_topics'])
        
        if 'focus_subject' in parameters:
            results['subject_focus'] = self.simulate_subject_focus(
                parameters['focus_subject']['subject_id'],
                parameters['focus_subject']['days']
            )
        
        if 'new_exam_date' in parameters:
            from datetime import date
            new_date = date.fromisoformat(parameters['new_exam_date'])
            results['deadline_change'] = self.simulate_deadline_change(new_date)
        
        # Combine projections (simplified)
        combined_readiness = self._combine_projections(results)
        
        return {
            'scenario_type': 'custom',
            'parameters': parameters,
            'individual_results': results,
            'combined_projected_readiness': combined_readiness,
            'recommendations': self._generate_custom_recommendations(results),
        }
    
    def _generate_plan_without_topics(self, excluded_topic_ids: List[str]) -> List[Dict[str, Any]]:
        """Generate a plan excluding certain topics."""
        # Temporarily mark topics as completed
        excluded_topics = Topic.objects.filter(id__in=excluded_topic_ids)
        original_completed = {}
        
        for topic in excluded_topics:
            original_completed[topic.id] = topic.is_completed
            topic.is_completed = True
            topic.save(update_fields=['is_completed'])
        
        # Generate plan
        new_plan = self.daily_plan_engine.generate_full_plan()
        
        # Restore
        for topic in excluded_topics:
            topic.is_completed = original_completed[topic.id]
            topic.save(update_fields=['is_completed'])
        
        return new_plan
    
    def _estimate_readiness(self, plan: List[Dict], budget: Dict) -> float:
        """Estimate readiness score for a simulated plan."""
        # Simplified estimation based on coverage and time
        coverage_ratio = budget['study_hours'] / max(
            sum(float(t.estimated_hours) for t in Topic.objects.filter(subject__exam=self.exam, is_completed=False)),
            1
        )
        base_score = min(coverage_ratio * 80, 80)
        
        # Add bonus for mock tests and revision
        if budget['mock_test_hours'] > 0:
            base_score += 10
        if budget['revision_hours'] > 0:
            base_score += 10
        
        return round(min(base_score, 100), 2)
    
    def _combine_projections(self, results: Dict) -> float:
        """Combine multiple scenario projections."""
        # Simple weighted average
        scores = []
        weights = []
        
        for key, result in results.items():
            if 'projected_readiness' in result:
                scores.append(result['projected_readiness'])
                weights.append(1)
        
        if not scores:
            return 0.0
        
        return round(sum(s * w for s, w in zip(scores, weights)) / sum(weights), 2)
    
    def _generate_hours_recommendations(
        self,
        original: float,
        new: float,
        feasibility: Dict
    ) -> List[str]:
        """Generate recommendations for hours change scenario."""
        recs = []
        
        if new < original:
            recs.append(f"Reducing from {original} to {new} hours/day loses {(original-new)*self.exam.days_remaining:.1f} total hours.")
            
            if not feasibility['feasible']:
                recs.append("Plan becomes infeasible. Consider dropping IF TIME topics.")
                recs.append(f"Deficit: {feasibility['deficit_hours']:.1f} hours.")
            else:
                recs.append(f"Still feasible with {feasibility['coverage_ratio']:.0%} coverage.")
        else:
            recs.append(f"Increasing to {new} hours/day adds {(new-original)*self.exam.days_remaining:.1f} total hours.")
            recs.append("Use extra time for revision and mock tests.")
        
        return recs
    
    def _generate_skip_recommendations(
        self,
        skipped_topics: QuerySet,
        feasible: bool,
        penalty: float
    ) -> List[str]:
        """Generate recommendations for topic skip scenario."""
        recs = []
        
        must_do_skipped = skipped_topics.filter(priority='must_do').count()
        if must_do_skipped > 0:
            recs.append(f"⚠️ WARNING: Skipping {must_do_skipped} MUST DO topic(s)! This will significantly hurt readiness.")
        
        if penalty > 10:
            recs.append(f"Skipping these topics reduces projected readiness by ~{penalty:.0f} points.")
        
        if feasible:
            recs.append("Remaining topics fit in available time.")
        else:
            recs.append("Even after skipping, remaining topics may not fit. Consider increasing study hours.")
        
        return recs
    
    def _generate_focus_recommendations(
        self,
        subject: Subject,
        focus_days: int,
        other_feasible: bool,
        boost: float,
        penalty: float
    ) -> List[str]:
        """Generate recommendations for subject focus scenario."""
        recs = []
        
        recs.append(f"Focusing on {subject.name} for {focus_days} days could boost its readiness by ~{boost:.0f} points.")
        
        if other_feasible:
            recs.append("Other subjects can still be completed in remaining time.")
        else:
            recs.append(f"⚠️ Other subjects may not fit in remaining {self.exam.days_remaining - focus_days} days.")
            recs.append(f"Readiness penalty for other subjects: ~{penalty:.0f} points.")
        
        return recs
    
    def _generate_deadline_recommendations(
        self,
        days_diff: int,
        feasibility: Dict
    ) -> List[str]:
        """Generate recommendations for deadline change scenario."""
        recs = []
        
        if days_diff > 0:
            recs.append(f"Gaining {days_diff} extra days adds {days_diff * float(self.user.preferred_study_hours_per_day):.1f} study hours.")
            recs.append("Use extra time for revision, mock tests, and weak areas.")
        else:
            recs.append(f"⚠️ Losing {abs(days_diff)} days removes {abs(days_diff) * float(self.user.preferred_study_hours_per_day):.1f} study hours.")
            
            if not feasibility['feasible']:
                recs.append("Plan becomes infeasible. Must drop topics or increase daily hours.")
        
        return recs
    
    def _generate_custom_recommendations(self, results: Dict) -> List[str]:
        """Generate recommendations for custom scenario."""
        recs = []
        
        for key, result in results.items():
            if 'recommendations' in result:
                recs.extend(result['recommendations'])
        
        # Deduplicate
        return list(dict.fromkeys(recs))
    
    def save_scenario(
        self,
        name: str,
        scenario_type: str,
        parameters: Dict[str, Any],
        results: Dict[str, Any]
    ) -> WhatIfScenario:
        """Save a what-if scenario to database."""
        scenario = WhatIfScenario.objects.create(
            user=self.user,
            exam=self.exam,
            name=name,
            scenario_type=scenario_type,
            parameters=parameters,
            projected_readiness=Decimal(str(results.get('projected_readiness', 0))),
            projected_completion=Decimal(str(results.get('feasibility', {}).get('coverage_ratio', 0) * 100)),
            affected_topics=results.get('affected_topics', []),
            time_impact=results.get('time_impact', {}),
            feasibility=results.get('feasibility', {}).get('feasible', 'feasible'),
            recommendations=results.get('recommendations', []),
        )
        return scenario