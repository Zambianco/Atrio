import os
import csv
from datetime import datetime, time, timedelta
from functools import wraps

from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from apps.visitas.models import GrupoVisita, VisitaPessoa, VisitaVeiculo
from apps.core.models import AuditEvent


def _is_expedicao_only(user):
    if not user.is_authenticated or user.is_staff:
        return False
    groups = set(user.groups.values_list("name", flat=True))
    return "expedicao" in groups and not (groups & {"porteiro", "usuario"})


def block_expedicao_only(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if _is_expedicao_only(request.user):
            return redirect("ui:coletas")
        return view_func(request, *args, **kwargs)
    return wrapper


@login_required
@block_expedicao_only
def painel(request):
    return render(request, "ui/painel.html")

@login_required
@block_expedicao_only
def visitas(request):
    return render(request, "ui/consulta_visitas.html")

@login_required
@block_expedicao_only
def gerenciar_visita(request, id):
    visita = get_object_or_404(GrupoVisita, pk=id)

    pessoas = VisitaPessoa.objects.filter(grupo=visita).select_related("pessoa")
    veiculos = VisitaVeiculo.objects.filter(grupo=visita).select_related("veiculo")

    return render(request, "ui/gerenciar_visita.html", {
        "visita": visita,
        "pessoas": pessoas,
        "veiculos": veiculos,
        "tem_pessoa_e_veiculo": pessoas.exists() and veiculos.exists(),
    })


@login_required
@block_expedicao_only
def nova_visita(request):
    return render(request, "ui/nova_visita.html")


@login_required
@block_expedicao_only
def entrada(request):
    return render(request, "ui/entrada.html")


@login_required
@block_expedicao_only
def cadastro_pessoa(request):
    return render(request, "ui/nova_pessoa.html")


@login_required
@block_expedicao_only
def cadastro_veiculo(request):
    return render(request, "ui/novo_veiculo.html")


@login_required
@block_expedicao_only
def consulta_cadastros(request):
    return render(request, "ui/consulta_cadastros.html")


AUDIT_FIELD_LABELS = {
    "nome": "Nome", "empresa": "Empresa", "tipo": "Tipo",
    "observacao": "Observação", "ativo": "Ativo", "placa": "Placa",
    "modelo": "Modelo", "cor": "Cor", "pessoa": "Pessoa",
    "tipo_documento": "Tipo de documento", "numero": "Número",
    "emissor": "Emissor", "validade": "Validade",
}


def _audit_value(value):
    if value is True:
        return "Sim"
    if value is False:
        return "Não"
    if value in (None, ""):
        return "—"
    return str(value)


@staff_member_required
def auditoria(request):
    eventos = AuditEvent.objects.select_related("usuario").all()
    inicio = request.GET.get("inicio", "")
    fim = request.GET.get("fim", "")
    usuario = request.GET.get("usuario", "")
    entidade = request.GET.get("entidade", "")
    acao = request.GET.get("acao", "")
    busca = request.GET.get("q", "").strip()

    try:
        if inicio:
            eventos = eventos.filter(criado_em__gte=timezone.make_aware(datetime.combine(datetime.fromisoformat(inicio).date(), time.min)))
        if fim:
            limite = timezone.make_aware(datetime.combine(datetime.fromisoformat(fim).date(), time.min)) + timedelta(days=1)
            eventos = eventos.filter(criado_em__lt=limite)
    except ValueError:
        pass
    if usuario:
        eventos = eventos.filter(usuario_id=usuario)
    if entidade:
        eventos = eventos.filter(entidade=entidade)
    if acao:
        eventos = eventos.filter(acao=acao)
    if busca:
        filtro = Q(objeto_descricao__icontains=busca) | Q(usuario_nome__icontains=busca)
        termo_id = busca.lstrip("#")
        if termo_id.isdigit():
            filtro |= Q(objeto_id=int(termo_id))
        eventos = eventos.filter(filtro)

    if request.GET.get("export") == "csv":
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="auditoria.csv"'
        response.write("\ufeff")
        writer = csv.writer(response)
        writer.writerow(["Data", "Usuário", "Módulo", "Registro", "Ação", "Alterações", "IP"])
        for evento in eventos[:10000]:
            resumo = "; ".join(
                f"{AUDIT_FIELD_LABELS.get(campo, campo)}: {_audit_value(valores.get('anterior'))} -> {_audit_value(valores.get('novo'))}"
                for campo, valores in evento.alteracoes.items()
            )
            writer.writerow([
                timezone.localtime(evento.criado_em).strftime("%d/%m/%Y %H:%M:%S"),
                evento.usuario_nome, evento.get_entidade_display(),
                f"#{evento.objeto_id} {evento.objeto_descricao}",
                evento.get_acao_display(), resumo, evento.ip or "",
            ])
        return response

    paginator = Paginator(eventos, 30)
    pagina = paginator.get_page(request.GET.get("page"))
    for evento in pagina.object_list:
        evento.mudancas_exibicao = [
            (AUDIT_FIELD_LABELS.get(campo, campo.replace("_", " ").title()),
             _audit_value(valores.get("anterior")), _audit_value(valores.get("novo")))
            for campo, valores in evento.alteracoes.items()
        ]
        evento.dados_exibicao = [
            (AUDIT_FIELD_LABELS.get(campo, campo.replace("_", " ").title()), _audit_value(valor))
            for campo, valor in evento.dados.items()
        ]
        if evento.entidade == "pessoa":
            evento.cadastro_url = f"/cadastro-pessoa/?id={evento.objeto_id}"
        elif evento.entidade == "veiculo":
            evento.cadastro_url = f"/cadastro-veiculo/?id={evento.objeto_id}"
        elif evento.entidade == "documento" and evento.dados.get("pessoa"):
            evento.cadastro_url = f"/cadastro-pessoa/?id={evento.dados['pessoa']}"
        else:
            evento.cadastro_url = ""

    query_params = request.GET.copy()
    query_params.pop("page", None)
    query_params.pop("export", None)
    usuarios = AuditEvent.objects.exclude(usuario__isnull=True).values("usuario_id", "usuario_nome").distinct().order_by("usuario_nome")
    return render(request, "ui/auditoria.html", {
        "pagina": pagina,
        "usuarios_auditoria": usuarios,
        "entidades": AuditEvent.ENTITY_CHOICES,
        "acoes": AuditEvent.ACTION_CHOICES,
        "query_string": query_params.urlencode(),
    })


@require_GET
def hora_atual(request):
    now = timezone.localtime(timezone.now())
    return JsonResponse({
        "iso": now.isoformat(),
        "timestamp_ms": int(now.timestamp() * 1000),
    })


@login_required
def coletas(request):
    grupos = (
        GrupoVisita.objects.filter(is_coleta=True, data_saida__isnull=True)
        .prefetch_related(
            "pessoas__pessoa__documentos__tipo_documento",
            "veiculos__veiculo",
        )
        .order_by("-data_entrada")
    )
    return render(request, "ui/coletas.html", {"grupos": grupos})


@login_required
def relogio(request):
    now = timezone.localtime(timezone.now())
    return render(request, "ui/relogio.html", {"now": now})


@require_POST
@login_required
def backup_agora(request):
    if not request.user.is_staff:
        return JsonResponse({"ok": False, "erro": "Sem permissão."}, status=403)

    trigger = "/data/.backup_trigger"
    try:
        with open(trigger, "w") as f:
            f.write("1")
        return JsonResponse({"ok": True})
    except Exception as e:
        return JsonResponse({"ok": False, "erro": str(e)})
