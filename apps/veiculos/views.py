# apps/veiculos/views.py

import re
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Veiculo
from .serializers import VeiculoSerializer

class VeiculoViewSet(ModelViewSet):
    queryset = Veiculo.objects.all()
    serializer_class = VeiculoSerializer

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
                veiculo = self.get_queryset().filter(id=int(id_text)).first()
                if not veiculo:
                    return Response({'veiculos': []})
                serializer = self.get_serializer([veiculo], many=True)
                return Response({'veiculos': serializer.data})
            return Response({'veiculos': []})

        if len(query) < 2:
            return Response({'veiculos': []})

        # Busca por placa ou modelo
        veiculos = self.get_queryset().filter(
            Q(placa__icontains=query) |
            Q(modelo__icontains=query)
        )[:10]

        serializer = self.get_serializer(veiculos, many=True)
        return Response({'veiculos': serializer.data})

    @action(detail=False, methods=["get"], url_path="existe")
    def existe(self, request):
        placa = (request.query_params.get("placa") or "").strip()
        exclude_id = (request.query_params.get("exclude_id") or "").strip()
        if not placa:
            return Response({"exists": False})

        normalized = re.sub(r"[^A-Z0-9]", "", placa.upper())
        if not normalized:
            return Response({"exists": False})

        prefix = normalized[:3]
        suffix = normalized[-4:] if len(normalized) >= 4 else normalized

        queryset = self.get_queryset()
        if exclude_id:
            queryset = queryset.exclude(id=exclude_id)
        if prefix:
            queryset = queryset.filter(placa__istartswith=prefix)
        if suffix:
            queryset = queryset.filter(placa__iendswith=suffix)

        exists = any(
            re.sub(r"[^A-Z0-9]", "", (item.placa or "").upper()) == normalized
            for item in queryset.only("placa")
        )

        return Response({"exists": exists})
