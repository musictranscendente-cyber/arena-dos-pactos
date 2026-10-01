# Como levar o Arena dos Pactos para o Claude Code

## 1. Colocar a pasta no lugar certo
1. Baixe o arquivo `arena-dos-pactos.zip`.
2. Extraia para que a pasta fique exatamente assim:
   `C:\Users\luciv\Projetos\arena-dos-pactos`
3. Confira que dentro dela estão: `CLAUDE.md`, `COMO-COMECAR.md`, e as pastas `prototipo`, `dados` e `ferramentas`.

## 2. Conferir o Node.js
Abra o PowerShell e rode:
```powershell
cd "C:\Users\luciv\Projetos\arena-dos-pactos"
node -v
```
Se aparecer um número de versão, está pronto. Se der erro, instale o Node.js LTS em https://nodejs.org e abra um PowerShell novo.

## 3. Abrir o Claude Code na pasta
```powershell
cd "C:\Users\luciv\Projetos\arena-dos-pactos"
claude
```
Se o comando `claude` não existir, siga a instalação oficial: https://docs.claude.com/en/docs/claude-code/overview

O Claude Code lê o `CLAUDE.md` automaticamente ao abrir na pasta.

## 4. Primeiro pedido (copie e cole no Claude Code)

```
Leia o CLAUDE.md inteiro e abra o protótipo em prototipo/arena-dos-pactos.html para entender o comportamento atual.

Execute a Fase 0 do roadmap:
1. Crie o projeto Vite + TypeScript nesta pasta, com Vitest.
2. Porte o motor de regras para src/engine/, puro e determinístico, preservando exatamente as regras da seção 2 do CLAUDE.md.
3. Copie dados/cartas.json para src/data/ e valide com um schema.
4. Escreva testes para cada habilidade, cada tipo de magia, a ordem da Batalha e o pareamento por fileira.
5. Faça a interface equivalente ao protótipo (escolha de signo, galeria, batalha horizontal, modo deitado).
6. Crie o comando npm run sim para rodar partidas IA vs IA entre todos os signos e mostrar a taxa de vitória de cada um.

Aplique tudo direto nos arquivos. No final, me diga em português simples como rodar e testar, sempre com o cd do caminho completo antes de cada comando.
```

## 5. Pedidos seguintes (um de cada vez)
- `Rode npm run sim e rebalanceie as cartas pelo ferramentas/gerar_cartas.py até nenhum signo ficar abaixo de 45% ou acima de 55% de vitória.`
- `Faça a Fase 1: IA em três níveis de dificuldade.`
- `Prepare a Fase 2: campo de arte nas cartas, molduras por raridade e uma lista com o prompt de imagem de cada carta, seguindo a especificação do CLAUDE.md.`
- `Faça a Fase 3: campanha dos 12 mundos, coleção, montagem de deck e missões diárias, salvando o progresso no aparelho.`

## 6. Testar no navegador
Depois da Fase 0, o Claude Code vai te passar algo como:
```powershell
cd "C:\Users\luciv\Projetos\arena-dos-pactos"
npm run dev
```
Abra o endereço que aparecer (normalmente http://localhost:5173).

Para testar no celular na mesma rede Wi-Fi, peça ao Claude Code: `configure o npm run dev para eu abrir pelo celular`.
