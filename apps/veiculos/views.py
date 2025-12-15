# apps/veiculos/views.py

from rest_framework.viewsets import ModelViewSet
from .models import Veiculo
from .serializers import VeiculoSerializer

class VeiculoViewSet(ModelViewSet):
    queryset = Veiculo.objects.all()
    serializer_class = VeiculoSerializer