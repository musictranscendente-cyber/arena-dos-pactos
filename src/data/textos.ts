// Todos os textos de regras/cartas que aparecem no jogo ficam aqui (facilita traduzir depois).
import type { Card, Chegada, Keyword, SpellCard } from './schema';

export const KW: Record<Keyword, { i: string; n: string; d: string }> = {
  escudo: { i: '🛡️', n: 'Escudo', d: 'ignora o primeiro dano que receber.' },
  perfurar: { i: '🗡️', n: 'Perfurar', d: 'o dano que sobrar passa para a próxima carta da linha ou para o herói.' },
  distancia: { i: '🎯', n: 'Distância', d: 'ataca a carta mais ao fundo da linha inimiga.' },
  vampirico: { i: '🩸', n: 'Vampírico', d: 'cura seu herói no valor do dano causado.' },
  veneno: { i: '🧪', n: 'Veneno', d: 'a criatura atingida perde 1 de vida no início de cada rodada.' },
  corrente: { i: '🌀', n: 'Corrente', d: 'enquanto estiver em campo, seus feitiços custam 1 a menos.' },
  furia: { i: '💢', n: 'Fúria', d: 'ganha +1 de ataque sempre que sobrevive a um dano.' },
  investida: { i: '💨', n: 'Investida', d: 'ataca assim que entra em campo.' },
  lideranca: { i: '📣', n: 'Liderança', d: 'outros aliados na mesma linha ganham +1 de ataque.' },
  carapaca: { i: '🐚', n: 'Carapaça', d: 'todo dano recebido é reduzido em 1.' },
  cura: { i: '💚', n: 'Cura', d: 'no início da rodada, cura 2 de vida dos aliados da mesma linha.' },
  reflexo: { i: '⚖️', n: 'Reflexo', d: 'quem atacar esta carta leva 1 de dano.' },
  ascensao: { i: '⛰️', n: 'Ascensão', d: 'ganha +1/+1 no início de cada rodada.' },
  ilusao: { i: '🫧', n: 'Ilusão', d: 'na primeira vez que morre, volta para a sua mão.' },
};

export const ON: Record<Chegada, string> = {
  volley: 'Chegada: 2 de dano em uma criatura inimiga aleatória.',
  draw: 'Chegada: compre 1 carta.',
  face1: 'Chegada: 1 de dano no herói inimigo.',
  heal2: 'Chegada: cura 2 do seu herói.',
  twin: 'Chegada: cria um Eco 1/1 na mesma linha (Duplicar).',
};

export function spellText(c: SpellCard): string {
  switch (c.sp) {
    case 'dmg': return `${c.v} de dano em uma criatura inimiga que já estava em campo.`;
    case 'buff': return `+${c.a}/+${c.h} em uma criatura sua que já estava em campo.`;
    case 'lane': return `Escolha uma linha inimiga: ${c.v} de dano em todas as criaturas nela.`;
    case 'shield': return 'Dá Escudo a uma criatura sua que já estava em campo.';
    case 'poison': return 'Envenena uma criatura inimiga que já estava em campo.';
    case 'face': return `${c.v} de dano direto no herói inimigo.`;
    case 'heal': return `Cura ${c.v} de vida do seu herói.`;
    case 'draw': return `Compre ${c.v} cartas.`;
  }
}

export function cardText(c: Card): string {
  if (c.type === 'spell') return spellText(c);
  const parts = c.kw.map(k => `${KW[k].n}: ${KW[k].d}`);
  if (c.on) parts.push(ON[c.on]);
  return parts.length ? parts.join(' ') : 'Sem habilidade especial.';
}

