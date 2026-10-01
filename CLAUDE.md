# Arena dos Pactos — instruções do projeto para o Claude Code

> Leia este arquivo inteiro antes de qualquer tarefa. Ele descreve o jogo, as regras exatas, o que já existe, a pesquisa de referência (Era7: Game of Truth) e o plano de desenvolvimento.

---

## 0. Como trabalhar com o dono do projeto

- O dono é **iniciante em programação e terminal** (programou sites há ~15 anos, usa **Windows**, usuário `luciv`).
- Pasta do projeto: `C:\Users\luciv\Projetos\arena-dos-pactos`
- **Sempre** que pedir para ele rodar um comando, comece com o `cd` do caminho completo, porque o terminal às vezes fecha:
  ```powershell
  cd "C:\Users\luciv\Projetos\arena-dos-pactos"
  npm run dev
  ```
- **Aplique as alterações direto nos arquivos do projeto.** Não gere arquivos para ele baixar e substituir.
- Explique em português simples o que mudou e como testar. Links sempre clicáveis.
- Todo texto que aparece no jogo é em **português do Brasil**.
- Objetivo de negócio: renda recorrente e o mais automática possível (jogo com economia normal, **sem NFT/cripto**).

---

## 1. Visão do jogo

**Arena dos Pactos** é um card game (TCG) de batalha rápida para celular, inspirado na mecânica do Era7: Game of Truth, mas com identidade própria: **12 mundos baseados nos 12 signos do zodíaco**.

- Partidas de ~3 a 5 minutos, jogadas com o **celular deitado (landscape)**.
- Tabuleiro horizontal: o jogador à **esquerda**, o rival à **direita**, criaturas se enfrentando no centro.
- Cada signo tem um deck próprio de 30 cartas, com cor, elemento e mecânica característica.
- Lançamento: primeiro web (portais como CrazyGames/Poki), depois Android (Play Store) com Capacitor.

### Propriedade intelectual (obrigatório)
Mecânicas podem ser inspiradas no Era7. **Nunca** usar nomes, logos, arte, textos de cartas, personagens ou layout de interface do Era7. Também não usar personagens de outras franquias (Disney, Marvel etc.). Zodíaco e mitologia grega são domínio público.

---

## 2. Regras oficiais do jogo (fonte da verdade)

O protótipo em `prototipo/arena-dos-pactos.html` implementa exatamente estas regras. Ao portar, preserve o comportamento.

### 2.1 Componentes
- Herói com **30 de vida**.
- Deck de **30 cartas** (as 30 do signo escolhido, 1 cópia de cada). Mão inicial: **3 cartas**. Mão máxima: **8** (carta comprada com a mão cheia é descartada).
- Tabuleiro: cada lado tem uma grade **3x3** = 3 **fileiras** (horizontais, de cima para baixo) × 3 **casas** de profundidade (frente, meio, fundo). A **frente** de cada lado é a coluna colada no centro.
- Mana: máximo começa em 0 e sobe **+1 por rodada até 9**; recarrega toda no início da rodada. Mana não acumula.

### 2.2 Estrutura da rodada (os dois jogadores jogam AO MESMO TEMPO)
1. **Início da rodada (simultâneo, para os dois lados):**
   1. Mana máxima +1 (limite 9) e mana recarregada; libera a "queima" da rodada.
   2. Efeitos de início: **Ascensão** (+1/+1) e **Cura** (cura 2 dos aliados da mesma fileira, até a vida máxima).
   3. **Veneno**: cada criatura envenenada perde 1 de vida.
   4. Compra 1 carta. Deck vazio = herói perde 2 de vida.
2. **Planejamento secreto (simultâneo):** cada jogador, sem ver o outro:
   - Invoca criaturas em casas vazias do próprio lado (paga a mana).
   - Prepara magias com alvo (pagam mana agora, **resolvem só na Batalha**).
   - **Queimar carta:** uma vez por rodada, descarta uma carta da mão para ganhar +1 de mana nesta rodada.
   - Magias que miram criatura só podem mirar criaturas que **já estavam em campo** antes desta rodada.
   - Efeitos de chegada ficam **pendentes** (⏳) até a Batalha.
