"""
Resource Matcher Engine - Recommends optimal resources for each topic based on student level and objectives.
"""
import logging
from typing import List, Dict, Any, Optional
from django.db.models import QuerySet

from PrepPilot.models import Topic, Resource, User

logger = logging.getLogger(__name__)


class ResourceMatcherEngine:
    """
    Engine for matching the best resources to topics based on:
    - Student's current level
    - Available time
    - Topic difficulty
    - Learning objective (theory, examples, practice, revision)
    """
    
    LEARNING_OBJECTIVES = ['theory', 'examples', 'practice', 'revision']
    
    # Resource type preferences for each learning objective
    OBJECTIVE_RESOURCE_MAP = {
        'theory': ['book', 'video', 'article', 'notes'],
        'examples': ['book', 'video', 'article'],
        'practice': ['practice', 'mock_test', 'book'],
        'revision': ['notes', 'mock_test', 'book'],
    }
    
    # Level compatibility
    LEVEL_ORDER = ['beginner', 'intermediate', 'advanced']
    
    def __init__(self, user: User):
        self.user = user
        self.user_level = self._assess_user_level()
    
    def _assess_user_level(self) -> str:
        """Assess overall user level based on preparation levels."""
        # This could be more sophisticated based on historical performance
        return 'intermediate'  # Default
    
    def get_recommended_sequence(self, topic: Topic) -> List[Dict[str, Any]]:
        """
        Get recommended resource sequence for a topic based on student's current level.
        Returns ordered list of learning steps with recommended resources.
        """
        current_level = topic.current_level
        
        # Determine starting objective based on current level
        if current_level < 30:
            # Weak - start with theory
            sequence = ['theory', 'examples', 'practice', 'revision']
        elif current_level < 60:
            # Moderate - start with examples/practice
            sequence = ['examples', 'practice', 'theory', 'revision']
        else:
            # Strong - focus on practice and revision
            sequence = ['practice', 'revision', 'examples']
        
        recommendations = []
        for i, objective in enumerate(sequence):
            resources = self._find_best_resources(topic, objective, current_level)
            if resources:
                recommendations.append({
                    'step': i + 1,
                    'objective': objective,
                    'description': self._get_objective_description(objective, topic),
                    'resources': resources[:3],  # Top 3 resources
                    'estimated_minutes': self._estimate_time(objective, topic.difficulty),
                })
        
        return recommendations
    
    def _find_best_resources(
        self,
        topic: Topic,
        objective: str,
        current_level: int
    ) -> List[Dict[str, Any]]:
        """Find best resources for a topic and learning objective."""
        # Get preferred resource types for this objective
        preferred_types = self.OBJECTIVE_RESOURCE_MAP.get(objective, [])
        
        # Query resources
        resources = Resource.objects.filter(
            topic=topic,
            resource_type__in=preferred_types
        ).order_by('-is_recommended', '-rating', 'recommended_sequence')
        
        # Filter by level compatibility
        user_level_idx = self.LEVEL_ORDER.index(self.user_level)
        filtered = []
        
        for resource in resources:
            resource_level_idx = self.LEVEL_ORDER.index(resource.level)
            
            # Prefer resources at or slightly above user level
            level_diff = resource_level_idx - user_level_idx
            
            if current_level < 30 and resource.level != 'beginner':
                continue  # Weak students need beginner resources
            elif current_level > 70 and resource.level == 'beginner':
                continue  # Strong students don't need beginner resources
            
            filtered.append({
                'id': str(resource.id),
                'title': resource.title,
                'resource_type': resource.resource_type,
                'level': resource.level,
                'author': resource.author,
                'publisher': resource.publisher,
                'url': resource.url,
                'duration_minutes': resource.duration_minutes,
                'rating': float(resource.rating),
                'is_recommended': resource.is_recommended,
                'chapters': resource.chapters,
            })
        
        return filtered
    
    def _get_objective_description(self, objective: str, topic: Topic) -> str:
        """Get human-readable description for learning objective."""
        descriptions = {
            'theory': f"Learn core concepts and theory for {topic.name}",
            'examples': f"Work through solved examples for {topic.name}",
            'practice': f"Practice questions on {topic.name}",
            'revision': f"Review and revise {topic.name}",
        }
        return descriptions.get(objective, f"Study {topic.name}")
    
    def _estimate_time(self, objective: str, difficulty: int) -> int:
        """Estimate time in minutes for a learning objective."""
        base_times = {
            'theory': 60,
            'examples': 45,
            'practice': 60,
            'revision': 30,
        }
        base = base_times.get(objective, 45)
        # Adjust for difficulty
        difficulty_multiplier = {1: 0.7, 2: 0.85, 3: 1.0, 4: 1.2, 5: 1.5}
        return int(base * difficulty_multiplier.get(difficulty, 1.0))
    
    def match_resources_for_all_topics(self, exam) -> Dict[str, List[Dict[str, Any]]]:
        """Match resources for all topics in an exam."""
        topics = Topic.objects.filter(subject__exam=exam).select_related('subject')
        results = {}
        
        for topic in topics:
            results[str(topic.id)] = {
                'topic_name': topic.name,
                'current_level': topic.current_level,
                'sequence': self.get_recommended_sequence(topic),
            }
        
        return results
    
    def get_resource_gaps(self, topic: Topic) -> List[str]:
        """Identify missing resource types for a topic."""
        existing_types = set(
            Resource.objects.filter(topic=topic).values_list('resource_type', flat=True)
        )
        
        all_needed = set()
        for types in self.OBJECTIVE_RESOURCE_MAP.values():
            all_needed.update(types)
        
        missing = all_needed - existing_types
        return list(missing)
    
    def recommend_additional_resources(self, topic: Topic, missing_types: List[str]) -> List[Dict[str, Any]]:
        """Suggest external resources for missing types."""
        # This would integrate with external APIs (YouTube, Google Books, etc.)
        # For now, return template suggestions
        suggestions = []
        for rtype in missing_types:
            suggestions.append({
                'resource_type': rtype,
                'suggestion': f"Search for {rtype} on {topic.name}",
                'search_terms': [topic.name, rtype, topic.subject.name],
            })
        return suggestions