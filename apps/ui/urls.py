from django.urls import path
from . import views

app_name = "ui"

urlpatterns = [
    path("", views.painel, name="painel"),
    path("nova-visita/", views.nova_visita, name="nova_visita"),
    path("entrada/", views.entrada, name="entrada"),
    path("nova-pessoa/", views.nova_pessoa, name="nova_pessoa"),
    path("novo-veiculo/", views.novo_veiculo, name="novo_veiculo"),
]
