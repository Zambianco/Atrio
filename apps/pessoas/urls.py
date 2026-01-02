# apps/pessoas/urls.py
from rest_framework.routers import DefaultRouter
from .views import PessoaViewSet, DocumentoViewSet, TipoDocumentoViewSet

router = DefaultRouter()
router.register("pessoas", PessoaViewSet, basename="pessoa")
router.register("documentos", DocumentoViewSet, basename="documento")
router.register("tipos-documento", TipoDocumentoViewSet, basename="tipo-documento")

urlpatterns = router.urls
