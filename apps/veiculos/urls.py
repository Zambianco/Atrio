# apps/veiculos/urls.py
from rest_framework.routers import DefaultRouter
from .views import VeiculoViewSet

router = DefaultRouter()
router.register(r'', VeiculoViewSet)

urlpatterns = router.urls