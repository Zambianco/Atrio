from django.utils import timezone
from django.core.exceptions import ValidationError
from django.apps import apps
from django.db import transaction

GrupoVisita = apps.get_model("visitas", "GrupoVisita")
VisitaPessoa = apps.get_model("visitas", "VisitaPessoa")
VisitaVeiculo = apps.get_model("visitas", "VisitaVeiculo")
Pessoa = apps.get_model("pessoas", "Pessoa")
Veiculo = apps.get_model("veiculos", "Veiculo")


def _validar_visita_aberta(grupo):
    if grupo.data_saida:
        raise ValidationError("Visita encerrada")


def _validar_pessoa_nao_em_visita(pessoa_id):
    if VisitaPessoa.objects.filter(
        pessoa_id=pessoa_id, data_saida__isnull=True
    ).exists():
        raise ValidationError("Pessoa já está em visita ativa")


def _validar_veiculo_nao_em_visita(veiculo_id):
    if VisitaVeiculo.objects.filter(
        veiculo_id=veiculo_id, data_saida__isnull=True
    ).exists():
        raise ValidationError("Veículo já está em visita ativa")


@transaction.atomic
def registrar_visita(motivo, autorizado_por, observacao, pessoas_ids, veiculos_ids, criado_por=None):
    if not pessoas_ids:
        raise ValidationError("Informe ao menos uma pessoa")

    agora = timezone.now()

    grupo = GrupoVisita.objects.create(
        motivo=motivo,
        autorizado_por=autorizado_por,
        observacao=observacao,
        data_entrada=agora,
        criado_por=criado_por
    )

    for pid in pessoas_ids:
        _validar_pessoa_nao_em_visita(pid)
        VisitaPessoa.objects.create(
            grupo=grupo,
            pessoa_id=pid,
            data_entrada=agora
        )

    for vid in veiculos_ids:
        _validar_veiculo_nao_em_visita(vid)
        VisitaVeiculo.objects.create(
            grupo=grupo,
            veiculo_id=vid,
            data_entrada=agora
        )

    return grupo


@transaction.atomic
def adicionar_na_visita(grupo_id, pessoa_id=None, veiculo_id=None):
    grupo = GrupoVisita.objects.get(id=grupo_id)
    _validar_visita_aberta(grupo)

    agora = timezone.now()

    if pessoa_id:
        _validar_pessoa_nao_em_visita(pessoa_id)
        VisitaPessoa.objects.create(
            grupo=grupo,
            pessoa_id=pessoa_id,
            data_entrada=agora
        )

    if veiculo_id:
        _validar_veiculo_nao_em_visita(veiculo_id)
        VisitaVeiculo.objects.create(
            grupo=grupo,
            veiculo_id=veiculo_id,
            data_entrada=agora
        )

    return grupo


@transaction.atomic
def sair_pessoa(visita_pessoa_id):
    agora = timezone.now()
    visita = VisitaPessoa.objects.select_related("grupo").get(id=visita_pessoa_id)

    if visita.data_saida:
        raise ValidationError("Pessoa já saiu")

    visita.data_saida = agora
    visita.save()

    grupo = visita.grupo

    # Regra: veículo não fica sem pessoa
    if not grupo.pessoas.filter(data_saida__isnull=True).exists():
        grupo.veiculos.filter(data_saida__isnull=True).update(data_saida=agora)
        grupo.data_saida = agora
        grupo.save()

    return grupo


@transaction.atomic
def sair_veiculo(visita_veiculo_id):
    agora = timezone.now()
    visita = VisitaVeiculo.objects.select_related("grupo").get(id=visita_veiculo_id)

    if visita.data_saida:
        raise ValidationError("Veículo já saiu")

    visita.data_saida = agora
    visita.save()

    grupo = visita.grupo

    if (
        not grupo.pessoas.filter(data_saida__isnull=True).exists()
        and not grupo.veiculos.filter(data_saida__isnull=True).exists()
    ):
        grupo.data_saida = agora
        grupo.save()

    return grupo


@transaction.atomic
def encerrar_visita(grupo_id):
    agora = timezone.now()
    grupo = GrupoVisita.objects.get(id=grupo_id)

    if grupo.data_saida:
        return grupo

    grupo.data_saida = agora
    grupo.save()

    grupo.pessoas.filter(data_saida__isnull=True).update(data_saida=agora)
    grupo.veiculos.filter(data_saida__isnull=True).update(data_saida=agora)

    return grupo


def listar_presentes():
    agora = timezone.now()

    pessoas = VisitaPessoa.objects.filter(data_saida__isnull=True)
    veiculos = VisitaVeiculo.objects.filter(data_saida__isnull=True)

    def tempo(inicio):
        delta = agora - inicio
        h = delta.seconds // 3600
        m = (delta.seconds % 3600) // 60
        return f"{h}h {m}m"

    return {
        "pessoas": [
            {
                "id": v.id,
                "grupo_id": v.grupo.id,
                "nome": v.pessoa.nome,
                "empresa": v.pessoa.empresa,
                "entrada": v.data_entrada,
                "tempo": tempo(v.data_entrada),
            }
            for v in pessoas
        ],
        "veiculos": [
            {
                "id": v.id,
                "grupo_id": v.grupo.id,
                "placa": v.veiculo.placa,
                "empresa": v.veiculo.empresa,
                "entrada": v.data_entrada,
                "tempo": tempo(v.data_entrada),
            }
            for v in veiculos
        ],
    }
