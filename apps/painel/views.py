# /apps/painel/views.py
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required
def painel_portaria(request):
    return render(request, "painel.html")