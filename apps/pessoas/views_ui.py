# /apps/pessoas/views_ui.py(UI ≠ API)

from django.shortcuts import render
from django.contrib.auth.decorators import login_required

from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.db.models import Q
from .models import Pessoa


@login_required
def nova_pessoa(request):
    return render(request, "nova_pessoa.html")

@require_GET
def buscar_pessoas(request):
    query = request.GET.get('q', '').strip()
    
    if len(query) < 2:
        return JsonResponse({'pessoas': []})
    
    # Busca por nome ou empresa
    pessoas = Pessoa.objects.filter(
        Q(nome__icontains=query) | 
        Q(empresa__icontains=query)
    )[:10]  # Limita a 10 resultados
    
    resultados = [
        {
            'id': p.id,
            'nome': p.nome,
            'empresa': p.empresa,
            'tipo': 'Visitante'  # Adapte conforme seu modelo
        }
        for p in pessoas
    ]
    
    return JsonResponse({'pessoas': resultados})