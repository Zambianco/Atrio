# apps/pessoas/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Pessoa, Documento, TipoDocumento
from .serializers import PessoaSerializer, DocumentoSerializer, TipoDocumentoSerializer


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


class TipoDocumentoViewSet(viewsets.ModelViewSet):
    queryset = TipoDocumento.objects.all().order_by("nome")
    serializer_class = TipoDocumentoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        nome = self.request.query_params.get("nome")
        if nome:
            queryset = queryset.filter(nome__iexact=nome.strip())
        return queryset

    def create(self, request, *args, **kwargs):
        nome = (request.data.get("nome") or "").strip()
        if not nome:
            return Response({"detail": "Nome obrigatorio."}, status=status.HTTP_400_BAD_REQUEST)

        obj, created = TipoDocumento.objects.get_or_create(nome=nome)
        serializer = self.get_serializer(obj)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class DocumentoViewSet(viewsets.ModelViewSet):
    queryset = Documento.objects.all()
    serializer_class = DocumentoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        pessoa_id = (self.request.query_params.get("pessoa") or "").strip()
        if pessoa_id:
            queryset = queryset.filter(pessoa_id=pessoa_id)
        return queryset

    @action(detail=False, methods=["get"], url_path="existe")
    def existe(self, request):
        tipo_documento = (request.query_params.get("tipo_documento") or "").strip()
        numero = (request.query_params.get("numero") or "").strip()
        exclude_id = (request.query_params.get("exclude_id") or "").strip()

        if not tipo_documento or not numero:
            return Response({"exists": False})

        queryset = Documento.objects.filter(
            tipo_documento_id=tipo_documento,
            numero__iexact=numero,
        )

        if exclude_id:
            queryset = queryset.exclude(id=exclude_id)

        exists = queryset.exists()
        return Response({"exists": exists})
    
    
    
    
