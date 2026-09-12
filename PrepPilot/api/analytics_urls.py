"""
Analytics API URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from PrepPilot.api.views import (
    ReadinessScoreViewSet, WhatIfScenarioViewSet,
    RecoveryPlanViewSet, NotificationViewSet, DashboardView
)

router = DefaultRouter()
router.register(r'readiness', ReadinessScoreViewSet, basename='readiness')
router.register(r'whatif', WhatIfScenarioViewSet, basename='whatif')
router.register(r'recovery', RecoveryPlanViewSet, basename='recovery')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    
    # Dashboard
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    
    # Nested under exam
    path('exams/<uuid:exam_pk>/', include([
        path('readiness/', ReadinessScoreViewSet.as_view({'get': 'list'}), name='exam-readiness'),
        path('readiness/latest/', ReadinessScoreViewSet.as_view({'get': 'list'}), name='exam-readiness-latest'),
        
        path('whatif/', WhatIfScenarioViewSet.as_view({'get': 'list', 'post': 'create'}), name='exam-whatif'),
        path('whatif/simulate/hours/', WhatIfScenarioViewSet.as_view({'post': 'simulate_hours'}), name='whatif-hours'),
        path('whatif/simulate/skip/', WhatIfScenarioViewSet.as_view({'post': 'simulate_skip'}), name='whatif-skip'),
        path('whatif/simulate/focus/', WhatIfScenarioViewSet.as_view({'post': 'simulate_focus'}), name='whatif-focus'),
        path('whatif/simulate/deadline/', WhatIfScenarioViewSet.as_view({'post': 'simulate_deadline'}), name='whatif-deadline'),
        path('whatif/simulate/custom/', WhatIfScenarioViewSet.as_view({'post': 'simulate_custom'}), name='whatif-custom'),
        
        path('recovery/', RecoveryPlanViewSet.as_view({'get': 'list'}), name='exam-recovery'),
        
        path('notifications/', NotificationViewSet.as_view({'get': 'list'}), name='exam-notifications'),
    ])),
]