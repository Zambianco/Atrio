# apps/pessoas/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Pessoa
from .serializers import PessoaSerializer


class PessoaViewSet(viewsets.ModelViewSet):
    queryset = Pessoa.objects.all()
    serializer_class = PessoaSerializer
    
    
    @action(detail=False, methods=['get'])
    def buscar(self, request):
        query = request.GET.get('q', '').strip()
        
        if len(query) < 2:
            return Response({'pessoas': []})
        
        # Busca por nome ou empresa
        pessoas = self.get_queryset().filter(
            Q(nome__icontains=query) | 
            Q(empresa__icontains=query)
        )[:10]
        
        serializer = self.get_serializer(pessoas, many=True)
        return Response({'pessoas': serializer.data})