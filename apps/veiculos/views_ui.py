# apps/veiculos/views_ui.py (UI ≠ API)

from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required
def novo_veiculo(request):
    return render(request, "novo_veiculo.html")