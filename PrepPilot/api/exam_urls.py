"""
Exam API URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from PrepPilot.api.views import ExamViewSet, SubjectViewSet, TopicViewSet

router = DefaultRouter()
router.register(r'exams', ExamViewSet, basename='exam')

# Nested routes for subjects and topics
subject_router = DefaultRouter()
subject_router.register(r'subjects', SubjectViewSet, basename='subject')

topic_router = DefaultRouter()
topic_router.register(r'topics', TopicViewSet, basename='topic')

urlpatterns = [
    path('', include(router.urls)),
    
    # Nested subject routes under exam
    path('exams/<uuid:exam_pk>/', include([
        path('subjects/', SubjectViewSet.as_view({'get': 'list', 'post': 'create'}), name='exam-subjects'),
        path('subjects/<uuid:pk>/', SubjectViewSet.as_view({
            'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'
        }), name='exam-subject-detail'),
        
        path('topics/', TopicViewSet.as_view({'get': 'list'}), name='exam-topics'),
        path('topics/<uuid:pk>/', TopicViewSet.as_view({'get': 'retrieve'}), name='exam-topic-detail'),
    ])),
    
    # Nested topic routes under subject
    path('subjects/<uuid:subject_pk>/', include([
        path('topics/', TopicViewSet.as_view({'get': 'list', 'post': 'create'}), name='subject-topics'),
        path('topics/<uuid:pk>/', TopicViewSet.as_view({
            'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'
        }), name='subject-topic-detail'),
    ])),
]