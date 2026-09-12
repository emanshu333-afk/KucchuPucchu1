"""
URL configuration for Code Flux project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from PrepPilot.views import dashboard_3d

urlpatterns = [
    # Home page - 3D Dashboard
    path('', dashboard_3d, name='home'),
    path('dashboard/', dashboard_3d, name='dashboard'),
    
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API Endpoints
    path('api/v1/auth/', include('PrepPilot.api.auth_urls')),
    path('api/v1/exams/', include('PrepPilot.api.exam_urls')),
    path('api/v1/study/', include('PrepPilot.api.study_urls')),
    path('api/v1/analytics/', include('PrepPilot.api.analytics_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)