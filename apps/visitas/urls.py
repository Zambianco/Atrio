from rest_framework.routers import DefaultRouter
from .views import GrupoVisitaViewSet, VisitaPessoaViewSet, VisitaVeiculoViewSet
from django.urls import path
from .views import PresentesAPIView, GrupoResumoAPIView, RegistrarVisitaAPIView

router = DefaultRouter()
router.register(r'grupos', GrupoVisitaViewSet)
router.register(r'pessoas', VisitaPessoaViewSet)
router.register(r'veiculos', VisitaVeiculoViewSet)

urlpatterns = router.urls + [
    path("presentes/", PresentesAPIView.as_view()),
    path("grupos/<int:grupo_id>/resumo/", GrupoResumoAPIView.as_view()),
    path("registrar/", RegistrarVisitaAPIView.as_view()),
]
