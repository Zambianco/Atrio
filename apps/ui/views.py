import os
from functools import wraps

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from apps.visitas.models import GrupoVisita, VisitaPessoa, VisitaVeiculo


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
