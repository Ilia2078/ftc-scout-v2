const API_BASE = 'https://script.google.com/macros/s/ВАШ_АЙДИ/exec';

async function callApi(action, params = {}) {
  const url = new URL(API_BASE);
  url.searchParams.append('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
export async function loadMatches() {
  const res = await callApi('getMatches');
  return res.matches || [];
}

export async function loadTeams() {
  const res = await callApi('getTeams');
  return res.teams || [];
}

export async function submitData(data) {
  const res = await callApi('submit', data);
  return res;
}

export async function getTeamStats(team) {
  const res = await callApi('getStats', { team });
  return res;
}
// ... существующие методы

export async function getTeamStats(team) {
  const res = await callApi('getStats', { team });
  return res;
}

export async function getRanking() {
  const res = await callApi('getRanking');
  return res.ranking || [];
}

export async function getPending() {
  const res = await callApi('getPending');
  return res.pending || [];
}

export async function approveSubmission(match, team, scout) {
  const res = await callApi('approve', { match, team, scout });
  return res;
}
// ... другие функции (approve, lock, etc.)