3. **Botão "Batalha!"** — resolve nesta ordem:
   1. **Revelação:** as criaturas que o rival jogou aparecem.
   2. **Magias de suporte** dos dois lados (fortalecer, escudo, cura, comprar). Jogador primeiro, depois rival.
   3. **Magias de dano** dos dois lados (dano, linha, veneno, dano no herói). Magia cujo alvo sumiu é perdida.
   4. **Efeitos de chegada** pendentes (Investida, Duplicar, efeitos ⭐). Jogador primeiro, depois rival, em ordem de leitura.
   5. **Enfrentamento fileira por fileira** (ver 2.3).
4. Checa vitória; se ninguém venceu, nova rodada.

### 2.3 Enfrentamento
- Processa a **fileira 1 (cima)**, depois a 2, depois a 3. **A próxima fileira só começa quando todos os ataques da anterior terminam.**
- Dentro da fileira, monta a lista de criaturas de cada lado na ordem **frente → fundo**.
- A **1ª criatura de cada lado ataca junto** com a 1ª do outro (não importa em que casa estejam), depois a 2ª com a 2ª, e assim por diante. Se um lado tem mais criaturas, as extras atacam sozinhas, uma por vez.
- Ataques do mesmo passo são **simultâneos**: se uma criatura morre no mesmo passo em que ataca, o dano dela ainda acontece. Uma criatura que já morreu em passo anterior não ataca.
- **Alvo do ataque:** a primeira criatura inimiga da **mesma fileira**, da frente para o fundo. Com **Distância**, a mais ao fundo. Fileira inimiga vazia = dano direto no herói inimigo.
- Ataque efetivo = ataque da carta + bônus de **Liderança** de aliados na mesma fileira.

### 2.4 Vitória
Herói com vida 0 ou menos perde. Os dois a 0 no mesmo momento = empate.

### 2.5 Habilidades (keywords)
| Ícone | Nome | Efeito exato |
|---|---|---|
| 🛡️ | Escudo | Anula completamente o primeiro dano recebido (de qualquer fonte) e some. |
| 🗡️ | Perfurar | Dano que sobra após matar o alvo passa para a próxima criatura da fileira; se não houver, vai para o herói. |
| 🎯 | Distância | Ataca a criatura inimiga mais ao fundo da fileira. |
| 🩸 | Vampírico | Cura o próprio herói no valor do dano causado (máx. 30). |
| 🧪 | Veneno | Criatura atingida (e que sobrevive) fica envenenada: perde 1 de vida no início de cada rodada. |
| 🌀 | Corrente | Enquanto estiver em campo, as magias do dono custam 1 a menos (não acumula). |
| 💢 | Fúria | Ganha +1 de ataque sempre que sobrevive a um dano. |
| 💨 | Investida | Ao entrar (na fase de chegada), já realiza um ataque. |
| 📣 | Liderança | Outros aliados na mesma fileira ganham +1 de ataque. |
| 🐚 | Carapaça | Todo dano recebido é reduzido em 1 (aplica depois do Escudo). |
| 💚 | Cura | No início da rodada, cura 2 de vida dos aliados da mesma fileira (até a vida máxima). |
| ⚖️ | Reflexo | Quem ataca esta criatura leva 1 de dano. |
| ⛰️ | Ascensão | Ganha +1/+1 no início de cada rodada. |
| 🫧 | Ilusão | Na primeira vez que morre, volta para a mão do dono (a cópia que volta não volta de novo). |

**Efeitos de chegada (⭐):**
- `twin` (Duplicar): cria um **Eco 1/1** numa casa vazia da mesma fileira (ou qualquer casa vazia).
- `face1`: 1 de dano no herói inimigo (Fogo).
- `heal2`: cura 2 do próprio herói (Terra).
- `draw`: compra 1 carta (Ar).
- `volley`: 2 de dano numa criatura inimiga aleatória (Água).

