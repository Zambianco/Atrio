# /apps/pessoas/urls_ui.py

from django.urls import path
from .views_ui import nova_pessoa

urlpatterns = [
    path("nova/", nova_pessoa, name="nova_pessoa"),
]