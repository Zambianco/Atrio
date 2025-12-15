from django.contrib import admin
from .models import Pessoa, Documento, TipoDocumento

admin.site.register(Pessoa)
admin.site.register(Documento)
admin.site.register(TipoDocumento)