export const T = {
  titulo: 'Arena dos Pactos',
  escolhaSigno: 'Escolha o seu signo. Cada mundo tem seu próprio deck de 30 cartas. O rival vem de um signo aleatório.',
  verCartas: 'Ver as 360 cartas',
  comoJogar: 'Como jogar',
  regras: [
    'Seu lado é o esquerdo. Invoque criaturas na sua grade 3x3 gastando mana. A coluna mais clara, perto do centro, é a da frente.',
    'Você e o rival jogam ao mesmo tempo, cada um sem ver o que o outro está fazendo.',
    'Toque em Batalha: as criaturas do rival são reveladas, depois as magias de fortalecer, depois as magias de dano, depois os efeitos de chegada (⏳).',
    'Então a arena se enfrenta fileira por fileira, de cima para baixo. Na mesma fileira, a 1ª criatura de cada lado bate junto com a 1ª do outro, a 2ª com a 2ª, não importa a casa. A próxima fileira só começa quando todos os ataques da anterior terminam.',
    'Cada criatura bate na primeira carta inimiga da sua linha. Linha vazia, o dano vai direto no herói.',
    'A mana sobe +1 por rodada, até 9. Uma vez por rodada, selecione uma carta e queime-a para ganhar +1 de mana.',
    'Zere os 30 de vida do rival. O botão ⟳ no topo liga ou desliga o modo deitado.',
  ],
  efeitoChegada: 'Efeito ao entrar em campo.',
  temporada: 'Temporada',
  voltar: 'Voltar',
  toqueCartaGaleria: 'Toque numa carta para ler o que ela faz.',
  magia: 'magia',
  queimar: '🔥 Queimar +1',
  info: 'Mostrar ou esconder a dica',
  desfazer: 'Desfazer a última jogada',
  investida: '💨 Investida!',
  ataque: 'ataque',
  aoEntrar: 'Ao entrar em campo:',
  rodada: 'Rodada',
  vida: 'vida',
  semHabilidade: 'Sem habilidade especial.',
  investidaMsg: (nome: string, dono: string) => `${nome} (${dono}) entrou com Investida e já ataca!`,
  efeito: {
    cura: (lado: 'p' | 'e', n: number) => lado === 'p' ? `Você recuperou ${n} de vida` : `O rival recuperou ${n} de vida`,
    compra: (lado: 'p' | 'e', n: number) => (lado === 'p' ? 'Você comprou' : 'O rival comprou') + ` ${n} carta${n === 1 ? '' : 's'}`,
    dano: (lado: 'p' | 'e', n: number) => lado === 'p' ? `Seu herói levou ${n} de dano` : `O herói rival levou ${n} de dano`,
  },
  desfeito: (nome: string) => `${nome} voltou para a mão.`,
  voltouMao: (nome: string) => `${nome} voltou para a mão: toque outra casa, ou escolha outra carta.`,
  batalha: 'Batalha!',
  semCartas: 'Sem cartas na mão.',
  voce: 'Você',
  rivalDe: (signo: string) => `Rival de ${signo}`,
  deck: (n: number) => `Deck ${n}`,
  maoDeck: (m: number, d: number) => `Mão ${m}, deck ${d}`,
  rodadaN: (n: number) => `Rodada ${n}`,
  rodadaInicio: (n: number) => `Rodada ${n}: faça suas jogadas e toque em Batalha. Até lá dá para mudar: toque numa criatura sua nova para trocá-la, ou em ↩.`,
  suaVez: 'Sua vez. Toque numa carta da mão.',
  manaInsuficienteQueimar: (nome: string) => `${nome}: mana insuficiente. Você pode queimá-la por +1 de mana.`,
  manaInsuficiente: (nome: string) => `Mana insuficiente para ${nome}.`,
  magiaPreparada: (nome: string) => `${nome} preparada. Ela acontece quando você tocar em Batalha.`,
  queimada: (nome: string) => `${nome} queimada: +1 de mana nesta rodada.`,
  invocou: (quem: string, nome: string) => `${quem} invocou ${nome}.`,
  usou: (quem: string, nome: string) => `${quem} usou ${nome}.`,
  perdeuAlvo: (nome: string, dono: string) => `${nome} ${dono} perdeu o alvo.`,
  chegada: (nome: string, dono: string) => `${nome} (${dono}): efeito de chegada.`,
  revela: 'O rival revela suas criaturas...',
  magias: 'Magias!',
  batalhaMsg: 'Batalha!',
  fileira: (n: number) => `Fileira ${n}`,
  deckAcabou: 'Seu deck acabou: -2 de vida.',
  maoCheia: 'Mão cheia: a carta comprada foi descartada.',
  hint: {
    unit: 'Toque numa casa vazia do seu lado.',
    inimiga: 'Toque numa criatura inimiga que já estava em campo.',
    sua: 'Toque numa criatura sua que já estava em campo antes desta rodada.',
    lane: 'Toque em qualquer casa da linha inimiga.',
    face: 'Toque em qualquer casa do lado inimigo.',
    propria: 'Toque em qualquer casa do seu lado.',
  },
  vitoria: 'Vitória!',
  derrota: 'Derrota',
  empate: 'Empate',
  venceu: (a: string, b: string) => `${a} venceu ${b}.`,
  rivalVenceu: (a: string) => `${a} venceu desta vez.`,
  caíramJuntos: 'Os dois heróis caíram juntos.',
  rodadasJogadas: (n: number) => `Rodadas jogadas: ${n}`,
  revanche: 'Revanche',
  trocarSigno: 'Trocar signo',
  alternarDeitado: 'Alternar modo deitado',
};
