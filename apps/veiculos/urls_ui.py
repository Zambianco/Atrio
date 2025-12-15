# apps/veiculos/urls_ui.py

from django.urls import path
from .views_ui import novo_veiculo

urlpatterns = [
    path("novo/", novo_veiculo, name="novo_veiculo"),
]