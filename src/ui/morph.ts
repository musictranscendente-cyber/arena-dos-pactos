/*
 * Atualiza a tela da partida sem recriá-la.
 * Antes, cada passo da Batalha apagava o tabuleiro inteiro e montava de novo (innerHTML): as imagens das criaturas
 * eram trocadas por outras iguais, as animações recomeçavam e, no celular, tudo piscava. Agora o HTML novo é só uma
 * "receita": comparamos com o que já está na tela e mudamos apenas o que for diferente (um número, uma classe).
 * Elementos que não mudaram continuam sendo exatamente os mesmos — nada é recarregado nem reiniciado.
 */

/** Efeitos passageiros (números flutuantes, projéteis, criatura morrendo...): o redesenho não mexe neles. */
export const EFEMERO = 'data-ef';

/** Classes colocadas por animações curtas (não vêm do HTML): ficam até o próprio efeito tirar. */
const CLASSES_DE_EFEITO = ['hit', 'fortalecida', 'curado', 'tut-alvo'];

function efemero(n: Node): boolean {
  return n.nodeType === 1 && (n as Element).hasAttribute(EFEMERO);
}

/** Identidade de um elemento: o id, ou a chave da figura da criatura (muda quando é outra criatura). */
function chave(n: Node): string {
  if (n.nodeType !== 1) return '';
  const el = n as Element;
  return el.id ? '#' + el.id : el.getAttribute('data-fk') ? 'fk' + el.getAttribute('data-fk') : '';
}

function classe1(n: Node): string {
  return n.nodeType === 1 ? (n as Element).classList[0] ?? '' : '';
}

function mesmoTipo(a: Node, b: Node): boolean {
  return a.nodeType === b.nodeType && a.nodeName === b.nodeName;
}

/** Variáveis de fase das animações (ver idlePhase em desenho.ts). */
const FASE = /--p[abh]:[^;]*;?/g;

/**
 * As fases são calculadas pelo relógio quando o HTML é montado: servem para uma animação que começa agora.
 * Num elemento que já está animando, trocar a fase faria a animação pular — então ela fica como estava,
 * a não ser que a classe mude (aí a animação pode estar recomeçando, como o golpe saindo da espera).
 */
function estiloComFaseAntiga(velho: string | null, novo: string): string {
  const fases = velho?.match(FASE);
  if (!fases) return novo;
  const sem = novo.replace(FASE, '');
  return sem + (sem && !sem.endsWith(';') ? ';' : '') + fases.map(f => f.endsWith(';') ? f : f + ';').join('');
}

function copiarAtributos(de: Element, para: Element): void {
  const semEfeito = (el: Element) => [...el.classList].filter(c => !CLASSES_DE_EFEITO.includes(c)).join(' ');
  const mesmaClasse = semEfeito(de) === semEfeito(para);
  for (const { name } of [...de.attributes]) {
    if (name === EFEMERO || para.hasAttribute(name)) continue;
    de.removeAttribute(name);
  }
  for (const { name, value } of [...para.attributes]) {
    let v = value;
    if (name === 'style' && mesmaClasse && /--p[abh]:/.test(value)) v = estiloComFaseAntiga(de.getAttribute('style'), value);
    if (name === 'class') {
      const extra = CLASSES_DE_EFEITO.filter(c => de.classList.contains(c) && !para.classList.contains(c));
      if (extra.length) v = (v ? v + ' ' : '') + extra.join(' ');
    }
    if (de.getAttribute(name) !== v) de.setAttribute(name, v);
  }
  if (de.tagName === 'INPUT' && (de as HTMLInputElement).value !== (para as HTMLInputElement).value) {
    (de as HTMLInputElement).value = (para as HTMLInputElement).value;
  }
}

function atualizar(de: Node, para: Node): void {
  if (de.nodeType === 1) {
    copiarAtributos(de as Element, para as Element);
    atualizarFilhos(de as Element, para as Element);
  } else if (de.nodeValue !== para.nodeValue) {
    de.nodeValue = para.nodeValue;
  }
}

/** Faz os filhos de `de` ficarem iguais aos de `para`, reaproveitando todos os que der. */
export function atualizarFilhos(de: Element, para: Element): void {
  const velhos = [...de.childNodes].filter(n => !efemero(n));
  const porChave = new Map<string, Node>();
  for (const v of velhos) { const k = chave(v); if (k) porChave.set(k, v); }
  const semChave = velhos.filter(v => !chave(v));
  const usados = new Set<Node>();
  let p = 0; // próximo velho sem chave a tentar
  // 1º: acha o par de cada filho novo entre os que já estão na tela
  const pares = [...para.childNodes].map(novo => {
    const k = chave(novo);
    let achado: Node | undefined;
    if (k) {
      const v = porChave.get(k);
      if (v && mesmoTipo(v, novo) && !usados.has(v)) achado = v;
    } else {
      // de preferência um da mesma classe (o ⏳ que sumiu não vira a fileira de habilidades, por exemplo)
      const classe = classe1(novo);
      let j = semChave.findIndex((v, i) => i >= p && mesmoTipo(v, novo) && classe1(v) === classe);
      if (j < 0) j = semChave.findIndex((v, i) => i >= p && mesmoTipo(v, novo));
      if (j >= 0) { achado = semChave[j]; p = j + 1; }
    }
    if (achado) usados.add(achado);
    return { novo, achado };
  });
  // 2º: tira os que saíram — antes de arrumar a ordem, para nenhum que fica precisar ser movido
  // (mover um elemento faz as animações dele recomeçarem)
  for (const v of velhos) if (!usados.has(v)) v.remove();
  // 3º: atualiza os que ficam e põe os novos no lugar
  let anterior: Node | null = null;
  for (const { novo, achado } of pares) {
    if (achado) atualizar(achado, novo);
    const no = achado ?? novo;
    let alvo: Node | null = anterior ? anterior.nextSibling : de.firstChild;
    while (alvo && efemero(alvo) && alvo !== no) alvo = alvo.nextSibling;
    if (alvo !== no) de.insertBefore(no, alvo);
    anterior = no;
  }
}

/** Troca o conteúdo de `raiz` pelo HTML novo, mexendo só no que mudou. */
export function morph(raiz: Element, html: string): void {
  const t = document.createElement('template');
  t.innerHTML = html;
  const nova = document.createElement(raiz.tagName);
  nova.appendChild(t.content);
  atualizarFilhos(raiz, nova);
}
