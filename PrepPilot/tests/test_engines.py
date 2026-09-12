"""
Tests for PrepPilot engines.
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from django.utils import timezone

from PrepPilot.models import User, Exam, Subject, Topic, Resource, StudyPlan, TopicPerformance, MockTest
from PrepPilot.engines.topic_priority import TopicPriorityEngine
from PrepPilot.engines.time_budget import TimeBudgetEngine
from PrepPilot.engines.resource_matcher import ResourceMatcherEngine
from PrepPilot.engines.daily_plan import DailyPlanEngine
from PrepPilot.engines.recovery import RecoveryEngine
from PrepPilot.engines.readiness import ReadinessEngine
from PrepPilot.engines.whatif import WhatIfEngine


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        preferred_study_hours_per_day=Decimal('5.00')
    )


@pytest.fixture
def exam(user):
    return Exam.objects.create(
        user=user,
        name='JEE Advanced 2024',
        exam_type='entrance',
        exam_date=date.today() + timedelta(days=30),
        total_marks=360
    )


@pytest.fixture
def subjects(exam):
    physics = Subject.objects.create(
        exam=exam,
        name='Physics',
        weightage=Decimal('33.33'),
        importance='high',
        preparation_level=40
    )
    chemistry = Subject.objects.create(
        exam=exam,
        name='Chemistry',
        weightage=Decimal('33.33'),
        importance='high',
        preparation_level=60
    )
    maths = Subject.objects.create(
        exam=exam,
        name='Mathematics',
        weightage=Decimal('33.34'),
        importance='critical',
        preparation_level=30
    )
    return [physics, chemistry, maths]


@pytest.fixture
def topics(subjects):
    topics_list = []
    
    # Physics topics
    topics_list.append(Topic.objects.create(
        subject=subjects[0],
        name='Electrostatics',
        weightage=Decimal('10.00'),
        importance='high',
        difficulty=4,
        estimated_hours=Decimal('5.00'),
        current_level=20
    ))
    topics_list.append(Topic.objects.create(
        subject=subjects[0],
        name='Current Electricity',
        weightage=Decimal('8.00'),
        importance='medium',
        difficulty=3,
        estimated_hours=Decimal('4.00'),
        current_level=50
    ))
    topics_list.append(Topic.objects.create(
        subject=subjects[0],
        name='Optics',
        weightage=Decimal('15.33'),
        importance='high',
        difficulty=3,
        estimated_hours=Decimal('6.00'),
        current_level=70
    ))
    
    # Chemistry topics
    topics_list.append(Topic.objects.create(
        subject=subjects[1],
        name='Chemical Bonding',
        weightage=Decimal('12.00'),
        importance='high',
        difficulty=3,
        estimated_hours=Decimal('5.00'),
        current_level=40
    ))
    topics_list.append(Topic.objects.create(
        subject=subjects[1],
        name='Thermodynamics',
        weightage=Decimal('10.00'),
        importance='medium',
        difficulty=4,
        estimated_hours=Decimal('4.00'),
        current_level=30
    ))
    topics_list.append(Topic.objects.create(
        subject=subjects[1],
        name='Organic Chemistry Basics',
        weightage=Decimal('11.33'),
        importance='high',
        difficulty=4,
        estimated_hours=Decimal('8.00'),
        current_level=60
    ))
    
    # Maths topics
    topics_list.append(Topic.objects.create(
        subject=subjects[2],
        name='Calculus',
        weightage=Decimal('15.00'),
        importance='critical',
        difficulty=5,
        estimated_hours=Decimal('10.00'),
        current_level=25
    ))
    topics_list.append(Topic.objects.create(
        subject=subjects[2],
        name='Algebra',
        weightage=Decimal('10.00'),
        importance='high',
        difficulty=4,
        estimated_hours=Decimal('6.00'),
        current_level=45
    ))
    topics_list.append(Topic.objects.create(
        subject=subjects[2],
        name='Coordinate Geometry',
        weightage=Decimal('8.34'),
        importance='medium',
        difficulty=3,
        estimated_hours=Decimal('5.00'),
        current_level=55
    ))
    
    return topics_list


class TestTopicPriorityEngine:
    def test_calculate_priority_must_do(self, exam, topics):
        engine = TopicPriorityEngine(exam)
        electrostatics = topics[0]  # High importance, low level
        
        result = engine.calculate_priority_for_topic(electrostatics)
        
        assert result['priority'] == 'must_do'
        assert result['priority_score'] > 70
    
    def test_calculate_priority_if_time(self, exam, topics):
        engine = TopicPriorityEngine(exam)
        optics = topics[2]  # High level, medium importance
        
        result = engine.calculate_priority_for_topic(optics)
        
        assert result['priority'] in ['should_do', 'if_time']
    
    def test_calculate_all_priorities(self, exam, topics):
        engine = TopicPriorityEngine(exam)
        priorities = engine.calculate_all_priorities()
        
        assert len(priorities) == len(topics)
        
        # Check all have priorities assigned
        for p in priorities:
            assert p['priority'] in ['must_do', 'should_do', 'if_time']
            assert 'priority_score' in p
    
    def test_get_priority_distribution(self, exam, topics):
        engine = TopicPriorityEngine(exam)
        engine.calculate_all_priorities()
        distribution = engine.get_priority_distribution()
        
        total = sum(distribution.values())
        assert total == len(topics)
    
    def test_get_must_do_topics(self, exam, topics):
        engine = TopicPriorityEngine(exam)
        engine.calculate_all_priorities()
        must_do = engine.get_must_do_topics()
        
        for topic in must_do:
            assert topic.priority == 'must_do'


class TestTimeBudgetEngine:
    def test_calculate_total_budget(self, exam):
        engine = TimeBudgetEngine(exam)
        budget = engine.calculate_total_budget()
        
        assert 'total_hours' in budget
        assert 'study_hours' in budget
        assert 'revision_hours' in budget
        assert 'mock_test_hours' in budget
        assert 'buffer_hours' in budget
        
        # Total should equal sum of parts (approximately)
        total_parts = (budget['study_hours'] + budget['revision_hours'] + 
                       budget['mock_test_hours'] + budget['buffer_hours'])
        assert abs(total_parts - budget['total_hours']) < 1
    
    def test_allocate_subject_hours(self, exam, subjects):
        engine = TimeBudgetEngine(exam)
        result = engine.allocate_subject_hours()
        
        assert 'budget' in result
        assert 'allocations' in result
        assert len(result['allocations']) == 3
        
        # Check that subjects with lower preparation get more hours
        allocations = result['allocations']
        maths_alloc = next(a for a in allocations.values() if a['subject_name'] == 'Mathematics')
        chem_alloc = next(a for a in allocations.values() if a['subject_name'] == 'Chemistry')
        
        # Maths has lower preparation (30) than Chemistry (60), should get more hours
        assert maths_alloc['allocated_hours'] >= chem_alloc['allocated_hours']
    
    def test_recalculate_on_hours_change(self, exam):
        engine = TimeBudgetEngine(exam)
        result = engine.recalculate_on_hours_change(3.0)
        
        assert result['change_summary']['new_hours_per_day'] == 3.0
        assert result['change_summary']['old_hours_per_day'] == 5.0
        assert result['change_summary']['difference'] < 0
    
    def test_check_feasibility(self, exam, topics):
        engine = TimeBudgetEngine(exam)
        feasibility = engine.check_feasibility()
        
        assert 'feasible' in feasibility
        assert 'total_estimated_hours' in feasibility
        assert 'available_study_hours' in feasibility
        assert 'coverage_ratio' in feasibility
        assert 'recommendation' in feasibility


class TestResourceMatcherEngine:
    def test_get_recommended_sequence_weak(self, user, topics):
        engine = ResourceMatcherEngine(user)
        electrostatics = topics[0]  # current_level = 20
        
        sequence = engine.get_recommended_sequence(electrostatics)
        
        assert len(sequence) > 0
        # Should start with theory for weak students
        assert sequence[0]['objective'] == 'theory'
    
    def test_get_recommended_sequence_strong(self, user, topics):
        engine = ResourceMatcherEngine(user)
        optics = topics[2]  # current_level = 70
        
        sequence = engine.get_recommended_sequence(optics)
        
        assert len(sequence) > 0
        # Should start with practice for strong students
        assert sequence[0]['objective'] in ['practice', 'revision']


class TestDailyPlanEngine:
    def test_generate_full_plan(self, exam, topics):
        engine = DailyPlanEngine(exam)
        plans = engine.generate_full_plan()
        
        assert len(plans) > 0
        assert len(plans) <= exam.days_remaining
        
        for plan in plans:
            assert 'date' in plan
            assert 'total_hours' in plan
            assert 'blocks' in plan
            assert plan['total_hours'] <= float(exam.user.preferred_study_hours_per_day)
    
    def test_create_daily_plan(self, exam, topics):
        engine = DailyPlanEngine(exam)
        plan_date = date.today() + timedelta(days=1)
        daily_plan = engine._create_daily_plan(plan_date, topics[:3])
        
        assert daily_plan['date'] == plan_date.isoformat()
        assert 'blocks' in daily_plan
        assert daily_plan['total_hours'] > 0
    
    def test_map_objective_to_block_type(self, exam):
        engine = DailyPlanEngine(exam)
        
        assert engine._map_objective_to_block_type('theory') == 'learn'
        assert engine._map_objective_to_block_type('examples') == 'learn'
        assert engine._map_objective_to_block_type('practice') == 'practice'
        assert engine._map_objective_to_block_type('revision') == 'revise'


class TestRecoveryEngine:
    def test_analyze_progress_no_plans(self, exam):
        engine = RecoveryEngine(exam)
        analysis = engine.analyze_progress()
        
        assert analysis['hours_behind'] == 0
        assert analysis['completion_rate'] == 0
        assert analysis['total_blocks'] == 0
    
    def test_analyze_progress_with_completed(self, exam, user, topics):
        # Create a past study plan with completed blocks
        past_date = date.today() - timedelta(days=2)
        plan = StudyPlan.objects.create(
            user=user,
            exam=exam,
            date=past_date,
            total_hours=Decimal('5.00'),
            status='completed',
            completion_percentage=Decimal('100.00')
        )
        
        block = StudyBlock.objects.create(
            study_plan=plan,
            topic=topics[0],
            block_type='learn',
            order=1,
            planned_duration=120,
            status='completed',
            actual_duration=120,
            completed_at=timezone.now()
        )
        
        engine = RecoveryEngine(exam)
        analysis = engine.analyze_progress()
        
        assert analysis['total_planned_hours'] == 5.0
        assert analysis['total_completed_hours'] == 2.0
        assert analysis['hours_behind'] == 3.0
    
    def test_generate_recovery_plan_minor(self, exam):
        engine = RecoveryEngine(exam)
        # Mock analysis with small delay
        engine.analyze_progress = lambda: {
            'hours_behind': 0.5,
            'completion_rate': 90,
            'behind_topics': [],
        }
        
        recovery = engine.generate_recovery_plan()
        
        assert recovery.hours_behind == Decimal('0.50')
        assert recovery.trigger_reason is not None


class TestReadinessEngine:
    def test_calculate_readiness_no_data(self, exam):
        engine = ReadinessEngine(exam)
        readiness = engine.calculate_readiness()
        
        assert readiness.overall_score >= 0
        assert readiness.overall_score <= 100
        assert readiness.syllabus_coverage == 0
        assert readiness.topic_mastery == 0
        assert readiness.practice_accuracy == 0
        assert readiness.mock_performance == 50  # Default when no mocks
    
    def test_calculate_readiness_with_data(self, exam, user, topics):
        # Add some progress
        topics[0].current_level = 80
        topics[0].save()
        topics[1].current_level = 60
        topics[1].save()
        
        # Add practice performance
        TopicPerformance.objects.create(
            user=user,
            topic=topics[0],
            questions_attempted=20,
            questions_correct=16
        )
        
        # Add mock test
        MockTest.objects.create(
            user=user,
            exam=exam,
            name='Mock 1',
            scheduled_date=date.today() - timedelta(days=2),
            status='completed',
            total_questions=90,
            total_marks=360,
            attempted_questions=80,
            correct_answers=60,
            score=220,
            percentage=Decimal('61.11')
        )
        
        engine = ReadinessEngine(exam)
        readiness = engine.calculate_readiness()
        
        assert readiness.overall_score > 0
        assert readiness.syllabus_coverage > 0
        assert readiness.practice_accuracy > 0
        assert readiness.mock_performance > 0
        assert readiness.explanation is not None
        assert len(readiness.recommendations) > 0
    
    def test_weak_areas_penalty(self, exam, topics):
        # Create a weak critical topic
        topics[0].importance = 'critical'
        topics[0].current_level = 20
        topics[0].weightage = Decimal('15.00')
        topics[0].save()
        
        engine = ReadinessEngine(exam)
        penalty = engine._calculate_weak_areas_penalty()
        
        assert penalty > 0


class TestWhatIfEngine:
    def test_simulate_hours_change(self, exam):
        engine = WhatIfEngine(exam)
        result = engine.simulate_hours_change(3.0)
        
        assert result['scenario_type'] == 'hours_change'
        assert result['parameters']['new_hours_per_day'] == 3.0
        assert 'projected_readiness' in result
        assert 'feasibility' in result
        assert 'recommendations' in result
    
    def test_simulate_topic_skip(self, exam, topics):
        engine = WhatIfEngine(exam)
        topic_ids = [str(topics[0].id), str(topics[1].id)]
        
        result = engine.simulate_topic_skip(topic_ids)
        
        assert result['scenario_type'] == 'topic_skip'
        assert result['parameters']['skipped_count'] == 2
        assert 'projected_readiness' in result
        assert 'readiness_impact' in result
    
    def test_simulate_subject_focus(self, exam, subjects):
        engine = WhatIfEngine(exam)
        result = engine.simulate_subject_focus(str(subjects[0].id), 5)
        
        assert result['scenario_type'] == 'subject_focus'
        assert result['parameters']['focus_days'] == 5
        assert 'projected_readiness' in result
        assert 'other_feasible' in result
    
    def test_simulate_deadline_change(self, exam):
        engine = WhatIfEngine(exam)
        new_date = date.today() + timedelta(days=45)  # 15 more days
        
        result = engine.simulate_deadline_change(new_date)
        
        assert result['scenario_type'] == 'deadline_change'
        assert result['days_difference'] == 15
        assert 'projected_readiness' in result


class TestEngineIntegration:
    def test_full_pipeline(self, exam, subjects, topics):
        """Test the full pipeline: priorities -> budget -> daily plan -> readiness"""
        
        # 1. Calculate priorities
        priority_engine = TopicPriorityEngine(exam)
        priorities = priority_engine.calculate_all_priorities()
        assert len(priorities) == len(topics)
        
        # 2. Calculate time budget
        budget_engine = TimeBudgetEngine(exam)
        budget = budget_engine.allocate_subject_hours()
        assert len(budget['allocations']) == len(subjects)
        
        # 3. Generate daily plan
        daily_engine = DailyPlanEngine(exam)
        plans = daily_engine.generate_full_plan()
        assert len(plans) > 0
        
        # 4. Calculate readiness
        readiness_engine = ReadinessEngine(exam)
        readiness = readiness_engine.calculate_readiness()
        assert readiness.overall_score >= 0
        
        # 5. What-if simulation
        whatif_engine = WhatIfEngine(exam)
        simulation = whatif_engine.simulate_hours_change(4.0)
        assert simulation['projected_readiness'] >= 0