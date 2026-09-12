"""
Tests for PrepPilot models.
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from django.utils import timezone
from django.contrib.auth import get_user_model

from PrepPilot.models import (
    User, Exam, Subject, Topic, Resource,
    StudyPlan, StudyBlock, MockTest,
    TopicPerformance, ReadinessScore,
    WhatIfScenario, RecoveryPlan, Notification
)

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.check_password('testpass123')
        assert user.preferred_study_hours_per_day == Decimal('5.00')
        assert user.ai_assistance_level == 'moderate'
        assert user.is_onboarded is False
    
    def test_user_full_name(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='John',
            last_name='Doe'
        )
        assert user.get_full_name() == 'John Doe'
    
    def test_user_preferred_schedule_default(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        assert user.preferred_study_schedule == {}


@pytest.mark.django_db
class TestExamModel:
    def test_create_exam(self, user):
        exam = Exam.objects.create(
            user=user,
            name='JEE Advanced 2024',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=60),
            total_marks=360,
            passing_marks=180
        )
        assert exam.name == 'JEE Advanced 2024'
        assert exam.exam_type == 'entrance'
        assert exam.days_remaining == 60
        assert exam.total_study_hours_available == 300  # 60 days * 5 hours
    
    def test_exam_str(self, user):
        exam = Exam.objects.create(
            user=user,
            name='NEET 2024',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        assert str(exam) == 'NEET 2024 (2024-10-11)'  # Date will vary


@pytest.mark.django_db
class TestSubjectModel:
    def test_create_subject(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        subject = Subject.objects.create(
            exam=exam,
            name='Physics',
            weightage=Decimal('33.33'),
            importance='high',
            preparation_level=30
        )
        assert subject.name == 'Physics'
        assert subject.weightage == Decimal('33.33')
        assert subject.importance == 'high'


@pytest.mark.django_db
class TestTopicModel:
    def test_create_topic(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        subject = Subject.objects.create(
            exam=exam,
            name='Physics',
            weightage=Decimal('33.33')
        )
        topic = Topic.objects.create(
            subject=subject,
            name='Electrostatics',
            weightage=Decimal('10.00'),
            importance='high',
            difficulty=4,
            estimated_hours=Decimal('5.00'),
            current_level=20
        )
        assert topic.name == 'Electrostatics'
        assert topic.difficulty == 4
        assert topic.current_level == 20
    
    def test_calculate_priority_must_do(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        subject = Subject.objects.create(exam=exam, name='Physics')
        
        # High importance + low current_level = MUST DO
        topic = Topic.objects.create(
            subject=subject,
            name='Electrostatics',
            importance='critical',
            difficulty=4,
            estimated_hours=Decimal('5.00'),
            current_level=10
        )
        topic.calculate_priority()
        assert topic.priority == 'must_do'
        assert topic.priority_score > 70
    
    def test_calculate_priority_should_do(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        subject = Subject.objects.create(exam=exam, name='Physics')
        
        topic = Topic.objects.create(
            subject=subject,
            name='Optics',
            importance='high',
            difficulty=3,
            estimated_hours=Decimal('4.00'),
            current_level=50
        )
        topic.calculate_priority()
        assert topic.priority == 'should_do'
        assert 40 <= topic.priority_score < 70
    
    def test_calculate_priority_if_time(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        subject = Subject.objects.create(exam=exam, name='Physics')
        
        topic = Topic.objects.create(
            subject=subject,
            name='Modern Physics',
            importance='low',
            difficulty=2,
            estimated_hours=Decimal('3.00'),
            current_level=80
        )
        topic.calculate_priority()
        assert topic.priority == 'if_time'
        assert topic.priority_score < 40


@pytest.mark.django_db
class TestStudyPlanModel:
    def test_create_study_plan(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        plan = StudyPlan.objects.create(
            user=user,
            exam=exam,
            date=date.today() + timedelta(days=1),
            total_hours=Decimal('5.00')
        )
        assert plan.total_hours == Decimal('5.00')
        assert plan.status == 'pending'
        assert plan.completion_percentage == Decimal('0.00')
    
    def test_study_plan_unique_constraint(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        StudyPlan.objects.create(
            user=user,
            exam=exam,
            date=date.today(),
            total_hours=Decimal('5.00')
        )
        
        # Should raise IntegrityError for duplicate
        with pytest.raises(Exception):
            StudyPlan.objects.create(
                user=user,
                exam=exam,
                date=date.today(),
                total_hours=Decimal('3.00')
            )


@pytest.mark.django_db
class TestStudyBlockModel:
    def test_create_study_block(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        subject = Subject.objects.create(exam=exam, name='Physics')
        topic = Topic.objects.create(
            subject=subject,
            name='Electrostatics',
            estimated_hours=Decimal('2.00')
        )
        plan = StudyPlan.objects.create(
            user=user,
            exam=exam,
            date=date.today(),
            total_hours=Decimal('5.00')
        )
        block = StudyBlock.objects.create(
            study_plan=plan,
            topic=topic,
            block_type='learn',
            order=1,
            planned_duration=60,
            description='Learn Electrostatics theory'
        )
        assert block.block_type == 'learn'
        assert block.planned_duration == 60
        assert block.status == 'pending'


@pytest.mark.django_db
class TestTopicPerformanceModel:
    def test_update_accuracy(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        subject = Subject.objects.create(exam=exam, name='Physics')
        topic = Topic.objects.create(
            subject=subject,
            name='Electrostatics',
            estimated_hours=Decimal('2.00')
        )
        
        performance = TopicPerformance.objects.create(
            user=user,
            topic=topic,
            questions_attempted=20,
            questions_correct=15
        )
        
        # Accuracy should be calculated
        assert performance.accuracy == Decimal('75.00')
        
        # Add more practice
        performance.questions_attempted += 10
        performance.questions_correct += 8
        performance.save()
        
        assert performance.accuracy == Decimal('76.67')


@pytest.mark.django_db
class TestMockTestModel:
    def test_create_mock_test(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        mock = MockTest.objects.create(
            user=user,
            exam=exam,
            name='Mock Test 1',
            scheduled_date=date.today() + timedelta(days=7),
            duration_minutes=180,
            total_questions=90,
            total_marks=360
        )
        assert mock.status == 'scheduled'
        assert mock.percentage == Decimal('0.00')
    
    def test_submit_mock_test(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        mock = MockTest.objects.create(
            user=user,
            exam=exam,
            name='Mock Test 1',
            scheduled_date=date.today(),
            duration_minutes=180,
            total_questions=90,
            total_marks=360
        )
        
        mock.status = 'completed'
        mock.attempted_questions = 80
        mock.correct_answers = 60
        mock.wrong_answers = 15
        mock.skipped_questions = 5
        mock.score = 200
        mock.save()
        
        assert mock.percentage == Decimal('55.56')


@pytest.mark.django_db
class TestReadinessScoreModel:
    def test_create_readiness_score(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        score = ReadinessScore.objects.create(
            user=user,
            exam=exam,
            overall_score=Decimal('75.50'),
            syllabus_coverage=Decimal('80.00'),
            topic_mastery=Decimal('70.00'),
            practice_accuracy=Decimal('75.00'),
            mock_performance=Decimal('80.00'),
            revision_frequency=Decimal('60.00'),
            weak_areas_penalty=Decimal('5.00'),
            time_pressure_factor=Decimal('80.00'),
            explanation='Good progress',
            recommendations=['Focus on weak areas', 'Take more mocks']
        )
        assert score.overall_score == Decimal('75.50')
        assert len(score.recommendations) == 2


@pytest.mark.django_db
class TestWhatIfScenarioModel:
    def test_create_whatif_scenario(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        scenario = WhatIfScenario.objects.create(
            user=user,
            exam=exam,
            name='What if 3 hours/day',
            scenario_type='hours_change',
            parameters={'hours_per_day': 3},
            projected_readiness=Decimal('65.00'),
            projected_completion=Decimal('70.00'),
            feasibility='challenging',
            recommendations=['Increase study hours', 'Drop optional topics']
        )
        assert scenario.scenario_type == 'hours_change'
        assert scenario.feasibility == 'challenging'


@pytest.mark.django_db
class TestRecoveryPlanModel:
    def test_create_recovery_plan(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        recovery = RecoveryPlan.objects.create(
            user=user,
            exam=exam,
            trigger_reason='Behind by 8 hours',
            hours_behind=Decimal('8.00'),
            priority_topics_moved_forward=[
                {'topic_id': '1', 'topic_name': 'Electrostatics'}
            ],
            low_priority_topics_postponed=[
                {'topic_id': '2', 'topic_name': 'Optics'}
            ],
            optional_topics_removed=[
                {'topic_id': '3', 'topic_name': 'Modern Physics'}
            ],
            additional_revision_hours=Decimal('2.00')
        )
        assert recovery.hours_behind == Decimal('8.00')
        assert len(recovery.priority_topics_moved_forward) == 1
        assert recovery.is_applied is False


@pytest.mark.django_db
class TestNotificationModel:
    def test_create_notification(self, user):
        exam = Exam.objects.create(
            user=user,
            name='Test Exam',
            exam_type='entrance',
            exam_date=date.today() + timedelta(days=30)
        )
        notification = Notification.objects.create(
            user=user,
            title='Study Reminder',
            message='Time to study Physics!',
            notification_type='study_reminder',
            priority='high',
            related_exam=exam
        )
        assert notification.notification_type == 'study_reminder'
        assert notification.priority == 'high'
        assert notification.is_read is False
    
    def test_mark_read(self, user):
        notification = Notification.objects.create(
            user=user,
            title='Test',
            message='Test message',
            notification_type='study_reminder'
        )
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        
        assert notification.is_read is True
        assert notification.read_at is not None