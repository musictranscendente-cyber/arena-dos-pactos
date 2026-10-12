// Estatísticas anônimas do jogo (sem nome nem e-mail): só um código aleatório do aparelho.
// Anota quando o jogo é aberto e quando uma partida termina, numa tabela do Supabase ("eventos").
// Sem as chaves do Supabase, ou jogando no próprio computador (localhost), não anota nada.
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const CHAVE_APARELHO = 'arena-dos-pactos:aparelho';

const ligado = () => !!URL && !!CHAVE && typeof location !== 'undefined' && !/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);

function aparelho(): string {
  try {
    let id = localStorage.getItem(CHAVE_APARELHO);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(CHAVE_APARELHO, id); }
    return id;
  } catch { return 'sem-armazenamento'; }
}

/** De onde o jogo foi aberto: app instalado, navegador no celular ou no computador. */
function plataforma(): string {
  const app = matchMedia?.('(display-mode: fullscreen), (display-mode: standalone)').matches;
  const cel = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  return app ? 'app' : cel ? 'celular' : 'computador';
}

export function anotar(tipo: 'abriu' | 'partida', dados: Record<string, unknown> = {}): void {
  if (!ligado()) return;
  try {
    void fetch(`${URL}/rest/v1/eventos`, {
      method: 'POST', keepalive: true,
      headers: { apikey: CHAVE!, Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ aparelho: aparelho(), tipo, dados: { ...dados, plataforma: plataforma() } }),
    }).catch(() => { /* sem internet: deixa para lá */ });
  } catch { /* ignora */ }
}
