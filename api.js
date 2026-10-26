import { API_URL, REQUIRED_API_VERSION } from './config.js';
let serial = 0;

/** Apps Script ContentService does not offer standard CORS for GitHub Pages.
 * JSONP intentionally used ONLY for public, validated read/submit actions.
 * Never send passwords, access tokens or private data through this transport.
 */
export function callApi(action, params = {}, { timeoutMs = 18000 } = {}) {
  if (!['ping','getMatches','getTeams','getRanking','getStats','submit'].includes(action)) {
    return Promise.reject(new Error('API action not allowed: ' + action));
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(API_URL)) {
    return Promise.reject(new Error('Настройте корректный URL развёртывания Apps Script в config.js'));
  }
  return new Promise((resolve, reject) => {
    const callback = `__ftc_jsonp_${Date.now()}_${++serial}`;
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('callback', callback);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    let complete = false;
    const script = document.createElement('script');
    script.async = true;
    let timer;
    const finish = (error, result) => {
      if (complete) return;
      complete = true;
      clearTimeout(timer);
      script.remove();
      delete window[callback];
      if (error) reject(error); else resolve(result);
    };
    window[callback] = result => {
      if (!result || typeof result !== 'object') return finish(new Error('Некорректный ответ сервера'));
      if (result.success === false) return finish(new Error(String(result.error || 'Ошибка сервера')));
      finish(null, result);
    };
    script.onerror = () => finish(new Error('Нет доступа к Apps Script / неверный адрес публикации'));
    timer = setTimeout(() => finish(new Error('Нет подтверждения сервера (тайм-аут)')), timeoutMs);
    script.src = url.toString();
    document.head.append(script);
  });
}
export async function verifyApi() {
  const r = await callApi('ping', {}, {timeoutMs:12000});
  if (Number(r.apiVersion) !== REQUIRED_API_VERSION) throw new Error('Сервер Apps Script устарел. Обновите развёртывание до API v2.');
  return r;
}
export async function fetchTeams() { const r=await callApi('getTeams'); return Array.isArray(r.teams) ? r.teams.map(String) : []; }
export async function fetchMatches() { const r=await callApi('getMatches'); return Array.isArray(r.matches) ? r.matches.map(String) : []; }
export async function fetchRanking() { const r=await callApi('getRanking'); return Array.isArray(r.ranking) ? r.ranking : []; }
export async function fetchStats(team) { const r=await callApi('getStats',{team}); return r.stats || {}; }
export async function submitData(payload) {
  if (!payload.submissionId) throw new Error('Нет идентификатора отправки');
  const r = await callApi('submit', payload);
  if (r.success !== true || r.stored !== true || r.submissionId !== payload.submissionId) {
    throw new Error('Сервер не подтвердил сохранение. Данные остаются в очереди.');
  }
  return r;
}
