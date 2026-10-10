// Ícones desenhados do jogo (substituem os emojis nos lugares principais).
import bandeira from './img/ic/bandeira.webp';
import cadeado from './img/ic/cadeado.webp';
import carta from './img/ic/carta.webp';
import dia1 from './img/ic/dia1.webp';
import dia2 from './img/ic/dia2.webp';
import dia3 from './img/ic/dia3.webp';
import dia4 from './img/ic/dia4.webp';
import dia5 from './img/ic/dia5.webp';
import dia6 from './img/ic/dia6.webp';
import dia7 from './img/ic/dia7.webp';
import dificuldade from './img/ic/dificuldade.webp';
import estrela from './img/ic/estrela.webp';
import fogo from './img/ic/fogo.webp';
import gema from './img/ic/gema.webp';
import info from './img/ic/info.webp';
import lutar from './img/ic/lutar.webp';
import poeira from './img/ic/poeira.webp';
import premio from './img/ic/premio.webp';
import trofeu from './img/ic/trofeu.webp';
import vida from './img/ic/vida.webp';

const ICONES = { bandeira, cadeado, carta, dificuldade, estrela, fogo, gema, info, lutar, poeira, premio, trofeu, vida };
export type Icone = keyof typeof ICONES;

/** Ícone desenhado, do tamanho da letra (ajuste com uma classe extra). */
export const ic = (nome: Icone, cls = '') => `<img class="ic${cls ? ' ' + cls : ''}" src="${ICONES[nome]}" alt="" draggable="false">`;

/** Arte dos 7 dias da recompensa de login. */
export const DIAS_LOGIN = [dia1, dia2, dia3, dia4, dia5, dia6, dia7];

/* ---------- medalhões dos 12 signos ---------- */
const SIGNOS_IMG = import.meta.glob('./img/signos/*.webp', { eager: true, import: 'default' }) as Record<string, string>;

/** Endereço da arte do medalhão do signo. */
export const sgUrl = (s: string) => SIGNOS_IMG[`./img/signos/${s}.webp`] ?? '';

/** Medalhão do signo (o mesmo em todo o jogo). */
export const sg = (s: string, cls = '') => `<img class="sgm${cls ? ' ' + cls : ''}" src="${sgUrl(s)}" alt="" draggable="false">`;

/** Cor viva do miolo de cada medalhão (para pintar telas que giram em torno do signo). */
export const COR_MEDALHAO: Record<string, string> = {
  aries: '#e8321e', touro: '#4caf20', gemeos: '#f0a020', cancer: '#2a7ff0', leao: '#f08a10', virgem: '#3cc828',
  libra: '#9a3ce0', escorpiao: '#18b4c0', sagitario: '#e83020', capricornio: '#7a3ce0', aquario: '#2a5cf0', peixes: '#e03cb4',
};
