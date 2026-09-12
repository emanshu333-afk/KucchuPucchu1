"""
Custom Allauth Adapters for PrepPilot.

Handles:
- Custom User model (email-based, UUID PK)
- JWT token generation on social login
- User profile creation from Google profile
"""
import logging
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

from PrepPilot.models import User

logger = logging.getLogger(__name__)


class AccountAdapter(DefaultAccountAdapter):
    """Custom account adapter for email-based authentication."""
    
    def is_open_for_signup(self, request):
        """Allow signup - controlled by frontend."""
        return True
    
    def save_user(self, request, user, form, commit=True):
        """Save user with custom fields."""
        user = super().save_user(request, user, form, commit=False)
        user.save()
        return user
    
    def get_login_redirect_url(self, request):
        """Redirect to frontend after login."""
        return getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    """Custom social account adapter for Google OAuth."""
    
    def is_open_for_signup(self, request, sociallogin):
        """Allow signup via Google."""
        return True
    
    def pre_social_login(self, request, sociallogin):
        """Link social account to existing user if email matches."""
        email = sociallogin.account.extra_data.get('email')
        if email:
            try:
                user = User.objects.get(email__iexact=email)
                sociallogin.connect(request, user)
            except User.DoesNotExist:
                pass  # New user will be created
            except User.MultipleObjectsReturned:
                logger.warning(f"Multiple users with email: {email}")
    
    def save_user(self, request, sociallogin, form=None):
        """Save user from Google profile data."""
        user = super().save_user(request, sociallogin, form)
        
        # Update user with Google profile data
        extra_data = sociallogin.account.extra_data
        if extra_data.get('given_name'):
            user.first_name = extra_data['given_name']
        if extra_data.get('family_name'):
            user.last_name = extra_data['family_name']
        if extra_data.get('picture'):
            # Could save avatar URL if you add avatar field
            pass
        user.save()
        
        return user
    
    def populate_user(self, request, sociallogin, data):
        """Populate user data from Google."""
        user = super().populate_user(request, sociallogin, data)
        user.email = data.get('email', '')
        user.username = data.get('email', '').split('@')[0]  # Temporary username
        return user
    
    def get_app(self, request, provider):
        """Get the SocialApp for the provider."""
        from allauth.socialaccount.models import SocialApp
        try:
            return SocialApp.objects.get(provider=provider, sites=settings.SITE_ID)
        except SocialApp.DoesNotExist:
            logger.warning(f"No SocialApp configured for {provider}")
            return None


class GoogleOAuth2AdapterCustom(GoogleOAuth2Adapter):
    """Custom Google OAuth2 adapter with PKCE support."""
    pass


def get_tokens_for_user(user):
    """Generate JWT tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }