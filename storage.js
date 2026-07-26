export function saveDraft(data) {
  localStorage.setItem('scoutDraft', JSON.stringify(data));
}
export function loadDraft() {
  const raw = localStorage.getItem('scoutDraft');
  return raw ? JSON.parse(raw) : null;
}
export function clearDraft() {
  localStorage.removeItem('scoutDraft');
}
export function saveStation(station) {
  localStorage.setItem('station', station);
}
export function loadStation() {
  return localStorage.getItem('station');
}
export function saveTheme(theme) {
  localStorage.setItem('theme', theme);
}
export function loadTheme() {
  return localStorage.getItem('theme') || 'dark';
}
export function saveQueue(queue) {
  localStorage.setItem('queue', JSON.stringify(queue));
}
export function loadQueue() {
  const raw = localStorage.getItem('queue');
  return raw ? JSON.parse(raw) : [];
}