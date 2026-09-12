from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from datetime import timedelta
from PrepPilot.models import Exam, Subject, Topic, StudyPlan, StudyBlock, MockTest, ReadinessScore


@login_required
def dashboard_3d(request):
    """3D Interactive Dashboard"""
    user = request.user
    today = timezone.now().date()
    
    # Get active exams
    exams = Exam.objects.filter(user=user, is_active=True, is_completed=False).prefetch_related('subjects__topics', 'mock_tests')
    
    exams_data = []
    for exam in exams:
        subjects = exam.subjects.all()
        topics = Topic.objects.filter(subject__in=subjects)
        mocks = exam.mock_tests.filter(status='scheduled')
        latest_readiness = exam.readiness_scores.first()
        
        exams_data.append({
            'id': exam.id,
            'name': exam.name,
            'type': exam.get_exam_type_display(),
            'days_left': exam.days_remaining,
            'readiness': float(latest_readiness.overall_score) if latest_readiness else 0,
            'subjects_count': subjects.count(),
            'topics_count': topics.count(),
            'mocks_count': mocks.count(),
            'exam_date': exam.exam_date,
        })
    
    # Today's study blocks
    today_plans = StudyPlan.objects.filter(user=user, date=today).prefetch_related('blocks__topic__subject')
    today_blocks = []
    for plan in today_plans:
        for block in plan.blocks.all().order_by('order'):
            today_blocks.append({
                'id': block.id,
                'topic': block.topic.name if block.topic else 'General Review',
                'subject': block.topic.subject.name if block.topic and block.topic.subject else 'General',
                'type': block.get_block_type_display(),
                'duration': f"{block.planned_duration} min",
                'time': block.started_at.strftime('%H:%M') if block.started_at else 'Anytime',
                'priority': block.topic.priority if block.topic else 'should_do',
            })
    
    # If no blocks, show sample
    if not today_blocks:
        today_blocks = [
            {'id': 1, 'topic': 'Electrostatics', 'subject': 'Physics', 'type': 'Learn Theory', 'duration': '60 min', 'time': '09:00', 'priority': 'must_do'},
            {'id': 2, 'topic': 'Electrostatics', 'subject': 'Physics', 'type': 'Practice Questions', 'duration': '45 min', 'time': '10:00', 'priority': 'must_do'},
            {'id': 3, 'topic': 'Chemical Bonding', 'subject': 'Chemistry', 'type': 'Learn Theory', 'duration': '60 min', 'time': '11:30', 'priority': 'should_do'},
            {'id': 4, 'topic': 'Calculus', 'subject': 'Mathematics', 'type': 'Practice Questions', 'duration': '90 min', 'time': '14:00', 'priority': 'must_do'},
            {'id': 5, 'topic': 'Daily Revision', 'subject': 'All', 'type': 'Revision', 'duration': '30 min', 'time': '16:00', 'priority': 'if_time'},
        ]
    
    # Stats
    total_exams = exams.count()
    total_hours_today = sum(int(b['duration'].split()[0]) for b in today_blocks)
    avg_readiness = sum(e['readiness'] for e in exams_data) / len(exams_data) if exams_data else 0
    days_to_nearest = min([e['days_left'] for e in exams_data]) if exams_data else 0
    
    stats = [
        {'label': 'Active Exams', 'value': total_exams, 'change': f'{total_exams} targets'},
        {'label': 'Study Today', 'value': f'{total_hours_today}h', 'change': f'{len(today_blocks)} blocks planned'},
        {'label': 'Avg Readiness', 'value': f'{avg_readiness:.0f}%', 'change': 'Last updated today'},
        {'label': 'Nearest Exam', 'value': f'{days_to_nearest}d', 'change': 'Days remaining'},
    ]
    
    # Readiness breakdown
    readiness = [
        {'label': 'Syllabus Coverage', 'value': 78, 'color': 'var(--accent-500)', 'desc': 'Topics with progress', 'offset': 282.7 * (1 - 0.78)},
        {'label': 'Topic Mastery', 'value': 65, 'color': 'var(--amber-500)', 'desc': 'Weighted by importance', 'offset': 282.7 * (1 - 0.65)},
        {'label': 'Practice Accuracy', 'value': 72, 'color': '#3b82f6', 'desc': 'Questions correct', 'offset': 282.7 * (1 - 0.72)},
        {'label': 'Mock Performance', 'value': 58, 'color': '#ef4444', 'desc': 'Recent test scores', 'offset': 282.7 * (1 - 0.58)},
    ]
    
    context = {
        'exams': exams_data,
        'today_blocks': today_blocks,
        'stats': stats,
        'readiness': readiness,
    }
    return render(request, 'dashboard_3d.html', context)


@login_required
def dashboard(request):
    """Original dashboard - redirect to 3D"""
    return dashboard_3d(request)