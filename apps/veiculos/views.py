# apps/veiculos/views.py

from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Veiculo
from .serializers import VeiculoSerializer

class VeiculoViewSet(ModelViewSet):
    queryset = Veiculo.objects.all()
    serializer_class = VeiculoSerializer
    
    
    @action(detail=False, methods=['get'])
    def buscar(self, request):
        query = request.GET.get('q', '').strip()
        
        if len(query) < 2:
            return Response({'veiculos': []})
        
        # Busca por placa ou modelo
        veiculos = self.get_queryset().filter(
            Q(placa__icontains=query) | 
            Q(modelo__icontains=query)
        )[:10]
        
        serializer = self.get_serializer(veiculos, many=True)
        return Response({'veiculos': serializer.data})