"""
Authentication API URLs
"""
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from PrepPilot.api.views import UserViewSet, GoogleLoginView, GoogleCallbackView
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('register/', UserViewSet.as_view({'post': 'create'}), name='register'),
    
    # Google OAuth2
    path('google/login/', GoogleLoginView.as_view(), name='google_login'),
    path('google/callback/', GoogleCallbackView.as_view(), name='google_callback'),
    
    # Allauth URLs (for web-based OAuth flow)
    path('social/', include('allauth.socialaccount.urls')),
    
    path('', include(router.urls)),
]