from datetime import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError

from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import IsPorteiro, IsUsuario, IsAdmin

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

    @action(detail=True, methods=["post"])
    def saida(self, request, pk=None):
        try:
            sair_pessoa(pk)
        except ValidationError as e:
            return Response({"erro": e.message}, status=400)

        return Response({"ok": True})


class VisitaVeiculoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = VisitaVeiculo.objects.all()
    serializer_class = VisitaVeiculoSerializer

    @action(detail=True, methods=["post"])
    def saida(self, request, pk=None):
        try:
            sair_veiculo(pk)
        except ValidationError as e:
            return Response({"erro": e.message}, status=400)

        return Response({"ok": True})


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
            )
        except ValidationError as e:
            return Response({"erro": e.message}, status=400)

        return Response(
            {"ok": True, "grupo_id": grupo.id},
            status=status.HTTP_201_CREATED
        )


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
    permission_classes = [IsAuthenticated, IsUsuario | IsAdmin]
    def get(self, request, grupo_id):
        grupo = get_object_or_404(GrupoVisita, id=grupo_id)

        agora = timezone.now()

        def tempo(inicio, fim=None):
            fim = fim or agora
            delta = fim - inicio
            h = delta.seconds // 3600
            m = (delta.seconds % 3600) // 60
            return f"{h}h {m}m"

        return Response({
            "grupo": {
                "id": grupo.id,
                "data_entrada": grupo.data_entrada,
                "data_saida": grupo.data_saida,
                "motivo": grupo.motivo,
                "autorizado_por": grupo.autorizado_por,
                "observacao": grupo.observacao,
            },
            "pessoas": [
                {
                    "id": v.id,
                    "nome": v.pessoa.nome,
                    "empresa": v.pessoa.empresa,
                    "entrada": v.data_entrada,
                    "saida": v.data_saida,
                    "dentro": v.data_saida is None,
                    "tempo": tempo(v.data_entrada, v.data_saida),
                }
                for v in grupo.pessoas.all()
            ],
            "veiculos": [
                {
                    "id": v.id,
                    "placa": v.veiculo.placa,
                    "empresa": v.veiculo.empresa,
                    "entrada": v.data_entrada,
                    "saida": v.data_saida,
                    "dentro": v.data_saida is None,
                    "tempo": tempo(v.data_entrada, v.data_saida),
                }
                for v in grupo.veiculos.all()
            ],
        })
    

