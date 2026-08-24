from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.contrib.auth import logout
from django.utils import timezone
from django.utils.dateparse import parse_datetime


LOGIN_AT_SESSION_KEY = "shift_login_at"
SHIFT_TIMES = (time(6), time(18))


def next_shift_logout_at(login_at):
    shift_timezone = ZoneInfo(settings.SHIFT_CHANGE_TIME_ZONE)
    minimum_logout = login_at.astimezone(shift_timezone) + timedelta(hours=12)

    for day_offset in (0, 1):
        day = minimum_logout.date() + timedelta(days=day_offset)
        for shift_time in SHIFT_TIMES:
            candidate = datetime.combine(day, shift_time, shift_timezone)
            if candidate >= minimum_logout:
                return candidate


class ShiftSessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            now = timezone.now()
            login_at = parse_datetime(request.session.get(LOGIN_AT_SESSION_KEY, ""))

            if login_at is None:
                login_at = request.user.last_login or now
                if timezone.is_naive(login_at):
                    login_at = timezone.make_aware(login_at)
                request.session[LOGIN_AT_SESSION_KEY] = login_at.isoformat()
                request.session.set_expiry(next_shift_logout_at(login_at))

            if now >= next_shift_logout_at(login_at):
                logout(request)

        return self.get_response(request)