**Tipos de magia (`sp`):**
| Tipo | Alvo | Efeito | Grupo |
|---|---|---|---|
| `buff` | criatura sua (já em campo) | +a/+h (aumenta vida máxima) | suporte |
| `shield` | criatura sua (já em campo) | ganha Escudo | suporte |
| `heal` | qualquer casa sua | cura `v` do herói | suporte |
| `draw` | qualquer casa sua | compra `v` cartas | suporte |
| `dmg` | criatura inimiga (já em campo) | `v` de dano | dano |
| `poison` | criatura inimiga (já em campo) | envenena | dano |
| `lane` | qualquer casa de uma fileira inimiga | `v` de dano em todas as criaturas da fileira | dano |
| `face` | qualquer casa inimiga | `v` de dano no herói | dano |

---

## 3. Os 12 mundos

| Signo | Elemento | Mecânica principal | Secundárias | Cor |
|---|---|---|---|---|
| ♈ Áries | Fogo | Investida | Perfurar, Escudo | #d6452f |
| ♉ Touro | Terra | Fúria | Escudo, Vampírico | #6f8f2e |
| ♊ Gêmeos | Ar | Duplicar (`twin`) | Distância, Reflexo | #d4b234 |
| ♋ Câncer | Água | Carapaça | Escudo, Vampírico | #3fa79a |
| ♌ Leão | Fogo | Liderança | Perfurar, Escudo | #e08a1e |
| ♍ Virgem | Terra | Cura | Escudo, Reflexo | #a57c4a |
| ♎ Libra | Ar | Reflexo | Escudo, Distância | #c06fb5 |
| ♏ Escorpião | Água | Veneno | Vampírico, Escudo | #7a3fa6 |
| ♐ Sagitário | Fogo | Distância | Perfurar, Investida | #e35d6a |
| ♑ Capricórnio | Terra | Ascensão | Escudo, Fúria | #7d8a99 |
| ♒ Aquário | Ar | Corrente (feitiços) | Distância, Escudo | #2e9cc8 |
| ♓ Peixes | Água | Ilusão | Vampírico, Veneno | #4a6fd6 |

Perfil por elemento: **Fogo** mais ataque, **Terra** mais vida, **Ar/Água** equilibrados.

**Temporadas (calendário real → eventos):** Áries 21/03, Touro 20/04, Gêmeos 21/05, Câncer 21/06, Leão 23/07, Virgem 23/08, Libra 23/09, Escorpião 23/10, Sagitário 22/11, Capricórnio 22/12, Aquário 20/01, Peixes 19/02. A temporada atual aparece marcada na escolha de signo. Ideia: cada mês, evento temático do signo da vez.

---

## 4. Cartas (360)

- Arquivo: `dados/cartas.json` (360 cartas + o token `eco`).
- Gerador: `ferramentas/gerar_cartas.py` (nomes, emojis e magias de cada signo + fórmula de atributos). Para rebalancear, edite o gerador e rode de novo; ele recria `cartas.json`.
- Cada signo: **25 criaturas** com curva de custo fixa `[1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,5,5,5,6,6,7,8]` + **5 magias**.
- Raridade: `c` comum (custo ≤2), `r` rara (3–4), `e` épica (5–6), `l` lendária (7–8 e as 2 últimas criaturas do signo). A última criatura de cada signo leva o nome do signo (ex.: "Áries, o Carneiro Dourado").
- Fórmula de orçamento: `2 × custo + 1` (+2 nas lendárias) − 1 por habilidade (Ascensão e Duplicar custam 2) − 1 por efeito de chegada. Divide entre ataque e vida pela proporção do elemento (Fogo 0,56; Terra 0,36; Ar 0,46; Água 0,45).

Formato de uma criatura:
```json
"aries01": {"name":"Carneiro Ígneo","race":"aries","type":"unit","cost":1,"atk":1,"hp":1,"kw":["investida"],"e":"🐏","on":null,"r":"c"}
```
Formato de uma magia:
```json
"ariess5": {"name":"Meteoro","race":"aries","type":"spell","cost":5,"sp":"dmg","v":5,"e":"☄️","r":"e","kw":[]}
```
`e` é o emoji provisório; será trocado pela arte (campo novo `art`).

