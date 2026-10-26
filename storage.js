/** Durable IndexedDB queue, with localStorage fallback for restrictive Safari.
 * Data is never silently discarded if storage is unavailable. */
const DB_NAME = 'ftc-scout-v2';
const DB_VERSION = 1;
const STORE = 'submissions';
const FALLBACK_KEY = 'ftc_v2_pending';
const CACHE_PREFIX = 'ftc_v2_cache_';
let dbPromise;
let fallback = false;
function openDb() {
  if (fallback || !('indexedDB' in window)) return Promise.reject(new Error('IndexedDB недоступна'));
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, {keyPath:'submissionId'}); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || Error('IndexedDB error'));
    request.onblocked = () => reject(Error('IndexedDB blocked'));
  }).catch(err => { fallback = true; dbPromise = null; throw err; });
  return dbPromise;
}
async function transaction(mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let value;
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error || Error('Transaction error'));
    tx.onabort = () => reject(tx.error || Error('Transaction aborted'));
    const request = callback(store);
    if (request) request.onsuccess = () => { value = request.result; };
  });
}
function readFallback() {
  const raw = localStorage.getItem(FALLBACK_KEY);
  const value = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(value)) throw Error('Очередь повреждена');
  return value;
}
function putFallback(items) { localStorage.setItem(FALLBACK_KEY, JSON.stringify(items)); }
export async function pending() {
  try { return await transaction('readonly', store => store.getAll()); }
  catch(e) { return readFallback(); }
}
export async function putPending(item) {
  if (!item || !item.submissionId) throw new Error('Missing submissionId');
  try { await transaction('readwrite', store => store.put(item)); }
  catch(e) { const q=readFallback(); const i=q.findIndex(x=>x.submissionId===item.submissionId); if(i>=0)q[i]=item; else q.push(item); putFallback(q); }
}
export async function deletePending(id) {
  try { await transaction('readwrite', store => store.delete(id)); }
  catch(e) { putFallback(readFallback().filter(x=>x.submissionId!==id)); }
}
export function getCache(key, fallbackValue=[]) {
  try { const v=JSON.parse(localStorage.getItem(CACHE_PREFIX+key)); return v ?? fallbackValue; }
  catch(e) { return fallbackValue; }
}
export function setCache(key, value) {
  try { localStorage.setItem(CACHE_PREFIX+key,JSON.stringify(value)); } catch(e) { console.warn('Cache not writable',e); }
}
export function getSetting(key, value='') { try{return localStorage.getItem('ftc_v2_'+key)??value;}catch(e){return value;} }
export function setSetting(key,value) { try{localStorage.setItem('ftc_v2_'+key,String(value));return true;}catch(e){return false;} }
export function createId() {
  if (window.crypto && crypto.randomUUID) return 's_'+crypto.randomUUID().replaceAll('-','');
  const bytes=new Uint8Array(18);
  if (!window.crypto || !crypto.getRandomValues) throw Error('Небезопасный контекст: не удаётся создать ID');
  crypto.getRandomValues(bytes);
  return 's_'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
