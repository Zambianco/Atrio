# Registro de Mudancas

Todas as mudancas relevantes deste projeto serao registradas neste arquivo.

O formato e baseado em Keep a Changelog,
e este projeto segue o Versionamento Semantico.

## Nao Lancado

## 1.5.4 - 2026-03-16

### Corrigido

- Erros do backup agora são capturados sem derrubar o container, com registro da mensagem do 7z no log

## 1.5.3 - 2026-03-16

### Corrigido

- Erro de codificação que impedia o uso de caracteres acentuados na senha do backup

## 1.5.2 - 2026-03-16

### Alterado

- Backup manual agora utiliza arquivo gatilho para acionamento via container dedicado

## 1.5.1 - 2026-03-16

### Corrigido

- Melhoria na exibição da mensagem de erro

## 1.5.0 - 2026-03-16

### Adicionado

- Botão para acionamento de backup manual

### Corrigido

- Horário no nome do arquivo de backup corrigido para horário local

## 1.4.0 - 2026-03-16

### Adicionado

- Adicionada verificação de funcionamento do backup

## 1.3.0 - 2026-03-16

### Adicionado

- No cadastro de pessoa, caso o número de documento informado já esteja vinculado a outro cadastro, o usuário é consultado se deseja abrir o cadastro existente
- Nova página de coleta, exibindo os dados de veículo e motorista para os usuários envolvidos nas atividades de coleta de equipamentos
- Na criação de nova visita, adicionada a opção de marcar a visita como coleta

## 1.2.1 - 2026-03-16

### Corrigido

- Ampliar busca de veículos por empresa e corrigir erro 403 em sugestões

## 1.2.0 - 2026-03-16

### Adicionado

- Botões de cadastro rápido de pessoa e veículo na tela de nova visita
- Tipos "fornecedor" e "prestador" no cadastro de pessoas
- Sugestão de pessoas ao adicionar veículo, com base na empresa e histórico de visitantes
- Endpoint de hora do servidor e relógio sincronizado com o servidor
- Validação de CPF e CNH no cadastro de pessoas
- Órgão emissor automático para CNH e CPF no cadastro de pessoas

### Alterado

- Posição do botão de cadastro de pessoa e veículo movida para o header do card
- Melhorias no layout e no fluxo da tela de nova visita
- Campo "Validade" oculto para CPF no cadastro de pessoas

### Corrigido

- Melhorias no rodapé

## 1.1.0 - 2025-02-01

### Adicionado

### Alterado

### Corrigido