---

## 5. O que já existe

`prototipo/arena-dos-pactos.html` — protótipo completo e jogável num único arquivo (HTML + CSS + JS, sem dependências):
- Tela de escolha de signo (12), com a temporada atual marcada.
- Galeria das 360 cartas por signo.
- Partida contra IA com todas as regras da seção 2, animações simples (números flutuantes, destaque de quem ataca).
- Modo deitado automático: se a tela estiver em pé, o jogo é desenhado girado 90°; botão ⟳ liga/desliga. Também tenta tela cheia + travar em landscape.
- IA simples (heurística): joga as cartas mais caras que couberem, escolhe fileira por ameaça, usa magias com alvo óbvio, queima carta quando isso libera uma jogada.
- Foi testado com simulações automáticas (jsdom) em partidas dos 12 signos, sem erros.

Abra o arquivo no navegador para ver como deve se comportar. Ele é a **referência de comportamento** para o port.

---

## 6. Pesquisa de referência: Era7: Game of Truth

Resumo do que foi levantado (para inspiração de mecânica e de produto — não copiar conteúdo):
- TCG play-to-earn na BNB Smart Chain, de uma empresa de Singapura fundada em 2021; investidores incluíam HashKey, MOBOX e Huobi Ventures. Venda de caixas NFT em dez/2021, jogo no início de 2022.
- **Tabuleiro**: grade **3x3** por jogador segundo a fonte oficial da BNB Chain (outras fontes citam 6x6/9x9, provavelmente erro de tradução). Deck de **30 cartas**.
- **Cartas de criatura**: custo de mana, ataque, vida e efeito especial (nem todas têm efeito).
- **Mana**: +1 por rodada até 9, recarga total, não acumula. **Recarga**: queimar uma carta da mão dá +1 de mana na rodada, uma vez por rodada.
- **Batalha**: os jogadores posicionam e apertam "Punch"; as criaturas atacam a carta à frente na mesma linha; linha vazia acerta o herói. Ordem: de cima para baixo, da frente para trás. Os dois lados jogam a rodada ao mesmo tempo e a arena se enfrenta depois.
- **Feitiços**: dois tipos — os que miram uma criatura já em campo (não a que acabou de entrar) e os que miram o campo.
- **Mundo**: sete raças disputando o título de "Rei da Verdade"; invocadores treinados numa academia. Meta de mais de 1.000 cartas. Raridades comum, rara, épica, lendária.
- **Modos**: PvE (fases/aventura), torneios diários, ranqueadas mensais, copas quinzenais. Partidas de ~3 minutos.
- **Economia**: baseada em NFT — "Master Card" para invocar cartas; upgrade/fusão gastavam os tokens GOT (ganho jogando) e ERA (governança/marketplace).
- **Fim**: a versão BSC encerrou em **30/09/2023** sem migração de dados; jogadores em 2024 ainda perguntavam se o jogo tinha morrido.
- **Lição**: a mecânica era boa; a economia especulativa de NFT afundou o jogo. O nicho de card game de grade com combate automático, sem cripto, no celular, está pouco ocupado.
- **Jogos com mecânicas parecidas** (referência de design): Inscryption (faixas, ataca a carta da frente ou o herói), The Elder Scrolls: Legends (faixas), Super Auto Pets e Hearthstone Battlegrounds (combate automático), Marvel Snap e Hearthstone (mana +1 por turno).

---

## 7. Arquitetura alvo

