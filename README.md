# Pré-Matrícula SENAI — Página Mobile

Esta é a página estática de pré-matrícula do projeto Totem Cruzr — SENAI Neoindústria.

## Como Funciona

- A página é aberta pelo visitante em seu próprio smartphone ao escanear o QR Code exibido no peito do robô Cruzr durante o atendimento.
- O endereço deve incluir o identificador do curso selecionado via parâmetro na URL:  
  `https://kazuhirokamim.github.io/neoindustria-pre-matricula/?c=<curso_id>`  
  Exemplo: `?c=analise-de-riscos`
- Caso a página seja acessada diretamente sem o parâmetro `?c=`, com parâmetro vazio ou com identificador inexistente, a aplicação bloqueia o formulário e exibe o aviso "Curso não identificado", orientando o visitante a selecionar o curso no totem e escanear o QR Code correspondente.

## Código-fonte e Testes

O código-fonte completo da solução, histórico de decisões, testes automatizados e suíte de validação residem no repositório principal do projeto.

