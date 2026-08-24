from django.conf import settings
from django.db import models


class AuditEvent(models.Model):
    ACTION_CHOICES = [
        ("criado", "Criação"),
        ("alterado", "Alteração"),
        ("desativado", "Desativação"),
        ("reativado", "Reativação"),
        ("excluido", "Exclusão"),
    ]
    ENTITY_CHOICES = [
        ("pessoa", "Pessoa"),
        ("documento", "Documento"),
        ("veiculo", "Veículo"),
    ]

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="eventos_auditoria",
    )
    usuario_nome = models.CharField(max_length=150, blank=True)
    entidade = models.CharField(max_length=20, choices=ENTITY_CHOICES, db_index=True)
    objeto_id = models.PositiveBigIntegerField(db_index=True)
    objeto_descricao = models.CharField(max_length=255, blank=True)
    acao = models.CharField(max_length=20, choices=ACTION_CHOICES, db_index=True)
    alteracoes = models.JSONField(default=dict, blank=True)
    dados = models.JSONField(default=dict, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    request_id = models.CharField(max_length=100, blank=True, db_index=True)
    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-criado_em", "-id"]
        indexes = [models.Index(fields=["entidade", "objeto_id", "-criado_em"])]

    def __str__(self):
        return f"{self.get_entidade_display()} #{self.objeto_id} - {self.get_acao_display()}"
