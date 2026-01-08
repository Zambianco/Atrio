# apps/veiculos/serializers.py

import re
from rest_framework import serializers
from .models import Veiculo

class VeiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Veiculo
        fields = '__all__'

    def validate_placa(self, value):
        normalized = re.sub(r"[^A-Z0-9]", "", (value or "").upper())
        if not normalized:
            raise serializers.ValidationError("Informe uma placa valida.")
        if len(normalized) not in (7, 8):
            raise serializers.ValidationError("A placa deve ter 7 ou 8 caracteres.")

        prefix = normalized[:3]
        suffix = normalized[-4:] if len(normalized) >= 4 else normalized

        queryset = Veiculo.objects.all()
        if self.instance:
            queryset = queryset.exclude(id=self.instance.id)
        if prefix:
            queryset = queryset.filter(placa__istartswith=prefix)
        if suffix:
            queryset = queryset.filter(placa__iendswith=suffix)

        exists = any(
            re.sub(r"[^A-Z0-9]", "", (item.placa or "").upper()) == normalized
            for item in queryset.only("placa")
        )

        if exists:
            raise serializers.ValidationError("Placa ja cadastrada.")

        return normalized
