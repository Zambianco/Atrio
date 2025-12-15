# /apps/visitas/urls_ui.py

from django.urls import path
from .views_ui import nova_visita

urlpatterns = [
    path("nova/", nova_visita, name="nova_visita"),
]