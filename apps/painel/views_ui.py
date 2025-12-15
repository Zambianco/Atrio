# apps/visitas/views_ui.py (UI ≠ API)
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required
def nova_visita(request):
    return render(request, "nova_visita.html")
