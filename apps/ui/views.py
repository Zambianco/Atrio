from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.http import require_GET

from apps.visitas.models import GrupoVisita, VisitaPessoa, VisitaVeiculo


@login_required
def painel(request):
    return render(request, "ui/painel.html")

@login_required
def visitas(request):
    return render(request, "ui/consulta_visitas.html")

@login_required
def gerenciar_visita(request, id):
    visita = get_object_or_404(GrupoVisita, pk=id)

    pessoas = VisitaPessoa.objects.filter(grupo=visita).select_related("pessoa")
    veiculos = VisitaVeiculo.objects.filter(grupo=visita).select_related("veiculo")

    return render(request, "ui/gerenciar_visita.html", {
        "visita": visita,
        "pessoas": pessoas,
        "veiculos": veiculos,
    })
    
    
@login_required
def nova_visita(request):
    return render(request, "ui/nova_visita.html")


@login_required
def entrada(request):
    return render(request, "ui/entrada.html")


@login_required
def cadastro_pessoa(request):
    return render(request, "ui/nova_pessoa.html")


@login_required
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
def relogio(request):
    now = timezone.localtime(timezone.now())
    return render(request, "ui/relogio.html", {"now": now})
