from django.db import models


class Veiculo(models.Model):
    placa = models.CharField(max_length=7, unique=True)
    modelo = models.CharField(max_length=100, blank=True, null=True)
    cor = models.CharField(max_length=50, blank=True, null=True)
    empresa = models.CharField(max_length=200, blank=True, null=True)
    tipo = models.CharField(max_length=50, blank=True, null=True)
    observacao = models.TextField(blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.placa
    
    class Meta:
        app_label = "veiculos"