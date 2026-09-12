"""
Study Plan API URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from PrepPilot.api.views import StudyPlanViewSet, MockTestViewSet

router = DefaultRouter()
router.register(r'plans', StudyPlanViewSet, basename='studyplan')
router.register(r'mocks', MockTestViewSet, basename='mocktest')

urlpatterns = [
    path('', include(router.urls)),
    
    # Nested under exam
    path('exams/<uuid:exam_pk>/', include([
        path('plans/', StudyPlanViewSet.as_view({'get': 'list'}), name='exam-plans'),
        path('plans/today/', StudyPlanViewSet.as_view({'get': 'today'}), name='exam-plan-today'),
        path('plans/<uuid:pk>/', StudyPlanViewSet.as_view({
            'get': 'retrieve', 'post': 'start_block', 'patch': 'complete_block'
        }), name='exam-plan-detail'),
        
        path('mocks/', MockTestViewSet.as_view({'get': 'list', 'post': 'create'}), name='exam-mocks'),
        path('mocks/<uuid:pk>/', MockTestViewSet.as_view({
            'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy',
            'post': 'start'
        }), name='exam-mock-detail'),
        path('mocks/<uuid:pk>/submit/', MockTestViewSet.as_view({'post': 'submit'}), name='exam-mock-submit'),
    ])),
]