from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from .shift_session import LOGIN_AT_SESSION_KEY, next_shift_logout_at


SAO_PAULO = ZoneInfo("America/Sao_Paulo")


class ShiftSessionTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="porteiro", password="senha")

    def test_logout_is_scheduled_for_first_shift_change_after_twelve_hours(self):
        login_at = datetime(2026, 8, 24, 6, 1, tzinfo=SAO_PAULO)

        self.assertEqual(
            next_shift_logout_at(login_at),
            datetime(2026, 8, 25, 6, 0, tzinfo=SAO_PAULO),
        )

    def test_authenticated_user_is_logged_out_at_scheduled_shift_change(self):
        self.client.force_login(self.user)
        session = self.client.session
        session[LOGIN_AT_SESSION_KEY] = datetime(
            2026, 8, 24, 6, 0, tzinfo=SAO_PAULO
        ).isoformat()
        session.save()

        current_time = datetime(2026, 8, 24, 18, 0, tzinfo=SAO_PAULO)
        with patch("apps.core.shift_session.timezone.now", return_value=current_time):
            response = self.client.get(reverse("ui:painel"))

        self.assertRedirects(response, f"{reverse('login')}?next={reverse('ui:painel')}")
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_authenticated_user_remains_logged_in_before_shift_change(self):
        self.client.force_login(self.user)
        session = self.client.session
        session[LOGIN_AT_SESSION_KEY] = datetime(
            2026, 8, 24, 6, 0, tzinfo=SAO_PAULO
        ).isoformat()
        session.save()

        current_time = datetime(2026, 8, 24, 17, 59, tzinfo=SAO_PAULO)
        with patch("apps.core.shift_session.timezone.now", return_value=current_time):
            self.client.get(reverse("ui:painel"))

        self.assertIn("_auth_user_id", self.client.session)
