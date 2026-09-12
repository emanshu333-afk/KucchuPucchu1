"""
Production settings for Code Flux project.
"""
from .base import *

DEBUG = False

# Security
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'

# Allowed hosts from environment
ALLOWED_HOSTS = env('ALLOWED_HOSTS')

# Database connection pooling
DATABASES['default']['CONN_MAX_AGE'] = 60

# Static files with Whitenoise
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

# Email
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

# Logging
LOGGING['handlers']['file'] = {
    'class': 'logging.handlers.RotatingFileHandler',
    'filename': BASE_DIR / 'logs' / 'django.log',
    'maxBytes': 1024 * 1024 * 10,  # 10 MB
    'backupCount': 5,
    'formatter': 'verbose',
}
LOGGING['root']['handlers'] = ['console', 'file']
LOGGING['loggers']['django']['handlers'] = ['console', 'file']
LOGGING['loggers']['PrepPilot']['handlers'] = ['console', 'file']

# Cache
CACHES['default']['OPTIONS']['CONNECTION_POOL_KWARGS'] = {
    'max_connections': 50,
}