Stack recomendada:
- **Vite + TypeScript** (projeto web).
- **Motor de regras puro** em `src/engine/` — TypeScript sem DOM, determinístico, com **RNG com semente** (seed). Recebe estado + ações, devolve novo estado + lista de eventos (para animar). O mesmo motor vai rodar no servidor quando houver PvP.
- **Renderização**: **Phaser 3** para a cena de batalha (sprites, animações dos personagens, efeitos), HTML/CSS para menus simples. Se Phaser ficar pesado para o início, manter DOM/CSS como no protótipo e migrar depois — mas o motor deve ser independente da UI em qualquer caso.
- **Testes**: **Vitest**, com um teste para cada habilidade, cada tipo de magia, a ordem da Batalha e o pareamento por fileira.
- **Dados**: `src/data/cartas.json` (copiado de `dados/`), validado com um schema (zod).
- **App Android**: **Capacitor**, orientação travada em landscape.
- **Backend (depois)**: Supabase ou Nakama — contas, coleção, economia e PvP com batalha decidida no servidor.

Estrutura sugerida:
```
src/
  engine/        regras puras (state.ts, round.ts, battle.ts, keywords.ts, spells.ts, ai/)
  data/          cartas.json, signos.ts, raridades.ts
  scenes/        Phaser: Boot, Menu, EscolhaSigno, Galeria, Batalha, Resultado
  ui/            componentes HTML/CSS
  services/      salvar progresso, economia, analytics
tests/           vitest
public/art/      arte das cartas (sign/id.webp)
```

Eventos do motor (exemplos): `UnitPlaced`, `SpellQueued`, `Reveal`, `SpellResolved`, `ArrivalResolved`, `Attack`, `Damage`, `ShieldBroken`, `Poisoned`, `UnitDied`, `UnitReturnedToHand`, `HeroDamaged`, `HeroHealed`, `RowStarted`, `GameOver`. A UI só toca as animações a partir dessa lista.

---

## 8. Roadmap (faça em ordem, com o dono testando a cada fase)

### Fase 0 — Port do protótipo (prioridade máxima) ✅ concluída em 01/10/2026
- [x] Criar o projeto Vite + TS, ESLint, Vitest. `npm run dev` abre o jogo.
- [x] Portar o motor do protótipo para `src/engine/` preservando 100% das regras da seção 2.
- [x] Testes cobrindo todas as habilidades, magias, ordem da Batalha e pareamento por fileira.
- [x] UI equivalente ao protótipo (escolha de signo, galeria, batalha horizontal, modo deitado).
- [x] Simulador headless: `npm run sim` roda N partidas IA vs IA entre todos os pares de signos e imprime taxa de vitória por signo (para balancear).

Primeiro resultado do simulador (50 partidas por confronto, semente 12345): 10 dos 12 signos fora da faixa. Fortes: Peixes 74%, Áries 72%, Gêmeos 70%, Libra 63%, Câncer 61%. Fracos: Touro 22%, Leão 25%, Capricórnio 37%, Virgem 38%, Sagitário 40%.

### Fase 1 — Balanceamento e IA
- [ ] Rodar o simulador; alvo: nenhum signo abaixo de 45% ou acima de 55% de vitória.
- [ ] IA em 3 níveis (fácil/normal/difícil). Difícil: avalia jogadas simulando a Batalha com o próprio motor.
- [ ] Revisar textos e nomes das cartas.

### Fase 2 — Arte
- Especificação para gerar as artes com IA: personagem **de perfil, olhando para a direita** (o jogo espelha os do rival), corpo inteiro ou meio corpo, **fundo transparente ou neutro**, **512×512 PNG/WebP**, estilo único para todo o jogo, paleta puxando para a cor do signo.
- [ ] Campo `art` nas cartas; fallback para o emoji enquanto não houver arte.
- [ ] Moldura de carta por raridade e por signo; ícone do signo.
- [ ] Animações básicas: entrada, ataque (avanço), dano (tremida), morte (dissolver).

### Fase 3 — Progressão (o que faz o jogador voltar)
- [ ] Campanha PvE: os 12 mundos, ~10 fases cada, chefes = lendárias.
- [ ] Coleção: o jogador começa com o deck básico do seu signo e desbloqueia cartas.
- [ ] Montagem de deck (30 cartas, até 2 cópias de cada, lendárias com 1 cópia só).
- [ ] Missões diárias, recompensa de login, eventos mensais da temporada do signo.
- [ ] Salvar progresso local (e depois na nuvem).

