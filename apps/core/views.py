# /core/views.py

from django.contrib.auth.views import LoginView, LogoutView
from django.urls import reverse_lazy


class Login(LoginView):
    template_name = "login.html"

    def get_success_url(self):
        user = self.request.user
        if user.is_authenticated and not user.is_staff:
            groups = set(user.groups.values_list("name", flat=True))
            if "expedicao" in groups and not (groups & {"porteiro", "usuario"}):
                return reverse_lazy("ui:coletas")
        return super().get_success_url()


class Logout(LogoutView):
    pass