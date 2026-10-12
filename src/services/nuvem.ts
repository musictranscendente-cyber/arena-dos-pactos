// Conta e progresso na nuvem (Supabase). Sem as chaves configuradas, o jogo segue só no aparelho.
// Guarda numa linha por jogador: progresso, decks e perfil (o mesmo que fica no localStorage).
import type { SupabaseClient, User } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Chaves do aparelho que vão para a nuvem. */
const CHAVES = { progresso: 'arena-dos-pactos:progresso', decks: 'arena-dos-pactos:decks', perfil: 'arena-dos-pactos:perfil' } as const;
const SALVO_EM = 'arena-dos-pactos:salvoEm';
const ESPERA_MS = 2500;

export type Situacao = 'desligada' | 'iniciando' | 'fora' | 'entrando' | 'salvando' | 'salvo' | 'erro';

let sb: SupabaseClient | null = null;
let usuario: User | null = null;
let situacao: Situacao = URL && CHAVE ? 'iniciando' : 'desligada';
let timer = 0;
/** Já comparou com a nuvem nesta sessão (antes disso, nada é enviado). */
let sincronizado = false;
let avisar: () => void = () => {};
let aplicar: () => void = () => {};

export const nuvemAtiva = () => situacao !== 'desligada';
export const situacaoNuvem = () => situacao;
export const emailConta = () => usuario?.email ?? null;
export const logado = () => !!usuario;
/** Ainda descobrindo se há uma sessão salva (logo ao abrir o jogo). */
export const verificandoConta = () => situacao === 'iniciando';

function mudar(s: Situacao): void { situacao = s; avisar(); }

const ler = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };

/** Chamado sempre que o jogo salva algo no aparelho: marca a hora e agenda o envio. */
export function marcarMudanca(): void {
  gravar(SALVO_EM, new Date().toISOString());
  if (!sb || !usuario || !sincronizado) return;
  clearTimeout(timer);
  timer = window.setTimeout(() => { void enviar(); }, ESPERA_MS);
}

function pacoteLocal(): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  for (const [nome, k] of Object.entries(CHAVES)) { const v = ler(k); if (v) { try { d[nome] = JSON.parse(v); } catch { /* ignora */ } } }
  return d;
}

const CONTA = 'arena-dos-pactos:conta';
const BASE = 'arena-dos-pactos:nuvemBase';
const BACKUP = 'arena-dos-pactos:backups';

/**
 * Ao entrar: decide se o aparelho BAIXA o que está na nuvem ou ENVIA o que tem.
 * - nuvem vazia → envia;
 * - progresso do aparelho é de outra conta (ou de quem jogou sem conta) → baixa a nuvem (o do aparelho vai para o backup);
 * - mesma conta e a nuvem mudou desde a última vez que este aparelho sincronizou (outro aparelho salvou) → baixa;
 * - senão (só este aparelho mexeu) → envia.
 * Nunca decide pela hora do "último salvamento" do aparelho: abrir o jogo já salva coisas pequenas
 * e isso fazia um aparelho desatualizado apagar o progresso da nuvem.
 */
export function decidirSincronia(o: { temNuvem: boolean; nuvemAtualizado?: string; contaDoAparelho: string | null; usuario: string; base: string | null }): 'baixar' | 'enviar' {
  if (!o.temNuvem) return 'enviar';
  if (o.contaDoAparelho !== o.usuario) return 'baixar';
  if (!o.base || o.nuvemAtualizado !== o.base) return 'baixar';
  return 'enviar';
}

/** Guarda uma cópia do progresso do aparelho antes de ele ser trocado pelo da nuvem (até 5 cópias). */
function guardarBackup(motivo: string): void {
  try {
    const lista = JSON.parse(ler(BACKUP) ?? '[]') as unknown[];
    lista.unshift({ quando: new Date().toISOString(), motivo, conta: ler(CONTA), dados: pacoteLocal() });
    gravar(BACKUP, JSON.stringify(lista.slice(0, 5)));
  } catch { /* sem espaço: segue */ }
}

export interface Backup { quando: string; motivo: string; dados: Record<string, unknown> }

