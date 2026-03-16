from django.urls import path
from django.views.generic import RedirectView
from . import views

app_name = "ui"

urlpatterns = [
    path("", views.painel, name="painel"),
    path("hora-atual/", views.hora_atual, name="hora_atual"),
    path("hora/", views.relogio, name="relogio"),
    path("nova-visita/", views.nova_visita, name="nova_visita"),
    path("entrada/", views.entrada, name="entrada"),
    path("cadastro-pessoa/", views.cadastro_pessoa, name="cadastro_pessoa"),
    path("cadastro-veiculo/", views.cadastro_veiculo, name="cadastro_veiculo"),
    path(
        "nova-pessoa/",
        RedirectView.as_view(pattern_name="ui:cadastro_pessoa", permanent=False),
    ),
    path(
        "novo-veiculo/",
        RedirectView.as_view(pattern_name="ui:cadastro_veiculo", permanent=False),
    ),
    path("visitas/", views.visitas, name="visitas"),
    path('visitas/<int:id>/', views.gerenciar_visita, name='gerenciar_visita'),
    path("coletas/", views.coletas, name="coletas"),
     
]
