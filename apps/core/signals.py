from django.contrib.auth.signals import user_logged_in
from django.db.models.signals import post_save, pre_delete, pre_save
from django.dispatch import receiver
from django.utils import timezone

from apps.pessoas.models import Documento, Pessoa
from apps.veiculos.models import Veiculo

from .audit_context import current_request
from .models import AuditEvent
from .shift_session import LOGIN_AT_SESSION_KEY, next_shift_logout_at


@receiver(user_logged_in)
def configure_shift_session_expiry(sender, request, user, **kwargs):
    login_at = timezone.now()
    request.session[LOGIN_AT_SESSION_KEY] = login_at.isoformat()
    request.session.set_expiry(next_shift_logout_at(login_at))


AUDITED_MODELS = (Pessoa, Documento, Veiculo)
ENTITY_NAMES = {Pessoa: "pessoa", Documento: "documento", Veiculo: "veiculo"}


def _mask_document(value):
    value = str(value or "")
    return f"***{value[-4:]}" if value else ""


def _snapshot(instance):
    data = {}
    for field in instance._meta.concrete_fields:
        if field.primary_key:
            continue
        value = field.value_from_object(instance)
        if isinstance(instance, Documento) and field.name == "numero":
            value = _mask_document(value)
        elif hasattr(value, "isoformat"):
            value = value.isoformat()
        data[field.name] = value
    return data


def _description(instance):
    if isinstance(instance, Documento):
        return f"Documento de {instance.pessoa}"
    return str(instance)


def _request_data():
    request = current_request.get()
    if request is None:
        return {"usuario_nome": "Sistema"}

    user = getattr(request, "user", None)
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    ip = forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")
    authenticated = user and user.is_authenticated
    return {
        "usuario": user if authenticated else None,
        "usuario_nome": (
            user.get_full_name() or user.get_username() if authenticated else "Sistema"
        ),
        "ip": ip or None,
        "user_agent": request.META.get("HTTP_USER_AGENT", "")[:500],
        "request_id": request.META.get("HTTP_X_REQUEST_ID", "")[:100],
    }


@receiver(pre_save)
def audit_before_save(sender, instance, **kwargs):
    if sender not in AUDITED_MODELS or not instance.pk:
        return
    previous = sender.objects.filter(pk=instance.pk).first()
    instance._audit_previous = _snapshot(previous) if previous else None


@receiver(post_save)
def audit_after_save(sender, instance, created, raw=False, **kwargs):
    if raw or sender not in AUDITED_MODELS:
        return

    current = _snapshot(instance)
    previous = getattr(instance, "_audit_previous", None)
    changes = {}
    action = "criado"
    if not created and previous is not None:
        changes = {
            field: {"anterior": previous.get(field), "novo": value}
            for field, value in current.items()
            if previous.get(field) != value
        }
        if not changes:
            return
        action = "alterado"
        if changes.get("ativo") == {"anterior": True, "novo": False}:
            action = "desativado"
        elif changes.get("ativo") == {"anterior": False, "novo": True}:
            action = "reativado"

    AuditEvent.objects.create(
        entidade=ENTITY_NAMES[sender],
        objeto_id=instance.pk,
        objeto_descricao=_description(instance)[:255],
        acao=action,
        alteracoes=changes,
        dados=current,
        **_request_data(),
    )


@receiver(pre_delete)
def audit_before_delete(sender, instance, **kwargs):
    if sender not in AUDITED_MODELS:
        return
    AuditEvent.objects.create(
        entidade=ENTITY_NAMES[sender],
        objeto_id=instance.pk,
        objeto_descricao=_description(instance)[:255],
        acao="excluido",
        dados=_snapshot(instance),
        **_request_data(),
    )
