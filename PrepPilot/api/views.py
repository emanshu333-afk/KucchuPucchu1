"""
API Views for PrepPilot.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import date, timedelta
from django.db.models import Q
from django.conf import settings
from django.http import HttpResponseRedirect
from urllib.parse import urlencode

from PrepPilot.models import (
    User, Exam, Subject, Topic, Resource,
    StudyPlan, StudyBlock, MockTest,
    TopicPerformance, ReadinessScore,
    WhatIfScenario, RecoveryPlan, Notification,
    StudyResourceVault, AssistantConversation,
)
from PrepPilot.api.serializers import (
    UserSerializer, UserRegistrationSerializer,
    ExamSerializer, SubjectSerializer, TopicSerializer, ResourceSerializer,
    StudyBlockSerializer, StudyPlanSerializer, MockTestSerializer,
    TopicPerformanceSerializer, ReadinessScoreSerializer,
    WhatIfScenarioSerializer, RecoveryPlanSerializer, NotificationSerializer,
    StudyResourceVaultSerializer, AssistantChatSerializer,
)
from PrepPilot.engines import (
    TopicPriorityEngine, TimeBudgetEngine, ResourceMatcherEngine,
    DailyPlanEngine, RecoveryEngine, ReadinessEngine, WhatIfEngine,
    StudyAssistantEngine, FastStudyAssistant,
)
from PrepPilot.adapters import get_tokens_for_user


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return User.objects.filter(id=self.request.user.id)
    
    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        """Get or update current user profile."""
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def onboard(self, request):
        """Complete user onboarding."""
        user = request.user
        user.is_onboarded = True
        user.save(update_fields=['is_onboarded'])
        return Response({'status': 'onboarding completed'})


class ExamViewSet(viewsets.ModelViewSet):
    serializer_class = ExamSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Exam.objects.filter(user=self.request.user).prefetch_related('subjects')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def overview(self, request, pk=None):
        """Get exam overview with all related data."""
        exam = self.get_object()
        
        # Get subjects with topics
        subjects = Subject.objects.filter(exam=exam).prefetch_related('topics')
        subject_data = SubjectSerializer(subjects, many=True).data
        
        # Get latest readiness score
        readiness = exam.readiness_scores.first()
        readiness_data = ReadinessScoreSerializer(readiness).data if readiness else None
        
        # Get upcoming study plans
        upcoming_plans = StudyPlan.objects.filter(
            exam=exam,
            date__gte=timezone.now().date()
        ).order_by('date')[:14]
        plans_data = StudyPlanSerializer(upcoming_plans, many=True).data
        
        # Get upcoming mock tests
        upcoming_mocks = MockTest.objects.filter(
            exam=exam,
            scheduled_date__gte=timezone.now().date()
        ).order_by('scheduled_date')[:5]
        mocks_data = MockTestSerializer(upcoming_mocks, many=True).data
        
        return Response({
            'exam': ExamSerializer(exam).data,
            'subjects': subject_data,
            'readiness': readiness_data,
            'upcoming_plans': plans_data,
            'upcoming_mocks': mocks_data,
        })
    
    @action(detail=True, methods=['post'])
    def generate_plan(self, request, pk=None):
        """Generate study plan for exam."""
        exam = self.get_object()
        engine = DailyPlanEngine(exam)
        plans = engine.generate_full_plan()
        saved_plans = engine.save_plan_to_database(plans)
        
        return Response({
            'message': f'Generated {len(saved_plans)} days of study plans',
            'plans': StudyPlanSerializer(saved_plans, many=True).data,
        })
    
    @action(detail=True, methods=['post'])
    def calculate_priorities(self, request, pk=None):
        """Calculate topic priorities."""
        exam = self.get_object()
        engine = TopicPriorityEngine(exam)
        priorities = engine.calculate_all_priorities()
        distribution = engine.get_priority_distribution()
        
        return Response({
            'priorities': priorities,
            'distribution': distribution,
        })
    
    @action(detail=True, methods=['post'])
    def calculate_readiness(self, request, pk=None):
        """Calculate exam readiness score."""
        exam = self.get_object()
        engine = ReadinessEngine(exam)
        readiness = engine.calculate_readiness()
        
        return Response(ReadinessScoreSerializer(readiness).data)
    
    @action(detail=True, methods=['get'])
    def readiness_trend(self, request, pk=None):
        """Get readiness score trend."""
        exam = self.get_object()
        engine = ReadinessEngine(exam)
        trend = engine.get_readiness_trend()
        return Response(trend)
    
    @action(detail=True, methods=['post'])
    def check_recovery(self, request, pk=None):
        """Check if recovery is needed and generate plan."""
        exam = self.get_object()
        engine = RecoveryEngine(exam)
        analysis = engine.analyze_progress()
        
        if analysis['hours_behind'] > 1:
            recovery_plan = engine.generate_recovery_plan()
            return Response({
                'recovery_needed': True,
                'analysis': analysis,
                'recovery_plan': RecoveryPlanSerializer(recovery_plan).data,
                'options': engine.get_recovery_options(),
            })
        
        return Response({
            'recovery_needed': False,
            'analysis': analysis,
        })
    
    @action(detail=True, methods=['post'])
    def apply_recovery(self, request, pk=None):
        """Apply a recovery plan."""
        exam = self.get_object()
        recovery_plan_id = request.data.get('recovery_plan_id')
        
        if not recovery_plan_id:
            return Response(
                {'error': 'recovery_plan_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        recovery_plan = get_object_or_404(RecoveryPlan, id=recovery_plan_id, exam=exam)
        engine = RecoveryEngine(exam)
        result = engine.apply_recovery_plan(recovery_plan)
        
        return Response(result)
    
    @action(detail=True, methods=['get'])
    def time_budget(self, request, pk=None):
        """Get time budget analysis."""
        exam = self.get_object()
        engine = TimeBudgetEngine(exam)
        budget = engine.calculate_total_budget()
        allocations = engine.allocate_subject_hours()
        feasibility = engine.check_feasibility()
        daily = engine.get_daily_budget()
        
        return Response({
            'budget': budget,
            'allocations': allocations['allocations'],
            'feasibility': feasibility,
            'daily_budget': daily,
        })


class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        exam_id = self.kwargs.get('exam_pk') or self.request.query_params.get('exam')
        if exam_id:
            return Subject.objects.filter(exam_id=exam_id, exam__user=self.request.user)
        return Subject.objects.filter(exam__user=self.request.user)
    
    def perform_create(self, serializer):
        exam_id = self.kwargs.get('exam_pk') or self.request.data.get('exam')
        exam = get_object_or_404(Exam, id=exam_id, user=self.request.user)
        serializer.save(exam=exam)


class TopicViewSet(viewsets.ModelViewSet):
    serializer_class = TopicSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        exam_id = self.kwargs.get('exam_pk') or self.request.query_params.get('exam')
        subject_id = self.kwargs.get('subject_pk') or self.request.query_params.get('subject')
        
        queryset = Topic.objects.filter(subject__exam__user=self.request.user)
        
        if exam_id:
            queryset = queryset.filter(subject__exam_id=exam_id)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        
        return queryset.select_related('subject')
    
    def perform_create(self, serializer):
        subject_id = self.kwargs.get('subject_pk') or self.request.data.get('subject')
        subject = get_object_or_404(Subject, id=subject_id, exam__user=self.request.user)
        serializer.save(subject=subject)
    
    @action(detail=True, methods=['get'])
    def resources(self, request, pk=None):
        """Get recommended resources for topic."""
        topic = self.get_object()
        engine = ResourceMatcherEngine(request.user)
        sequence = engine.get_recommended_sequence(topic)
        gaps = engine.get_resource_gaps(topic)
        
        return Response({
            'sequence': sequence,
            'gaps': gaps,
            'suggestions': engine.recommend_additional_resources(topic, gaps),
        })
    
    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """Update topic progress."""
        topic = self.get_object()
        current_level = request.data.get('current_level')
        confidence_level = request.data.get('confidence_level')
        
        if current_level is not None:
            topic.current_level = min(max(int(current_level), 0), 100)
        if confidence_level is not None:
            topic.confidence_level = min(max(int(confidence_level), 0), 100)
        
        if topic.current_level >= 100:
            topic.is_completed = True
            topic.completed_at = timezone.now()
        
        topic.calculate_priority()
        topic.save()
        
        return Response(TopicSerializer(topic).data)
    
    @action(detail=True, methods=['post'])
    def record_practice(self, request, pk=None):
        """Record practice session for topic."""
        topic = self.get_object()
        user = request.user
        
        performance, _ = TopicPerformance.objects.get_or_create(user=user, topic=topic)
        
        questions_attempted = request.data.get('questions_attempted', 0)
        questions_correct = request.data.get('questions_correct', 0)
        
        performance.questions_attempted += questions_attempted
        performance.questions_correct += questions_correct
        performance.questions_wrong += questions_attempted - questions_correct
        performance.total_time_spent += request.data.get('time_spent', 0)
        performance.last_practiced = timezone.now()
        
        if performance.questions_attempted > 0:
            performance.accuracy = round(
                (performance.questions_correct / performance.questions_attempted) * 100, 2
            )
        
        performance.save()
        
        return Response(TopicPerformanceSerializer(performance).data)


class StudyPlanViewSet(viewsets.ModelViewSet):
    serializer_class = StudyPlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        exam_id = self.kwargs.get('exam_pk') or self.request.query_params.get('exam')
        queryset = StudyPlan.objects.filter(user=self.request.user)
        
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        
        return queryset.prefetch_related('blocks__topic')
    
    @action(detail=True, methods=['post'])
    def start_block(self, request, pk=None):
        """Start a study block."""
        plan = self.get_object()
        block_id = request.data.get('block_id')
        block = get_object_or_404(StudyBlock, id=block_id, study_plan=plan)
        
        block.status = 'in_progress'
        block.started_at = timezone.now()
        block.save(update_fields=['status', 'started_at'])
        
        plan.status = 'in_progress'
        plan.save(update_fields=['status'])
        
        return Response(StudyBlockSerializer(block).data)
    
    @action(detail=True, methods=['post'])
    def complete_block(self, request, pk=None):
        """Complete a study block."""
        plan = self.get_object()
        block_id = request.data.get('block_id')
        block = get_object_or_404(StudyBlock, id=block_id, study_plan=plan)
        
        block.status = 'completed'
        block.completed_at = timezone.now()
        block.completion_percentage = 100
        block.actual_duration = request.data.get('actual_duration', block.planned_duration)
        block.notes = request.data.get('notes', '')
        block.save()
        
        # Update plan progress
        total = plan.blocks.count()
        completed = plan.blocks.filter(status='completed').count()
        plan.completion_percentage = round((completed / total) * 100, 2) if total > 0 else 0
        if plan.completion_percentage == 100:
            plan.status = 'completed'
            plan.completed_at = timezone.now()
        plan.save()
        
        return Response(StudyBlockSerializer(block).data)
    
    @action(detail=True, methods=['get'])
    def today(self, request, pk=None):
        """Get today's study plan."""
        exam = get_object_or_404(Exam, id=pk, user=request.user)
        today = timezone.now().date()
        
        plan = StudyPlan.objects.filter(
            user=request.user,
            exam=exam,
            date=today
        ).prefetch_related('blocks__topic').first()
        
        if not plan:
            return Response({'message': 'No plan for today'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(StudyPlanSerializer(plan).data)


class MockTestViewSet(viewsets.ModelViewSet):
    serializer_class = MockTestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        exam_id = self.kwargs.get('exam_pk') or self.request.query_params.get('exam')
        queryset = MockTest.objects.filter(user=self.request.user)
        
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        
        return queryset.prefetch_related('subjects')
    
    def perform_create(self, serializer):
        exam_id = self.kwargs.get('exam_pk') or self.request.data.get('exam')
        exam = get_object_or_404(Exam, id=exam_id, user=self.request.user)
        serializer.save(user=self.request.user, exam=exam)
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start a mock test."""
        mock = self.get_object()
        mock.status = 'in_progress'
        mock.started_at = timezone.now()
        mock.save(update_fields=['status', 'started_at'])
        return Response(MockTestSerializer(mock).data)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit mock test results."""
        mock = self.get_object()
        
        mock.status = 'completed'
        mock.completed_at = timezone.now()
        mock.attempted_questions = request.data.get('attempted_questions', 0)
        mock.correct_answers = request.data.get('correct_answers', 0)
        mock.wrong_answers = request.data.get('wrong_answers', 0)
        mock.skipped_questions = request.data.get('skipped_questions', 0)
        mock.score = request.data.get('score', 0)
        mock.strong_areas = request.data.get('strong_areas', [])
        mock.weak_areas = request.data.get('weak_areas', [])
        mock.time_management_score = request.data.get('time_management_score', 0)
        
        if mock.total_marks > 0:
            mock.percentage = round((mock.score / mock.total_marks) * 100, 2)
        
        mock.save()
        
        return Response(MockTestSerializer(mock).data)


class ReadinessScoreViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReadinessScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        exam_id = self.kwargs.get('exam_pk') or self.request.query_params.get('exam')
        queryset = ReadinessScore.objects.filter(user=self.request.user)
        
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        
        return queryset


class WhatIfScenarioViewSet(viewsets.ModelViewSet):
    serializer_class = WhatIfScenarioSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        exam_id = self.kwargs.get('exam_pk') or self.request.query_params.get('exam')
        queryset = WhatIfScenario.objects.filter(user=self.request.user)
        
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        
        return queryset
    
    def perform_create(self, serializer):
        exam_id = self.kwargs.get('exam_pk') or self.request.data.get('exam')
        exam = get_object_or_404(Exam, id=exam_id, user=self.request.user)
        serializer.save(user=self.request.user, exam=exam)
    
    @action(detail=False, methods=['post'])
    def simulate_hours(self, request):
        """Simulate hours per day change."""
        exam_id = request.data.get('exam')
        new_hours = request.data.get('hours_per_day')
        
        exam = get_object_or_404(Exam, id=exam_id, user=request.user)
        engine = WhatIfEngine(exam)
        result = engine.simulate_hours_change(float(new_hours))
        
        # Save scenario
        scenario = engine.save_scenario(
            name=f"What if {new_hours} hours/day",
            scenario_type='hours_change',
            parameters={'hours_per_day': new_hours},
            results=result,
        )
        
        return Response({
            'simulation': result,
            'saved_scenario': WhatIfScenarioSerializer(scenario).data,
        })
    
    @action(detail=False, methods=['post'])
    def simulate_skip(self, request):
        """Simulate skipping topics."""
        exam_id = request.data.get('exam')
        topic_ids = request.data.get('topic_ids', [])
        
        exam = get_object_or_404(Exam, id=exam_id, user=request.user)
        engine = WhatIfEngine(exam)
        result = engine.simulate_topic_skip(topic_ids)
        
        scenario = engine.save_scenario(
            name=f"What if skip {len(topic_ids)} topics",
            scenario_type='topic_skip',
            parameters={'topic_ids': topic_ids},
            results=result,
        )
        
        return Response({
            'simulation': result,
            'saved_scenario': WhatIfScenarioSerializer(scenario).data,
        })
    
    @action(detail=False, methods=['post'])
    def simulate_focus(self, request):
        """Simulate subject focus."""
        exam_id = request.data.get('exam')
        subject_id = request.data.get('subject_id')
        focus_days = request.data.get('focus_days')
        
        exam = get_object_or_404(Exam, id=exam_id, user=request.user)
        engine = WhatIfEngine(exam)
        result = engine.simulate_subject_focus(subject_id, int(focus_days))
        
        scenario = engine.save_scenario(
            name=f"What if focus on subject for {focus_days} days",
            scenario_type='subject_focus',
            parameters={'subject_id': subject_id, 'focus_days': focus_days},
            results=result,
        )
        
        return Response({
            'simulation': result,
            'saved_scenario': WhatIfScenarioSerializer(scenario).data,
        })
    
    @action(detail=False, methods=['post'])
    def simulate_deadline(self, request):
        """Simulate exam date change."""
        exam_id = request.data.get('exam')
        new_date = request.data.get('new_exam_date')
        
        exam = get_object_or_404(Exam, id=exam_id, user=request.user)
        engine = WhatIfEngine(exam)
        
        from datetime import date
        new_date_obj = date.fromisoformat(new_date)
        result = engine.simulate_deadline_change(new_date_obj)
        
        scenario = engine.save_scenario(
            name=f"What if exam on {new_date}",
            scenario_type='deadline_change',
            parameters={'new_exam_date': new_date},
            results=result,
        )
        
        return Response({
            'simulation': result,
            'saved_scenario': WhatIfScenarioSerializer(scenario).data,
        })
    
    @action(detail=False, methods=['post'])
    def simulate_custom(self, request):
        """Simulate custom scenario."""
        exam_id = request.data.get('exam')
        parameters = request.data.get('parameters', {})
        
        exam = get_object_or_404(Exam, id=exam_id, user=request.user)
        engine = WhatIfEngine(exam)
        result = engine.simulate_custom_scenario(parameters)
        
        scenario = engine.save_scenario(
            name="Custom scenario",
            scenario_type='custom',
            parameters=parameters,
            results=result,
        )
        
        return Response({
            'simulation': result,
            'saved_scenario': WhatIfScenarioSerializer(scenario).data,
        })


class RecoveryPlanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RecoveryPlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        exam_id = self.kwargs.get('exam_pk') or self.request.query_params.get('exam')
        queryset = RecoveryPlan.objects.filter(user=self.request.user)
        
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        
        return queryset


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=['is_read', 'read_at'])
        return Response({'status': 'marked as read'})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'status': 'all marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get unread notification count."""
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})


