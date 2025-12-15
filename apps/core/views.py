# /core/views.py

from django.contrib.auth.views import LoginView, LogoutView

class Login(LoginView):
    template_name = "login.html"

class Logout(LogoutView):
    pass