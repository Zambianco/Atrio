import datetime
import os
import sqlite3
import subprocess
import tempfile
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

    src = os.getenv("DB_NAME", "/data/atrio.sqlite3")
    dst_dir = os.getenv("BACKUP_DIR", "/mnt/atrio-backups")
    password = os.getenv("BACKUP_PASSWORD", "")

    if not os.path.isdir(dst_dir):
        return JsonResponse({"ok": False, "erro": f"Pasta de backup inacessível: {dst_dir}"})

    ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False) as tmp:
            tmp_path = tmp.name
        src_conn = sqlite3.connect(src)
        dst_conn = sqlite3.connect(tmp_path)
        src_conn.backup(dst_conn)
        dst_conn.close()
        src_conn.close()

        if password:
            dst = os.path.join(dst_dir, f"db-{ts}.7z")
            result = subprocess.run(
                ["7z", "a", f"-p{password}", "-mhe=1", "-mx=1", dst, tmp_path],
                capture_output=True,
            )
            if result.returncode != 0:
                return JsonResponse({"ok": False, "erro": "Falha ao compactar o backup."})
        else:
            import shutil
            dst = os.path.join(dst_dir, f"db-{ts}.sqlite3")
            shutil.move(tmp_path, dst)
            tmp_path = None

        return JsonResponse({"ok": True, "arquivo": os.path.basename(dst)})
    except Exception as e:
        return JsonResponse({"ok": False, "erro": str(e)})
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
