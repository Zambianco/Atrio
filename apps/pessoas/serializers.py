# apps/pessoas/serializers.py

import re
from rest_framework import serializers
from .models import Pessoa, Documento, TipoDocumento

CPF_DIGITS_LEN = 11
CNH_DIGITS_LEN = 11


def normalize_digits(value):
    return re.sub(r"\D", "", value or "")


def is_valid_cpf(digits):
    if len(digits) != CPF_DIGITS_LEN:
        return False
    if digits == digits[0] * CPF_DIGITS_LEN:
        return False

    total = sum(int(d) * weight for d, weight in zip(digits[:9], range(10, 1, -1)))
    check = (total * 10) % 11
    if check == 10:
        check = 0
    if check != int(digits[9]):
        return False

    total = sum(int(d) * weight for d, weight in zip(digits[:10], range(11, 1, -1)))
    check = (total * 10) % 11
    if check == 10:
        check = 0
    return check == int(digits[10])


def is_valid_cnh(digits):
    if len(digits) != CNH_DIGITS_LEN:
        return False

    total = sum(int(d) * weight for d, weight in zip(digits[:9], range(9, 0, -1)))
    mod = total % 11
    first_check = 0 if mod >= 10 else mod
    desc = 2 if mod >= 10 else 0

    total = sum(int(d) * weight for d, weight in zip(digits[:9], range(1, 10)))
    total += desc
    mod = total % 11
    second_check = 0 if mod >= 10 else mod

    return first_check == int(digits[9]) and second_check == int(digits[10])

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
        numero_provided = "numero" in attrs
        numero = (attrs.get("numero") or getattr(self.instance, "numero", "") or "").strip()

        if tipo_documento and numero:
            if tipo_documento.nome.upper() == "CPF":
                digits = normalize_digits(numero)
                if not is_valid_cpf(digits):
                    raise serializers.ValidationError({"numero": "CPF invalido."})
                numero = digits
                if numero_provided:
                    attrs["numero"] = numero
            elif tipo_documento.nome.upper() == "CNH":
                digits = normalize_digits(numero)
                if not is_valid_cnh(digits):
                    raise serializers.ValidationError({"numero": "CNH invalida."})
                numero = digits
                if numero_provided:
                    attrs["numero"] = numero

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
