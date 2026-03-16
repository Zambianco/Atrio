from django.conf import settings


def app_version(request):
    return {
        "APP_VERSION": getattr(settings, "APP_VERSION", ""),
    }


def user_groups(request):
    if not request.user.is_authenticated:
        return {
            "is_porteiro": False,
            "is_usuario": False,
            "is_expedicao": False,
            "is_admin": False,
        }
    grupos = set(request.user.groups.values_list("name", flat=True))
    return {
        "is_porteiro": "porteiro" in grupos,
        "is_usuario": "usuario" in grupos,
        "is_expedicao": "expedicao" in grupos,
        "is_admin": request.user.is_staff,
    }
