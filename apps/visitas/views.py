# /apps/visitas/views.py
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError

from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import IsPorteiro, IsUsuario, IsAdmin, IsExpedicao

from apps.pessoas.models import Pessoa
from apps.veiculos.models import Veiculo

from .models import GrupoVisita, VisitaPessoa, VisitaVeiculo
from .serializers import (
    GrupoVisitaSerializer,
    VisitaPessoaSerializer,
    VisitaVeiculoSerializer,
)
from .services.domain import (
    registrar_visita,
    adicionar_na_visita,
    sair_pessoa,
    sair_veiculo,
    encerrar_visita,
    listar_presentes,
    marcar_coleta,
)


class GrupoVisitaViewSet(viewsets.ModelViewSet):
    queryset = GrupoVisita.objects.all().order_by("-data_entrada")
    serializer_class = GrupoVisitaSerializer

    @action(detail=True, methods=["post"])
    def encerrar(self, request, pk=None):
        encerrar_visita(pk)
        return Response({"ok": True})


class VisitaPessoaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsPorteiro]
    queryset = VisitaPessoa.objects.all()
    serializer_class = VisitaPessoaSerializer

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.grupo.is_coleta:
            return Response(
                {"erro": "Esta visita é uma coleta. Não é possível remover pessoas de uma coleta."},
                status=400
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post", "patch"])
    def saida(self, request, pk=None):
        try:
            sair_pessoa(pk)
        except ValidationError as e:
            return Response({"erro": e.message}, status=400)

        return Response({"ok": True})

    @action(detail=True, methods=["post", "patch"])
    def entrada(self, request, pk=None):
        visita = self.get_object()
        visita.data_saida = None
        visita.save(update_fields=["data_saida"])
        return Response({"ok": True})


class VisitaVeiculoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = VisitaVeiculo.objects.all()
    serializer_class = VisitaVeiculoSerializer

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.grupo.is_coleta:
            return Response(
                {"erro": "Esta visita é uma coleta. Não é possível remover veículos de uma coleta."},
                status=400
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post", "patch"])
    def saida(self, request, pk=None):
        try:
            sair_veiculo(pk)
        except ValidationError as e:
            return Response({"erro": e.message}, status=400)

        return Response({"ok": True})


class VeiculoSugestoesAPIView(APIView):
    permission_classes = [IsAuthenticated, IsUsuario | IsAdmin | IsPorteiro]

    def get(self, request, veiculo_id):
        veiculo = get_object_or_404(Veiculo, id=veiculo_id)
        empresa = (veiculo.empresa or "").strip()

        pessoas_empresa = []
        if empresa:
            pessoas_qs = Pessoa.objects.filter(empresa__iexact=empresa).order_by("nome")[:10]
            pessoas_empresa = [
                {
                    "id": p.id,
                    "nome": p.nome,
                    "empresa": p.empresa,
                }
                for p in pessoas_qs
            ]

        visitas_veiculo = (
            VisitaVeiculo.objects.filter(veiculo_id=veiculo_id)
            .order_by("-data_entrada")
            .values_list("grupo_id", flat=True)
        )

        grupos_ordenados = []
        grupos_vistos = set()
        for grupo_id in visitas_veiculo:
            if grupo_id in grupos_vistos:
                continue
            grupos_vistos.add(grupo_id)
            grupos_ordenados.append(grupo_id)
            if len(grupos_ordenados) >= 5:
                break

        pessoas_ultimas = []
        pessoas_vistas = set()
        for grupo_id in grupos_ordenados:
            visitas_pessoas = (
                VisitaPessoa.objects.filter(grupo_id=grupo_id)
                .select_related("pessoa")
                .order_by("-data_entrada")
            )
            for visita_pessoa in visitas_pessoas:
                pessoa_id = visita_pessoa.pessoa_id
                if pessoa_id in pessoas_vistas:
                    continue
                pessoas_vistas.add(pessoa_id)
                pessoas_ultimas.append(
                    {
                        "id": visita_pessoa.pessoa_id,
                        "nome": visita_pessoa.pessoa.nome,
                        "empresa": visita_pessoa.pessoa.empresa,
                        "grupo_id": visita_pessoa.grupo_id,
                        "entrada": visita_pessoa.data_entrada,
                    }
                )
                if len(pessoas_ultimas) >= 10:
                    break
            if len(pessoas_ultimas) >= 10:
                break

        return Response(
            {
                "veiculo": {
                    "id": veiculo.id,
                    "placa": veiculo.placa,
                    "empresa": veiculo.empresa,
                    "modelo": veiculo.modelo,
                },
                "pessoas_empresa": pessoas_empresa,
                "pessoas_ultimas_visitas": pessoas_ultimas,
            }
        )


class PresentesAPIView(APIView):
    def get(self, request):
        return Response(listar_presentes())


class RegistrarVisitaAPIView(APIView):
    permission_classes = [IsAuthenticated, IsPorteiro]
    def post(self, request):
        try:
            grupo = registrar_visita(
                motivo=request.data.get("motivo"),
                autorizado_por=request.data.get("autorizado_por"),
                observacao=request.data.get("observacao"),
                pessoas_ids=request.data.get("pessoas", []),
                veiculos_ids=request.data.get("veiculos", []),
                criado_por=request.user,
                is_coleta=bool(request.data.get("is_coleta", False)),
            )
        except ValidationError as e:
            return Response({"erro": e.message}, status=400)

        return Response(
            {"ok": True, "grupo_id": grupo.id},
            status=status.HTTP_201_CREATED
        )


class MarcarColetaAPIView(APIView):
    permission_classes = [IsAuthenticated, IsPorteiro | IsAdmin]

    def patch(self, request, grupo_id):
        is_coleta = request.data.get("is_coleta")
        if is_coleta is None:
            return Response({"erro": "Campo is_coleta é obrigatório"}, status=400)
        try:
            grupo = marcar_coleta(grupo_id, bool(is_coleta))
        except GrupoVisita.DoesNotExist:
            return Response({"erro": "Visita não encontrada"}, status=404)
        except ValidationError as e:
            return Response({"erro": e.message}, status=400)
        return Response({"ok": True, "is_coleta": grupo.is_coleta})


class AdicionarNaVisitaAPIView(APIView):
    def post(self, request, grupo_id):
        try:
            adicionar_na_visita(
                grupo_id=grupo_id,
                pessoa_id=request.data.get("pessoa"),
                veiculo_id=request.data.get("veiculo"),
            )
        except ValidationError as e:
            return Response({"erro": e.message}, status=400)

        return Response({"ok": True})


class GrupoResumoAPIView(APIView):
    permission_classes = [IsAuthenticated, IsUsuario | IsAdmin | IsPorteiro]

    def get(self, request, grupo_id):
        grupo = get_object_or_404(GrupoVisita, id=grupo_id)
        agora = timezone.now()

        def tempo(inicio, fim=None):
            fim = fim or agora
            delta = fim - inicio
            h = delta.seconds // 3600
            m = (delta.seconds % 3600) // 60
            return f"{h}h {m}m"

        pessoas = VisitaPessoa.objects.filter(grupo=grupo)
        veiculos = VisitaVeiculo.objects.filter(grupo=grupo)

        return Response({
            "grupo": {
                "id": grupo.id,
                "data_entrada": grupo.data_entrada,
                "data_saida": grupo.data_saida,
                "motivo": grupo.motivo,
                "autorizado_por": grupo.autorizado_por,
                "observacao": grupo.observacao,
                "is_coleta": grupo.is_coleta,
                "criado_por_username": grupo.criado_por.username if grupo.criado_por else None,
            },
            "pessoas": [
                {
                    "id": v.id,                 # id da VisitaPessoa
                    "pessoa_id": v.pessoa.id,   # <-- ESSENCIAL p/ reentrada
                    "nome": v.pessoa.nome,
                    "empresa": v.pessoa.empresa,
                    "entrada": v.data_entrada,
                    "saida": v.data_saida,
                    "tempo": tempo(v.data_entrada, v.data_saida),
                }
                for v in pessoas
            ],
            "veiculos": [
                {
                    "id": v.id,                   # id da VisitaVeiculo
                    "veiculo_id": v.veiculo.id,   # <-- ESSENCIAL p/ reentrada
                    "placa": v.veiculo.placa,
                    "empresa": v.veiculo.empresa,
                    "entrada": v.data_entrada,
                    "saida": v.data_saida,
                    "tempo": tempo(v.data_entrada, v.data_saida),
                }
                for v in veiculos
            ],
        })


    

