# apps/pessoas/serializers.py

from rest_framework import serializers
from .models import Pessoa, Documento, TipoDocumento

class PessoaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pessoa
        fields = '__all__'


class TipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoDocumento
        fields = '__all__'


class DocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Documento
        fields = '__all__'

    def validate(self, attrs):
        tipo_documento = attrs.get("tipo_documento") or getattr(self.instance, "tipo_documento", None)
        numero = (attrs.get("numero") or getattr(self.instance, "numero", "") or "").strip()

        if tipo_documento and numero:
            queryset = Documento.objects.filter(
                tipo_documento=tipo_documento,
                numero__iexact=numero,
            )
            if self.instance:
                queryset = queryset.exclude(id=self.instance.id)
            if queryset.exists():
                raise serializers.ValidationError(
                    {"numero": "Documento ja cadastrado para este tipo."}
                )

        return attrs
