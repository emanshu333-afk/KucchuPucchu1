"""
Serializers for PrepPilot API.
"""
from rest_framework import serializers
from PrepPilot.models import (
    User, Exam, Subject, Topic, Resource,
    StudyPlan, StudyBlock, MockTest,
    TopicPerformance, ReadinessScore,
    WhatIfScenario, RecoveryPlan, Notification
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'date_of_birth', 'avatar',
            'preferred_study_hours_per_day', 'preferred_study_schedule',
            'timezone', 'target_score', 'target_rank', 'target_grade',
            'ai_assistance_level', 'is_onboarded', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name',
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class ExamSerializer(serializers.ModelSerializer):
    days_remaining = serializers.IntegerField(read_only=True)
    total_study_hours_available = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    subjects_count = serializers.SerializerMethodField()
    readiness_score = serializers.SerializerMethodField()
    
    class Meta:
        model = Exam
        fields = [
            'id', 'name', 'exam_type', 'exam_date', 'conducting_body',
            'official_website', 'registration_deadline', 'total_marks',
            'passing_marks', 'negative_marking', 'negative_marking_ratio',
            'is_active', 'is_completed', 'days_remaining',
            'total_study_hours_available', 'subjects_count', 'readiness_score',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user']
    
    def get_subjects_count(self, obj):
        return obj.subjects.count()
    
    def get_readiness_score(self, obj):
        latest = obj.readiness_scores.first()
        if latest:
            return float(latest.overall_score)
        return None


class SubjectSerializer(serializers.ModelSerializer):
    topics_count = serializers.SerializerMethodField()
    completed_topics = serializers.SerializerMethodField()
    
    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'code', 'weightage', 'importance',
            'allocated_hours', 'actual_hours_spent', 'preparation_level',
            'order', 'topics_count', 'completed_topics',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'exam']
    
    def get_topics_count(self, obj):
        return obj.topics.count()
    
    def get_completed_topics(self, obj):
        return obj.topics.filter(is_completed=True).count()


class TopicSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    resources_count = serializers.SerializerMethodField()
    recommended_resources = serializers.SerializerMethodField()
    
    class Meta:
        model = Topic
        fields = [
            'id', 'subject', 'subject_name', 'name', 'description',
            'parent_topic', 'order', 'weightage', 'expected_questions',
            'importance', 'difficulty', 'estimated_hours',
            'current_level', 'confidence_level', 'priority', 'priority_score',
            'is_completed', 'completed_at', 'resources_count',
            'recommended_resources', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'priority_score', 'created_at', 'updated_at']
    
    def get_resources_count(self, obj):
        return obj.resource_links.count()
    
    def get_recommended_resources(self, obj):
        resources = obj.resource_links.filter(is_recommended=True)[:3]
        return ResourceSerializer(resources, many=True).data


class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = [
            'id', 'title', 'resource_type', 'level', 'author', 'publisher',
            'url', 'isbn', 'description', 'chapters', 'duration_minutes',
            'rating', 'review_count', 'is_recommended', 'recommended_for',
            'recommended_sequence', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StudyBlockSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    block_type_display = serializers.CharField(source='get_block_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = StudyBlock
        fields = [
            'id', 'topic', 'topic_name', 'block_type', 'block_type_display',
            'order', 'planned_duration', 'actual_duration', 'description',
            'resources', 'learning_objectives', 'status', 'status_display',
            'started_at', 'completed_at', 'completion_percentage', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'study_plan']


class StudyPlanSerializer(serializers.ModelSerializer):
    blocks = StudyBlockSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = StudyPlan
        fields = [
            'id', 'exam', 'date', 'total_hours', 'status', 'status_display',
            'completion_percentage', 'blocks', 'created_at', 'updated_at', 'completed_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at', 'user']


class MockTestSerializer(serializers.ModelSerializer):
    subjects_detail = SubjectSerializer(source='subjects', many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = MockTest
        fields = [
            'id', 'name', 'scheduled_date', 'duration_minutes',
            'total_questions', 'total_marks', 'subjects', 'subjects_detail',
            'status', 'status_display', 'attempted_questions', 'correct_answers',
            'wrong_answers', 'skipped_questions', 'score', 'percentage',
            'strong_areas', 'weak_areas', 'time_management_score',
            'created_at', 'updated_at', 'started_at', 'completed_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user']


class TopicPerformanceSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    subject_name = serializers.CharField(source='topic.subject.name', read_only=True)
    
    class Meta:
        model = TopicPerformance
        fields = [
            'id', 'topic', 'topic_name', 'subject_name',
            'questions_attempted', 'questions_correct', 'questions_wrong',
            'accuracy', 'avg_time_per_question', 'total_time_spent',
            'mastery_level', 'last_practiced', 'revision_count',
            'next_revision_date', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user']


class ReadinessScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadinessScore
        fields = [
            'id', 'overall_score', 'syllabus_coverage', 'topic_mastery',
            'practice_accuracy', 'mock_performance', 'revision_frequency',
            'weak_areas_penalty', 'time_pressure_factor',
            'explanation', 'recommendations', 'calculated_at',
        ]
        read_only_fields = ['id', 'calculated_at']


class WhatIfScenarioSerializer(serializers.ModelSerializer):
    scenario_type_display = serializers.CharField(source='get_scenario_type_display', read_only=True)
    feasibility_display = serializers.CharField(source='get_feasibility_display', read_only=True)
    
    class Meta:
        model = WhatIfScenario
        fields = [
            'id', 'name', 'scenario_type', 'scenario_type_display',
            'parameters', 'projected_readiness', 'projected_completion',
            'affected_topics', 'time_impact', 'feasibility',
            'feasibility_display', 'recommendations',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user']


class RecoveryPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecoveryPlan
        fields = [
            'id', 'trigger_reason', 'hours_behind',
            'priority_topics_moved_forward', 'low_priority_topics_postponed',
            'optional_topics_removed', 'additional_revision_hours',
            'mock_tests_rescheduled', 'new_study_plan', 'is_applied',
            'created_at', 'applied_at',
        ]
        read_only_fields = ['id', 'created_at', 'applied_at']


class NotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type', 'notification_type_display',
            'priority', 'priority_display', 'related_exam', 'related_topic',
            'related_study_plan', 'is_read', 'read_at', 'action_url', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


__all__ = [
    'UserSerializer',
    'UserRegistrationSerializer',
    'ExamSerializer',
    'SubjectSerializer',
    'TopicSerializer',
    'ResourceSerializer',
    'StudyBlockSerializer',
    'StudyPlanSerializer',
    'MockTestSerializer',
    'TopicPerformanceSerializer',
    'ReadinessScoreSerializer',
    'WhatIfScenarioSerializer',
    'RecoveryPlanSerializer',
    'NotificationSerializer',
]