/** Cópias guardadas antes de o progresso do aparelho ser trocado pelo da nuvem. */
export function listarBackups(): Backup[] {
  try { return (JSON.parse(ler(BACKUP) ?? '[]') as Backup[]).filter(b => b && b.dados && b.quando); } catch { return []; }
}

/** Volta uma cópia guardada: vira o progresso do aparelho (e vai para a nuvem, se estiver conectado). */
export function restaurarBackup(i: number): boolean {
  const b = listarBackups()[i];
  if (!b) return false;
  guardarBackup('antes de restaurar uma cópia');
  for (const [nome, k] of Object.entries(CHAVES)) if (b.dados[nome] !== undefined) gravar(k, JSON.stringify(b.dados[nome]));
  aplicar();
  marcarMudanca();
  return true;
}

async function enviar(): Promise<void> {
  if (!sb || !usuario) return;
  mudar('salvando');
  const atualizado = new Date().toISOString();
  const { error } = await sb.from('jogadores').upsert({ id: usuario.id, dados: pacoteLocal(), atualizado });
  if (!error) { gravar(BASE, atualizado); gravar(CONTA, usuario.id); }
  mudar(error ? 'erro' : 'salvo');
}

async function sincronizar(): Promise<void> {
  if (!sb || !usuario) return;
  sincronizado = false;
  mudar('salvando');
  const { data, error } = await sb.from('jogadores').select('dados, atualizado').eq('id', usuario.id).maybeSingle();
  if (error) { mudar('erro'); return; }
  const acao = decidirSincronia({ temNuvem: !!data, nuvemAtualizado: data?.atualizado, contaDoAparelho: ler(CONTA), usuario: usuario.id, base: ler(BASE) });
  if (acao === 'baixar' && data) {
    if (ler(CHAVES.progresso)) guardarBackup('antes de baixar da nuvem');
    const d = (data.dados ?? {}) as Record<string, unknown>;
    for (const [nome, k] of Object.entries(CHAVES)) if (d[nome] !== undefined) gravar(k, JSON.stringify(d[nome]));
    gravar(BASE, data.atualizado); gravar(CONTA, usuario.id); gravar(SALVO_EM, data.atualizado);
    sincronizado = true;
    aplicar();
    mudar('salvo');
  } else { sincronizado = true; await enviar(); }
}

/** Liga a nuvem: lembra a sessão, e avisa a tela quando algo muda. `recarregar` relê o progresso do aparelho. */
export async function iniciarNuvem(onMudou: () => void, recarregar: () => void): Promise<void> {
  avisar = onMudou; aplicar = recarregar;
  if (!URL || !CHAVE) return;
  // a biblioteca do Supabase só é baixada depois que o jogo já apareceu (abre mais rápido)
  const { createClient } = await import('@supabase/supabase-js');
  sb = createClient(URL, CHAVE, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });
  sb.auth.onAuthStateChange((ev, sessao) => {
    const antes = usuario?.id;
    usuario = sessao?.user ?? null;
    if (!usuario) { mudar('fora'); return; }
    if (usuario.id !== antes || ev === 'SIGNED_IN') void sincronizar();
  });
  const { data } = await sb.auth.getSession().catch(() => ({ data: { session: null } }));
  usuario = data.session?.user ?? null;
  if (usuario) await sincronizar(); else mudar('fora');
  // tira o código do login do endereço depois de entrar
  if (/[?&#](code|access_token)=/.test(location.href)) history.replaceState(null, '', location.pathname);
}

const voltarPara = () => location.origin + location.pathname;

export async function entrarGoogle(): Promise<void> {
  if (!sb) return;
  mudar('entrando');
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: voltarPara() } });
  if (error) mudar('erro');
}

/** Manda um link de entrada para o e-mail. Devolve true se enviou. */
export async function entrarEmail(email: string): Promise<boolean> {
  if (!sb) return false;
  mudar('entrando');
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: voltarPara() } });
  mudar(error ? 'erro' : 'fora');
  return !error;
}

export async function sair(): Promise<void> {
  if (!sb) return;
  clearTimeout(timer);
  if (sincronizado) await enviar();
  await sb.auth.signOut();
  usuario = null;
  sincronizado = false;
  mudar('fora');
}
