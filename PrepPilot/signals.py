"""
Signals for PrepPilot app.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import User, Topic, StudyPlan, StudyBlock, TopicPerformance, MockTest


@receiver(post_save, sender=User)
def create_user_defaults(sender, instance, created, **kwargs):
    """Create default settings when a new user is created."""
    if created:
        # Set default preferred study schedule
        if not instance.preferred_study_schedule:
            instance.preferred_study_schedule = {
                'morning': 2,
                'afternoon': 1,
                'evening': 2
            }
            instance.save(update_fields=['preferred_study_schedule'])


@receiver(pre_save, sender=Topic)
def calculate_topic_priority(sender, instance, **kwargs):
    """Auto-calculate topic priority before saving."""
    if instance.pk is None or instance.current_level != Topic.objects.filter(pk=instance.pk).values_list('current_level', flat=True).first():
        instance.calculate_priority()


@receiver(post_save, sender=StudyBlock)
def update_study_plan_progress(sender, instance, **kwargs):
    """Update study plan completion percentage when block status changes."""
    if instance.status == 'completed':
        plan = instance.study_plan
        total_blocks = plan.blocks.count()
        completed_blocks = plan.blocks.filter(status='completed').count()
        if total_blocks > 0:
            plan.completion_percentage = round((completed_blocks / total_blocks) * 100, 2)
            if plan.completion_percentage == 100:
                plan.status = 'completed'
                plan.completed_at = timezone.now()
            elif plan.completion_percentage > 0:
                plan.status = 'in_progress'
            plan.save(update_fields=['completion_percentage', 'status', 'completed_at'])


@receiver(post_save, sender=TopicPerformance)
def update_topic_mastery(sender, instance, **kwargs):
    """Update topic mastery level based on performance."""
    if instance.questions_attempted > 0:
        instance.accuracy = round((instance.questions_correct / instance.questions_attempted) * 100, 2)
        
        # Calculate mastery based on accuracy and revision count
        base_mastery = float(instance.accuracy)
        revision_bonus = min(instance.revision_count * 5, 20)
        instance.mastery_level = min(int(base_mastery + revision_bonus), 100)
        
        # Update topic's current level
        topic = instance.topic
        topic.current_level = instance.mastery_level
        topic.calculate_priority()
        topic.save(update_fields=['current_level', 'priority', 'priority_score'])
        
        instance.save(update_fields=['accuracy', 'mastery_level'])


@receiver(post_save, sender=MockTest)
def create_mock_test_analysis(sender, instance, created, **kwargs):
    """Analyze mock test results when completed."""
    if instance.status == 'completed' and instance.attempted_questions > 0:
        instance.percentage = round((instance.score / instance.total_marks) * 100, 2) if instance.total_marks > 0 else 0
        
        # Update topic performances based on mock test
        # This would be expanded with actual question-topic mapping
        instance.save(update_fields=['percentage'])