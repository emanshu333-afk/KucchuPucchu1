"""
Core models for the Dynamic Exam Preparation System.
"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """Custom user model with additional fields for exam preparation."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_('email address'), unique=True)
    
    # Profile information
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    avatar = models.FileField(upload_to='avatars/', null=True, blank=True)
    
    # Study preferences
    preferred_study_hours_per_day = models.DecimalField(
        max_digits=4, decimal_places=2, default=5.00,
        help_text='Preferred study hours per day'
    )
    preferred_study_schedule = models.JSONField(
        default=dict,
        help_text='Preferred study schedule (e.g., {"morning": 2, "evening": 3})'
    )
    timezone = models.CharField(max_length=50, default='UTC')
    
    # Target settings
    target_score = models.CharField(max_length=50, blank=True)
    target_rank = models.PositiveIntegerField(null=True, blank=True)
    target_grade = models.CharField(max_length=20, blank=True)
    
    # AI settings
    ai_assistance_level = models.CharField(
        max_length=20,
        choices=[
            ('minimal', 'Minimal - Only critical alerts'),
            ('moderate', 'Moderate - Suggestions and insights'),
            ('full', 'Full - Comprehensive AI guidance'),
        ],
        default='moderate'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_active = models.DateTimeField(auto_now=True)
    is_onboarded = models.BooleanField(default=False)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        db_table = 'users'
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username


class Exam(models.Model):
    """Exam model representing the target exam."""
    
    EXAM_TYPES = [
        ('board', 'Board Exam'),
        ('entrance', 'Entrance Exam'),
        ('competitive', 'Competitive Exam'),
        ('certification', 'Certification'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exams')
    
    name = models.CharField(max_length=200)
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPES, default='entrance')
    exam_date = models.DateField()
    
    # Exam details
    conducting_body = models.CharField(max_length=200, blank=True)
    official_website = models.URLField(blank=True)
    registration_deadline = models.DateField(null=True, blank=True)
    
    # Scoring
    total_marks = models.PositiveIntegerField(default=0)
    passing_marks = models.PositiveIntegerField(default=0)
    negative_marking = models.BooleanField(default=False)
    negative_marking_ratio = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.25,
        help_text='Fraction of marks deducted for wrong answer'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_completed = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'exams'
        verbose_name = _('Exam')
        verbose_name_plural = _('Exams')
        ordering = ['exam_date']
        indexes = [
            models.Index(fields=['user', 'exam_date']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.exam_date})"
    
    @property
    def days_remaining(self):
        delta = self.exam_date - timezone.now().date()
        return max(0, delta.days)
    
    @property
    def total_study_hours_available(self):
        return float(self.days_remaining) * float(self.user.preferred_study_hours_per_day)


class Subject(models.Model):
    """Subject model for each exam."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='subjects')
    
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True)
    
    # Weightage and importance
    weightage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text='Percentage weightage in exam'
    )
    importance = models.CharField(
        max_length=10,
        choices=[
            ('critical', 'Critical'),
            ('high', 'High'),
            ('medium', 'Medium'),
            ('low', 'Low'),
        ],
        default='medium'
    )
    
    # Time allocation (hours)
    allocated_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    actual_hours_spent = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    
    # Current preparation level (0-100)
    preparation_level = models.PositiveIntegerField(default=0)
    
    # Order for display
    order = models.PositiveIntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'subjects'
        verbose_name = _('Subject')
        verbose_name_plural = _('Subjects')
        ordering = ['order', 'name']
        unique_together = ['exam', 'name']
        indexes = [
            models.Index(fields=['exam', 'order']),
        ]
    
    def __str__(self):
        return f"{self.exam.name} - {self.name}"


class Topic(models.Model):
    """Topic model for granular study planning."""
    
    PRIORITY_CHOICES = [
        ('must_do', '🔴 MUST DO'),
        ('should_do', '🟡 SHOULD DO'),
        ('if_time', '🟢 IF TIME'),
    ]
    
    DIFFICULTY_CHOICES = [
        (1, 'Very Easy'),
        (2, 'Easy'),
        (3, 'Moderate'),
        (4, 'Hard'),
        (5, 'Very Hard'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='topics')
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Hierarchy
    parent_topic = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True,
        related_name='subtopics'
    )
    order = models.PositiveIntegerField(default=0)
    
    # Exam relevance
    weightage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    expected_questions = models.PositiveIntegerField(default=0)
    importance = models.CharField(
        max_length=10,
        choices=[
            ('critical', 'Critical'),
            ('high', 'High'),
            ('medium', 'Medium'),
            ('low', 'Low'),
        ],
        default='medium'
    )
    
    # Difficulty and time
    difficulty = models.PositiveIntegerField(choices=DIFFICULTY_CHOICES, default=3)
    estimated_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Student's current status
    current_level = models.PositiveIntegerField(
        default=0,
        help_text='Current preparation level (0-100)'
    )
    confidence_level = models.PositiveIntegerField(
        default=50,
        help_text='Confidence level (0-100)'
    )
    
    # Priority classification (auto-calculated)
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='if_time'
    )
    priority_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Resources
    resources = models.JSONField(default=list, blank=True)
    
    # Status
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'topics'
        verbose_name = _('Topic')
        verbose_name_plural = _('Topics')
        ordering = ['subject', 'order', 'name']
        indexes = [
            models.Index(fields=['subject', 'priority']),
            models.Index(fields=['subject', 'order']),
        ]
    
    def __str__(self):
        return f"{self.subject.name} - {self.name}"
    
    def calculate_priority(self):
        """Calculate priority based on importance, weakness, weightage, and time."""
        # Priority factors
        importance_weight = {'critical': 40, 'high': 30, 'medium': 20, 'low': 10}
        difficulty_weight = {1: 5, 2: 10, 3: 15, 4: 20, 5: 25}
        
        importance_score = importance_weight.get(self.importance, 20)
        weakness_score = 100 - self.current_level
        weightage_score = min(float(self.weightage) * 2, 30)
        difficulty_score = difficulty_weight.get(self.difficulty, 15)
        time_factor = min(float(self.estimated_hours) / 10 * 10, 15)
        
        # Normalize and combine
        total_score = (
            importance_score * 0.3 +
            weakness_score * 0.25 +
            weightage_score * 0.2 +
            difficulty_score * 0.15 +
            time_factor * 0.1
        )
        
        self.priority_score = round(total_score, 2)
        
        if total_score >= 70:
            self.priority = 'must_do'
        elif total_score >= 40:
            self.priority = 'should_do'
        else:
            self.priority = 'if_time'
        
        return self.priority


class Resource(models.Model):
    """Study resources for topics."""
    
    RESOURCE_TYPES = [
        ('book', 'Book'),
        ('video', 'Video'),
        ('article', 'Article'),
        ('practice', 'Practice Questions'),
        ('mock_test', 'Mock Test'),
        ('notes', 'Notes'),
        ('other', 'Other'),
    ]
    
    LEVELS = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='resource_links')
    
    title = models.CharField(max_length=300)
    resource_type = models.CharField(max_length=20, choices=RESOURCE_TYPES)
    level = models.CharField(max_length=20, choices=LEVELS, default='intermediate')
    
    # Source
    author = models.CharField(max_length=200, blank=True)
    publisher = models.CharField(max_length=200, blank=True)
    url = models.URLField(blank=True)
    isbn = models.CharField(max_length=20, blank=True)
    
    # Details
    description = models.TextField(blank=True)
    chapters = models.JSONField(default=list, blank=True)
    duration_minutes = models.PositiveIntegerField(default=0)
    
    # Quality metrics
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)
    
    # Recommendation
    is_recommended = models.BooleanField(default=False)
    recommended_for = models.JSONField(
        default=list,
        help_text='List of learning objectives: theory, examples, practice, revision'
    )
    recommended_sequence = models.PositiveIntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'resources'
        verbose_name = _('Resource')
        verbose_name_plural = _('Resources')
        ordering = ['topic', 'recommended_sequence', '-rating']
        indexes = [
            models.Index(fields=['topic', 'resource_type']),
            models.Index(fields=['topic', 'is_recommended']),
        ]
    
    def __str__(self):
        return f"{self.topic.name} - {self.title}"


class StudyPlan(models.Model):
    """Daily study plan generated by the system."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('skipped', 'Skipped'),
        ('rescheduled', 'Rescheduled'),
    ]
    
    BLOCK_TYPES = [
        ('learn', 'Learn Theory'),
        ('practice', 'Practice Questions'),
        ('test', 'Take Test'),
        ('analyze', 'Analyze Mistakes'),
        ('revise', 'Revision'),
        ('mock', 'Mock Test'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_plans')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='study_plans')
    
    date = models.DateField()
    total_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'study_plans'
        verbose_name = _('Study Plan')
        verbose_name_plural = _('Study Plans')
        ordering = ['date']
        unique_together = ['user', 'date']
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'status']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.date} ({self.status})"


class StudyBlock(models.Model):
    """Individual study block within a daily plan."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    study_plan = models.ForeignKey(StudyPlan, on_delete=models.CASCADE, related_name='blocks')
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='study_blocks')
    
    block_type = models.CharField(max_length=20, choices=StudyPlan.BLOCK_TYPES)
    order = models.PositiveIntegerField(default=0)
    
    # Time
    planned_duration = models.PositiveIntegerField(help_text='Duration in minutes')
    actual_duration = models.PositiveIntegerField(default=0)
    
    # Content
    description = models.TextField(blank=True)
    resources = models.JSONField(default=list)
    learning_objectives = models.JSONField(default=list)
    
    # Status
    status = models.CharField(max_length=20, choices=StudyPlan.STATUS_CHOICES, default='pending')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Progress
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'study_blocks'
        verbose_name = _('Study Block')
        verbose_name_plural = _('Study Blocks')
        ordering = ['study_plan', 'order']
        indexes = [
            models.Index(fields=['study_plan', 'status']),
            models.Index(fields=['topic', 'status']),
        ]
    
    def __str__(self):
        return f"{self.study_plan.date} - {self.topic.name} - {self.get_block_type_display()}"


class MockTest(models.Model):
    """Mock test model."""
    
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('missed', 'Missed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mock_tests')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='mock_tests')
    
    name = models.CharField(max_length=200)
    scheduled_date = models.DateField()
    duration_minutes = models.PositiveIntegerField(default=180)
    
    # Test configuration
    total_questions = models.PositiveIntegerField(default=0)
    total_marks = models.PositiveIntegerField(default=0)
    subjects = models.ManyToManyField(Subject, related_name='mock_tests')
    
    # Results
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    attempted_questions = models.PositiveIntegerField(default=0)
    correct_answers = models.PositiveIntegerField(default=0)
    wrong_answers = models.PositiveIntegerField(default=0)
    skipped_questions = models.PositiveIntegerField(default=0)
    score = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Analysis
    strong_areas = models.JSONField(default=list)
    weak_areas = models.JSONField(default=list)
    time_management_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'mock_tests'
        verbose_name = _('Mock Test')
        verbose_name_plural = _('Mock Tests')
        ordering = ['-scheduled_date']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'scheduled_date']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.name} ({self.scheduled_date})"


class TopicPerformance(models.Model):
    """Track performance on specific topics."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='topic_performances')
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='performances')
    
    # Practice metrics
    questions_attempted = models.PositiveIntegerField(default=0)
    questions_correct = models.PositiveIntegerField(default=0)
    questions_wrong = models.PositiveIntegerField(default=0)
    accuracy = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Time metrics
    avg_time_per_question = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    total_time_spent = models.PositiveIntegerField(default=0)
    
    # Mastery
    mastery_level = models.PositiveIntegerField(default=0)
    last_practiced = models.DateTimeField(null=True, blank=True)
    revision_count = models.PositiveIntegerField(default=0)
    next_revision_date = models.DateField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'topic_performances'
        verbose_name = _('Topic Performance')
        verbose_name_plural = _('Topic Performances')
        unique_together = ['user', 'topic']
        indexes = [
            models.Index(fields=['user', 'mastery_level']),
            models.Index(fields=['topic', 'mastery_level']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.topic.name} ({self.accuracy}%)"


class ReadinessScore(models.Model):
    """Exam readiness score tracking."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='readiness_scores')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='readiness_scores')
    
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Component scores
    syllabus_coverage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    topic_mastery = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    practice_accuracy = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    mock_performance = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    revision_frequency = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    weak_areas_penalty = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    time_pressure_factor = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Explanation
    explanation = models.TextField(blank=True)
    recommendations = models.JSONField(default=list)
    
    # Metadata
    calculated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'readiness_scores'
        verbose_name = _('Readiness Score')
        verbose_name_plural = _('Readiness Scores')
        ordering = ['-calculated_at']
        indexes = [
            models.Index(fields=['user', 'exam', '-calculated_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.exam.name} - {self.overall_score}/100"


class WhatIfScenario(models.Model):
    """What-if simulation scenarios."""
    
    SCENARIO_TYPES = [
        ('hours_change', 'Study Hours Change'),
        ('topic_skip', 'Skip Topics'),
        ('subject_focus', 'Subject Focus'),
        ('deadline_change', 'Deadline Change'),
        ('custom', 'Custom Scenario'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='whatif_scenarios')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='whatif_scenarios')
    
    name = models.CharField(max_length=200)
    scenario_type = models.CharField(max_length=20, choices=SCENARIO_TYPES)
    parameters = models.JSONField(default=dict)
    
    # Results
    projected_readiness = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    projected_completion = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    affected_topics = models.JSONField(default=list)
    time_impact = models.JSONField(default=dict)
    feasibility = models.CharField(
        max_length=20,
        choices=[
            ('feasible', 'Feasible'),
            ('challenging', 'Challenging'),
            ('not_feasible', 'Not Feasible'),
        ],
        default='feasible'
    )
    
    # Recommendations
    recommendations = models.JSONField(default=list)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'whatif_scenarios'
        verbose_name = _('What-If Scenario')
        verbose_name_plural = _('What-If Scenarios')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.name}"


class RecoveryPlan(models.Model):
    """Recovery/Replanning engine output."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recovery_plans')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='recovery_plans')
    
    trigger_reason = models.TextField()
    hours_behind = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    
    # Actions taken
    priority_topics_moved_forward = models.JSONField(default=list)
    low_priority_topics_postponed = models.JSONField(default=list)
    optional_topics_removed = models.JSONField(default=list)
    additional_revision_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    mock_tests_rescheduled = models.JSONField(default=list)
    
    # New schedule
    new_study_plan = models.JSONField(default=dict)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    applied_at = models.DateTimeField(null=True, blank=True)
    is_applied = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'recovery_plans'
        verbose_name = _('Recovery Plan')
        verbose_name_plural = _('Recovery Plans')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Recovery for {self.user.username} - {self.exam.name} ({self.created_at.date()})"


class Notification(models.Model):
    """User notifications."""
    
    NOTIFICATION_TYPES = [
        ('study_reminder', 'Study Reminder'),
        ('plan_update', 'Plan Update'),
        ('mock_test', 'Mock Test'),
        ('revision_due', 'Revision Due'),
        ('milestone', 'Milestone'),
        ('warning', 'Warning'),
        ('achievement', 'Achievement'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    
    # Related objects
    related_exam = models.ForeignKey(Exam, on_delete=models.SET_NULL, null=True, blank=True)
    related_topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True)
    related_study_plan = models.ForeignKey(StudyPlan, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    action_url = models.CharField(max_length=500, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        verbose_name = _('Notification')
        verbose_name_plural = _('Notifications')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"