class DashboardView(APIView):
    """Main dashboard view with aggregated data."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Active exams
        active_exams = Exam.objects.filter(user=user, is_active=True, is_completed=False)
        
        # Today's study plan
        today = timezone.now().date()
        today_plans = StudyPlan.objects.filter(
            user=user,
            date=today
        ).prefetch_related('blocks__topic')
        
        # Upcoming mock tests
        upcoming_mocks = MockTest.objects.filter(
            user=user,
            scheduled_date__gte=today,
            status='scheduled'
        ).order_by('scheduled_date')[:3]
        
        # Latest readiness scores
        latest_readiness = ReadinessScore.objects.filter(user=user).order_by('-calculated_at')[:5]
        
        # Unread notifications
        unread_count = Notification.objects.filter(user=user, is_read=False).count()
        
        # Recent recovery plans
        recent_recovery = RecoveryPlan.objects.filter(user=user).order_by('-created_at')[:3]
        
        return Response({
            'active_exams': ExamSerializer(active_exams, many=True).data,
            'today_plans': StudyPlanSerializer(today_plans, many=True).data,
            'upcoming_mocks': MockTestSerializer(upcoming_mocks, many=True).data,
            'readiness_scores': ReadinessScoreSerializer(latest_readiness, many=True).data,
            'unread_notifications': unread_count,
            'recent_recovery': RecoveryPlanSerializer(recent_recovery, many=True).data,
        })


class StudyResourceVaultViewSet(viewsets.ModelViewSet):
    """Private vault + public shared resources.

    GET /api/v1/vault/         -> list my items + published items from others
    POST /api/v1/vault/        -> create new vault item (private)
    POST /api/v1/vault/{id}/publish/   -> publish my item
    POST /api/v1/vault/{id}/unpublish/ -> unpublish my item
    """
    serializer_class = StudyResourceVaultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Own items (private + published) + published items from other users
        return StudyResourceVault.objects.filter(
            Q(owner=self.request.user) | Q(is_published=True)
        ).select_related('owner', 'related_topic')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        item = self.get_object()
        if item.owner != request.user:
            return Response(
                {'detail': 'Only the owner can publish.'},
                status=status.HTTP_403_FORBIDDEN
            )
        item.publish()
        return Response(StudyResourceVaultSerializer(item).data)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        item = self.get_object()
        if item.owner != request.user:
            return Response(
                {'detail': 'Only the owner can unpublish.'},
                status=status.HTTP_403_FORBIDDEN
            )
        item.unpublish()
        return Response(StudyResourceVaultSerializer(item).data)


class AssistantChatViewSet(viewsets.ViewSet):
    """Fast on-screen study assistant - grounded answers with instant classification.

    POST /api/v1/assistant/ask/
    {
        "question": "How do I revise Electrostatics effectively?"
    }
    
    Response includes:
    - answer: grounded response (refined by flash model if API key present)
    - model_used: which model was used
    - task_type: classified task type
    - sources: grounded citations from user's data
    - topics: matched topic IDs
    - vault_items: matched vault item IDs
    """
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        question = request.data.get('question', '')
        engine = FastStudyAssistant(request.user)
        result = engine.answer(question)
        return Response(result)


class GoogleLoginView(APIView):
    """
    Initiate Google OAuth2 login.
    Redirects to Google's OAuth2 authorization page.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
        from allauth.socialaccount.providers.oauth2.client import OAuth2Client
        from allauth.socialaccount.models import SocialApp
        from django.conf import settings
        
        try:
            app = SocialApp.objects.get(provider='google', sites=settings.SITE_ID)
        except SocialApp.DoesNotExist:
            return Response(
                {'error': 'Google OAuth not configured. Add SocialApp in Django admin.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Build Google OAuth URL
        client_id = app.client_id
        redirect_uri = settings.GOOGLE_OAUTH_REDIRECT_URI
        scope = ' '.join(['profile', 'email'])
        state = 'preppilot_auth'
        
        auth_url = (
            'https://accounts.google.com/o/oauth2/v2/auth?'
            f'client_id={client_id}&'
            f'redirect_uri={redirect_uri}&'
            f'scope={scope}&'
            f'response_type=code&'
            f'access_type=online&'
            f'state={state}&'
            f'prompt=select_account'
        )
        
        return HttpResponseRedirect(auth_url)


class GoogleCallbackView(APIView):
    """
    Handle Google OAuth2 callback.
    Exchanges authorization code for tokens and creates/updates user.
    Returns JWT tokens.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
        from allauth.socialaccount.providers.oauth2.client import OAuth2Client
        from allauth.socialaccount.models import SocialApp, SocialAccount, SocialToken
        from allauth.socialaccount.helpers import complete_social_login
        from django.contrib.auth import login
        import requests
        
        code = request.GET.get('code')
        error = request.GET.get('error')
        
        if error:
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            return HttpResponseRedirect(f'{frontend_url}/auth/error?error={error}')
        
        if not code:
            return Response(
                {'error': 'No authorization code received'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            app = SocialApp.objects.get(provider='google', sites=settings.SITE_ID)
        except SocialApp.DoesNotExist:
            return Response(
                {'error': 'Google OAuth not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Exchange code for access token
        token_url = 'https://oauth2.googleapis.com/token'
        token_data = {
            'code': code,
            'client_id': app.client_id,
            'client_secret': app.secret,
            'redirect_uri': settings.GOOGLE_OAUTH_REDIRECT_URI,
            'grant_type': 'authorization_code',
        }
        
        token_response = requests.post(token_url, data=token_data)
        if token_response.status_code != 200:
            return Response(
                {'error': 'Failed to exchange code for token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tokens = token_response.json()
        access_token = tokens.get('access_token')
        
        # Get user info from Google
        userinfo_response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        if userinfo_response.status_code != 200:
            return Response(
                {'error': 'Failed to get user info from Google'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        userinfo = userinfo_response.json()
        email = userinfo.get('email')
        google_id = userinfo.get('id')
        first_name = userinfo.get('given_name', '')
        last_name = userinfo.get('family_name', '')
        picture = userinfo.get('picture', '')
        
        if not email:
            return Response(
                {'error': 'Email not provided by Google'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],
                'first_name': first_name,
                'last_name': last_name,
            }
        )
        
        if created or not user.first_name:
            user.first_name = first_name or user.first_name
            user.last_name = last_name or user.last_name
            user.save()
        
        # Create or update SocialAccount
        social_account, _ = SocialAccount.objects.get_or_create(
            user=user,
            provider='google',
            uid=google_id,
            defaults={
                'extra_data': userinfo,
            }
        )
        
        # Create or update SocialToken
        SocialToken.objects.update_or_create(
            account=social_account,
            app=app,
            defaults={
                'token': access_token,
                'token_secret': tokens.get('refresh_token', ''),
                'expires_at': timezone.now() + timezone.timedelta(seconds=tokens.get('expires_in', 3600)),
            }
        )
        
        # Generate JWT tokens
        jwt_tokens = get_tokens_for_user(user)
        
        # Redirect to frontend with tokens
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        redirect_url = f'{frontend_url}/auth/callback?' + urlencode({
            'access': jwt_tokens['access'],
            'refresh': jwt_tokens['refresh'],
            'user_id': str(user.id),
            'email': user.email,
            'name': user.get_full_name(),
        })
        
        return HttpResponseRedirect(redirect_url)