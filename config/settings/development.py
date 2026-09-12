"""
Development settings for Code Flux project.
"""
from .base import *

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Django Debug Toolbar - only if installed
try:
    import debug_toolbar
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE
    INTERNAL_IPS = ['127.0.0.1', 'localhost']
except ImportError:
    pass

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Disable password validators for development
AUTH_PASSWORD_VALIDATORS = []

# CORS - allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True

# Celery - run tasks eagerly in development
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Logging - more verbose in development
LOGGING['loggers']['PrepPilot']['level'] = 'DEBUG'
LOGGING['loggers']['django']['level'] = 'DEBUG'