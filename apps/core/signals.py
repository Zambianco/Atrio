from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from django.utils import timezone

from .shift_session import LOGIN_AT_SESSION_KEY, next_shift_logout_at


@receiver(user_logged_in)
def configure_shift_session_expiry(sender, request, user, **kwargs):
    login_at = timezone.now()
    request.session[LOGIN_AT_SESSION_KEY] = login_at.isoformat()
    request.session.set_expiry(next_shift_logout_at(login_at))
