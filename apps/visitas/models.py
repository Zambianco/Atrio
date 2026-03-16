# apps/visitas/models.py
from django.db import models
from django.conf import settings

class GrupoVisita(models.Model):
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="visitas_criadas"
    )
    data_entrada = models.DateTimeField(auto_now_add=True)
    data_saida = models.DateTimeField(blank=True, null=True)
    autorizado_por = models.CharField(max_length=200, blank=True, null=True)
    motivo = models.CharField(max_length=200, blank=True, null=True)
    observacao = models.TextField(blank=True, null=True)
    is_coleta = models.BooleanField(default=False)

    def __str__(self):
        return f"Visita #{self.id}"
    

class VisitaPessoa(models.Model):
    grupo = models.ForeignKey(
        GrupoVisita,
        on_delete=models.CASCADE,
        related_name="pessoas"
    )
    pessoa = models.ForeignKey(
        "pessoas.Pessoa",
        on_delete=models.CASCADE
    )
    data_entrada = models.DateTimeField(auto_now_add=True)
    data_saida = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.pessoa} - Grupo {self.grupo_id}"


class VisitaVeiculo(models.Model):
    grupo = models.ForeignKey(
        GrupoVisita,
        on_delete=models.CASCADE,
        related_name="veiculos"
    )
    veiculo = models.ForeignKey(
        "veiculos.Veiculo",
        on_delete=models.CASCADE
    )
    data_entrada = models.DateTimeField(auto_now_add=True)
    data_saida = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.veiculo} - Grupo {self.grupo_id}"

