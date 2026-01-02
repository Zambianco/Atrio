# apps/visitas/serializers.py

from rest_framework import serializers
from .models import GrupoVisita, VisitaPessoa, VisitaVeiculo

class GrupoVisitaSerializer(serializers.ModelSerializer):
    criado_por_username = serializers.CharField(source="criado_por.username", read_only=True)

    class Meta:
        model = GrupoVisita
        fields = "__all__"

class VisitaPessoaSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitaPessoa
        fields = "__all__"

class VisitaVeiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitaVeiculo
        fields = "__all__"
