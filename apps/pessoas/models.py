from django.db import models


class Pessoa(models.Model):
    TIPO_CHOICES = [
        ("visitante", "Visitante"),
        ("funcionario", "Funcionário"),
        ("motorista", "Motorista"),
    ]

    nome = models.CharField(max_length=200)
    empresa = models.CharField(max_length=200, blank=True, null=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, blank=True, null=True)
    observacao = models.TextField(blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome
    
    class Meta:
        app_label = "pessoas"
    
class TipoDocumento(models.Model):
    nome = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nome
    
class Documento(models.Model):
    pessoa = models.ForeignKey(
        Pessoa,
        on_delete=models.CASCADE,
        related_name="documentos"
    )
    tipo_documento = models.ForeignKey(
        TipoDocumento,
        on_delete=models.PROTECT
    )
    numero = models.CharField(max_length=100)
    emissor = models.CharField(max_length=100, blank=True, null=True)
    validade = models.CharField(max_length=50, blank=True, null=True)
    observacao = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.tipo_documento} - {self.numero}"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tipo_documento", "numero"],
                name="unique_tipo_numero_documento"
            )
        ]