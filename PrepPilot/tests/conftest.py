"""
Pytest configuration for PrepPilot tests.
"""
import pytest
from decimal import Decimal
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from PrepPilot.models import User, Exam, Subject, Topic

User = get_user_model()


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User',
        preferred_study_hours_per_day=Decimal('5.00')
    )


@pytest.fixture
def exam(user):
    """Create a test exam."""
    return Exam.objects.create(
        user=user,
        name='JEE Advanced 2024',
        exam_type='entrance',
        exam_date=date.today() + timedelta(days=30),
        total_marks=360,
        passing_marks=180
    )


@pytest.fixture
def subjects(exam):
    """Create test subjects."""
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
    """Create test topics."""
    topics_list = []
    
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