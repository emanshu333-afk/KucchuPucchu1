"""
Vault and Assistant API URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from PrepPilot.api.views import (
    StudyResourceVaultViewSet, AssistantChatViewSet
)

router = DefaultRouter()
router.register(r'vault', StudyResourceVaultViewSet, basename='vault')

urlpatterns = [
    path('', include(router.urls)),

    # Assistant chat endpoint
    path('assistant/ask/', AssistantChatViewSet.as_view({'post': 'create'}), name='assistant-ask'),
]