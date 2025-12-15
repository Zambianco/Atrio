from django.contrib import admin
from .models import GrupoVisita, VisitaPessoa, VisitaVeiculo


class VisitaPessoaInline(admin.TabularInline):
    model = VisitaPessoa
    extra = 0


class VisitaVeiculoInline(admin.TabularInline):
    model = VisitaVeiculo
    extra = 0


@admin.register(GrupoVisita)
class GrupoVisitaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "data_entrada",
        "data_saida",
        "autorizado_por",
        "motivo",
    )
    inlines = [VisitaPessoaInline, VisitaVeiculoInline]


admin.site.register(VisitaPessoa)
admin.site.register(VisitaVeiculo)
