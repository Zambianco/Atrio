# apps/pessoas/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Pessoa, Documento, TipoDocumento
from .serializers import (
    PessoaSerializer,
    DocumentoSerializer,
    TipoDocumentoSerializer,
    normalize_digits,
)


class PessoaViewSet(viewsets.ModelViewSet):
    queryset = Pessoa.objects.all()
    serializer_class = PessoaSerializer

    @action(detail=False, methods=["get"], url_path="empresas")
    def empresas(self, request):
        empresas_qs = (
            self.get_queryset()
            .exclude(empresa__isnull=True)
            .exclude(empresa__exact="")
            .values_list("empresa", flat=True)
            .order_by("empresa")
        )

        empresas = []
        vistos = set()
        for nome in empresas_qs[:100]:
            nome = (nome or "").strip()
            if not nome:
                continue
            key = nome.lower()
            if key in vistos:
                continue
            vistos.add(key)
            empresas.append(nome)

        return Response({"empresas": empresas})

    @action(detail=False, methods=["get"])
    def buscar(self, request):
        query = request.GET.get('q', '').strip()

        if query.startswith("#"):
            id_text = query[1:].strip()
            if id_text.isdigit():
                pessoa = self.get_queryset().filter(id=int(id_text)).first()
                if not pessoa:
                    return Response({'pessoas': []})
                serializer = self.get_serializer([pessoa], many=True)
                return Response({'pessoas': serializer.data})
            return Response({'pessoas': []})

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

        tipo_nome = (
            TipoDocumento.objects.filter(id=tipo_documento)
            .values_list("nome", flat=True)
            .first()
        )
        if tipo_nome and tipo_nome.upper() in {"CPF", "CNH"}:
            numero = normalize_digits(numero)

        queryset = Documento.objects.filter(
            tipo_documento_id=tipo_documento,
            numero__iexact=numero,
        ).select_related("pessoa")

        if exclude_id:
            queryset = queryset.exclude(id=exclude_id)

        doc = queryset.first()
        if doc:
            return Response({
                "exists": True,
                "pessoa": {
                    "id": doc.pessoa.id,
                    "nome": doc.pessoa.nome,
                    "empresa": doc.pessoa.empresa or "",
                    "tipo": doc.pessoa.tipo,
                },
            })
        return Response({"exists": False})
    
    
    
    
