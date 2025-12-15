# apps/painel/urls.py
from django.urls import path
from .views import painel_portaria


urlpatterns = [
    path("", painel_portaria, name="painel"),
]