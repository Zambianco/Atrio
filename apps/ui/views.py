from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def painel(request):
    return render(request, "ui/painel.html")


@login_required
def nova_visita(request):
    return render(request, "ui/nova_visita.html")


@login_required
def entrada(request):
    return render(request, "ui/entrada.html")


@login_required
def nova_pessoa(request):
    return render(request, "ui/nova_pessoa.html")


@login_required
def novo_veiculo(request):
    return render(request, "ui/novo_veiculo.html")
