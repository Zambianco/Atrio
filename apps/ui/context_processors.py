import os
from django.conf import settings


def app_version(request):
    return {
        "APP_VERSION": getattr(settings, "APP_VERSION", ""),
    }


def backup_status(request):
    import time

    backup_dir = os.getenv("BACKUP_DIR", "")
    interval = int(os.getenv("BACKUP_INTERVAL_SECONDS", "3600"))
    password = os.getenv("BACKUP_PASSWORD", "")
    ext = ".enc" if password else ".sqlite3"

    backup_alerta = False
    backup_alerta_msg = ""

    if not backup_dir:
        return {"backup_alerta": False, "backup_alerta_msg": ""}

    if not os.path.isdir(backup_dir):
        backup_alerta = True
        backup_alerta_msg = f"Pasta de backup inacessível: {backup_dir}"
    else:
        try:
            arquivos = [
                os.path.join(backup_dir, f)
                for f in os.listdir(backup_dir)
                if f.startswith("db-") and f.endswith(ext)
            ]
        except OSError:
            backup_alerta = True
            backup_alerta_msg = f"Pasta de backup inacessível: {backup_dir}"
        else:
            if arquivos:
                mais_recente = max(arquivos, key=os.path.getmtime)
                idade = time.time() - os.path.getmtime(mais_recente)
                if idade > interval * 2:
                    backup_alerta = True
                    backup_alerta_msg = "O backup do banco de dados está atrasado!"
            else:
                backup_alerta = True
                backup_alerta_msg = "Nenhum backup encontrado na pasta de destino!"

    return {"backup_alerta": backup_alerta, "backup_alerta_msg": backup_alerta_msg}


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
