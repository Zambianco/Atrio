"""
URL configuration for Atrio project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # APIs
    path('api/pessoas/', include('apps.pessoas.urls')),
    path('api/pessoas/buscar/', include('apps.pessoas.urls_ui')),
    path('api/veiculos/', include('apps.veiculos.urls')),
    path('api/visitas/', include('apps.visitas.urls')),
    
    # UI/Views
    path('', include('painel.urls')),
    path("", include("apps.ui.urls")),
    path("painel/", include("apps.painel.urls")),
    path("visitas/", include("apps.visitas.urls_ui")),
    path("pessoas/", include("apps.pessoas.urls_ui")),
    path("veiculos/", include("apps.veiculos.urls_ui")),
    path("", include("apps.core.urls")),
]
