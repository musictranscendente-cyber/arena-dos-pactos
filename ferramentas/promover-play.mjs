// Promove a versão do teste interno da Play Store para produção (usado pelo workflow promover.yml).
// Precisa do segredo PLAY_CONTA_SERVICO (JSON da conta de serviço). Notas da versão: android/notas-da-versao/.
import { readdirSync, readFileSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';

const PACOTE = 'com.cosmiccitadel.game';
const NOTAS = 'android/notas-da-versao';
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACOTE}/edits`;

const auth = new GoogleAuth({
  credentials: JSON.parse(process.env.PLAY_CONTA_SERVICO ?? '{}'),
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});
const cliente = await auth.getClient();
const pedir = async (url, method = 'GET', data) => (await cliente.request({ url, method, data })).data;

const edicao = await pedir(API, 'POST');
const interno = await pedir(`${API}/${edicao.id}/tracks/internal`);
const versao = (interno.releases ?? []).find(r => r.status === 'completed');
if (!versao) throw new Error('Nenhuma versão concluída no teste interno para promover.');

const releaseNotes = readdirSync(NOTAS).filter(f => f.startsWith('whatsnew-'))
  .map(f => ({ language: f.slice('whatsnew-'.length), text: readFileSync(`${NOTAS}/${f}`, 'utf8').trim() }));

await pedir(`${API}/${edicao.id}/tracks/production`, 'PUT', {
  track: 'production',
  releases: [{ versionCodes: versao.versionCodes, status: 'completed', releaseNotes }],
});
let manual = false;
try {
  await pedir(`${API}/${edicao.id}:commit`, 'POST');
} catch (e) {
  // apps com "publicação gerenciada" pedem para mandar à revisão de forma explícita
  if (!String(e?.response?.data?.error?.message ?? e).includes('changesNotSentForReview')) throw e;
  await pedir(`${API}/${edicao.id}:commit?changesNotSentForReview=true`, 'POST');
  manual = true;
}
console.log(manual
  ? `Versão ${versao.versionCodes.join(', ')} preparada em produção: falta clicar em "Enviar para revisão" no Play Console.`
  : `Versão ${versao.versionCodes.join(', ')} enviada para produção (aguardando a revisão do Google).`);
