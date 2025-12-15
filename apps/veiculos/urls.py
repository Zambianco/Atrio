# apps/veiculos/urls.py
from rest_framework.routers import DefaultRouter
from .views import VeiculoViewSet

router = DefaultRouter()
router.register("veiculos", VeiculoViewSet, basename="veiculo")  

urlpatterns = router.urls