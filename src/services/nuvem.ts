// Conta e progresso na nuvem (Supabase). Sem as chaves configuradas, o jogo segue só no aparelho.
// Guarda numa linha por jogador: progresso, decks e perfil (o mesmo que fica no localStorage).
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Chaves do aparelho que vão para a nuvem. */
const CHAVES = { progresso: 'arena-dos-pactos:progresso', decks: 'arena-dos-pactos:decks', perfil: 'arena-dos-pactos:perfil' } as const;
const SALVO_EM = 'arena-dos-pactos:salvoEm';
const ESPERA_MS = 2500;

export type Situacao = 'desligada' | 'fora' | 'entrando' | 'salvando' | 'salvo' | 'erro';

let sb: SupabaseClient | null = null;
let usuario: User | null = null;
let situacao: Situacao = URL && CHAVE ? 'fora' : 'desligada';
let timer = 0;
let avisar: () => void = () => {};
let aplicar: () => void = () => {};

export const nuvemAtiva = () => situacao !== 'desligada';
export const situacaoNuvem = () => situacao;
export const emailConta = () => usuario?.email ?? null;
export const logado = () => !!usuario;

function mudar(s: Situacao): void { situacao = s; avisar(); }

const ler = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };

/** Chamado sempre que o jogo salva algo no aparelho: marca a hora e agenda o envio. */
export function marcarMudanca(): void {
  gravar(SALVO_EM, new Date().toISOString());
  if (!sb || !usuario) return;
  clearTimeout(timer);
  timer = window.setTimeout(() => { void enviar(); }, ESPERA_MS);
}

function pacoteLocal(): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  for (const [nome, k] of Object.entries(CHAVES)) { const v = ler(k); if (v) { try { d[nome] = JSON.parse(v); } catch { /* ignora */ } } }
  return d;
}

async function enviar(): Promise<void> {
  if (!sb || !usuario) return;
  mudar('salvando');
  const atualizado = ler(SALVO_EM) ?? new Date().toISOString();
  const { error } = await sb.from('jogadores').upsert({ id: usuario.id, dados: pacoteLocal(), atualizado });
  mudar(error ? 'erro' : 'salvo');
}

/** Ao entrar: o mais recente vence (nuvem ou aparelho). */
async function sincronizar(): Promise<void> {
  if (!sb || !usuario) return;
  mudar('salvando');
  const { data, error } = await sb.from('jogadores').select('dados, atualizado').eq('id', usuario.id).maybeSingle();
  if (error) { mudar('erro'); return; }
  const local = ler(SALVO_EM);
  if (data && (!local || new Date(data.atualizado) > new Date(local))) {
    const d = (data.dados ?? {}) as Record<string, unknown>;
    for (const [nome, k] of Object.entries(CHAVES)) if (d[nome] !== undefined) gravar(k, JSON.stringify(d[nome]));
    gravar(SALVO_EM, data.atualizado);
    aplicar();
    mudar('salvo');
  } else await enviar();
}

/** Liga a nuvem: lembra a sessão, e avisa a tela quando algo muda. `recarregar` relê o progresso do aparelho. */
export async function iniciarNuvem(onMudou: () => void, recarregar: () => void): Promise<void> {
  avisar = onMudou; aplicar = recarregar;
  if (!URL || !CHAVE) return;
  sb = createClient(URL, CHAVE, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });
  sb.auth.onAuthStateChange((ev, sessao) => {
    const antes = usuario?.id;
    usuario = sessao?.user ?? null;
    if (!usuario) { mudar('fora'); return; }
    if (usuario.id !== antes || ev === 'SIGNED_IN') void sincronizar();
  });
  const { data } = await sb.auth.getSession();
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
  await enviar();
  await sb.auth.signOut();
  usuario = null;
  mudar('fora');
}