### Fase 4 — Economia sem NFT
- Moedas: **Poeira Estelar** (ganha jogando) e **Gemas** (premium).
- Receita: passe de temporada, cosméticos (molduras, versos de carta, heróis), pacotes de cartas, anúncios recompensados.
- Cuidados: no Google Play, compras com **Play Billing** e **probabilidades de pacotes visíveis**; no Brasil, verificar as regras do **ECA Digital** sobre loot boxes para menores (se necessário, trocar pacotes aleatórios por loja direta/passe).

### Fase 5 — Lançamento web
- [ ] Build leve, carregamento rápido, SDK de portal (CrazyGames/Poki) para anúncios.
- [ ] Analytics: retenção D1/D7, duração de partida, taxa de vitória por signo.

### Fase 6 — Android
- [ ] Capacitor, ícone, splash, landscape travado, Play Billing.
- [ ] Conta de desenvolvedor Google (taxa única) e teste fechado obrigatório para contas pessoais novas (confirmar a regra atual de número de testadores e dias).

### Fase 7 — Online
- [ ] Contas e nuvem (Supabase/Nakama).
- [ ] PvP com o motor rodando no servidor (cliente só envia ações), ranqueada mensal, torneios diários e copas quinzenais.

---

## 8.1 Como o código ficou (Fase 0)

Comandos (sempre com o `cd` antes):
- `npm run dev` — abre o jogo (http://localhost:5173; também mostra um endereço "Network" para abrir no celular na mesma Wi-Fi).
- `npm test` — roda os testes do motor (Vitest).
- `npm run sim` — simulador IA vs IA. Opcional: `npm run sim -- 100 777` (partidas por confronto, semente).
- `npm run lint` / `npm run build`.

Mapa:
- `src/data/` — `cartas.json` (cópia de `dados/`), `schema.ts` (zod: valida as cartas ao carregar), `cards.ts`, `signos.ts`, `raridades.ts`, `textos.ts` (todos os textos do jogo).
- `src/engine/` — motor puro. `round.ts` (nova partida, início de rodada, ações do planejamento: `applyAction`), `battle.ts` (`resolveBattle`), `keywords.ts` (dano, morte, ataque), `spells.ts`, `state.ts`, `rng.ts` (mulberry32; o estado do RNG fica dentro do `GameState`), `ctx.ts` (gravador de eventos/quadros), `ai/simples.ts` (IA do protótipo, `planTurn`).
- A Batalha devolve **quadros** (`Frame`): cada quadro = eventos que aconteceram juntos + foto do estado. A UI desenha um quadro, mostra os números flutuantes dos eventos e pausa. O simulador desliga as fotos (`record: false`).
- `src/ui/` — interface em DOM/CSS (mesmo visual do protótipo). Phaser fica para a Fase 2 (arte/animações).
- `src/sim/` — simulador. `tests/` — testes do motor.

Diferença deliberada em relação ao protótipo (os dois lados agora seguem exatamente a mesma regra, pensando no PvP):
- No protótipo, só as criaturas do jogador iam para o tabuleiro durante o planejamento; as do rival ficavam numa fila e entravam na Revelação. Agora as invocações dos **dois** lados vão direto para o tabuleiro marcadas como `hidden` (secretas); a Revelação tira a marca. A interface não mostra as secretas do rival, e a IA não enxerga as secretas do outro lado.
- Efeito prático único: a Corrente invocada pela IA nesta rodada já reduz o custo das magias dela nesta mesma rodada (antes isso só valia para o jogador).
- Tela final mostra o número real de rodadas (o protótipo mostrava metade, sobra de uma versão antiga por turnos).

## 9. Regras de código
- O motor nunca acessa DOM, `Math.random` direto ou relógio: tudo entra por parâmetro (seed, ações).
- Toda regra nova ou alterada ganha teste.
- Textos do jogo centralizados (facilita traduzir depois).
- Não quebrar o comportamento da seção 2 sem o dono pedir; se uma regra mudar, atualize este arquivo também.
- Commits pequenos e com mensagem em português.
