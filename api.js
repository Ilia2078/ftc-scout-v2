// FTC Scout V2 — GitHub Pages API client
// This file is intentionally standalone and has no duplicate getTeamStats export.

const API_BASE =
  'https://script.google.com/macros/s/AKfycbzOFykTPJ_pUFL0dSaMt5PjXPwmamjhf9TytwdgjpAPefIRwv19RKbAz4L1_KlI5M30/exec';

async function callApi(action, params = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set('action', action);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const result = await response.json();

  if (result && result.success === false) {
    throw new Error(result.error || 'API request failed');
  }

  return result;
}

export async function loadMatches() {
  const res = await callApi('getMatches');
  return Array.isArray(res.matches) ? res.matches : [];
}

export async function loadTeams() {
  const res = await callApi('getTeams');
  return Array.isArray(res.teams) ? res.teams : [];
}

export async function submitData(data) {
  return callApi('submit', data);
}

export async function getTeamStats(team) {
  return callApi('getStats', { team });
}

export async function getRanking() {
  const res = await callApi('getRanking');
  return Array.isArray(res.ranking) ? res.ranking : [];
}

export async function getPending() {
  const res = await callApi('getPending');
  return Array.isArray(res.pending) ? res.pending : [];
}

export async function approveSubmission(match, team, scout) {
  return callApi('approve', { match, team, scout });
}

export async function generateMatches(count) {
  return callApi('generateMatches', { count });
}

export async function lockMatch(match) {
  return callApi('lockMatch', { match });
}

export async function unlockMatch(match) {
  return callApi('unlockMatch', { match });
}

export async function syncTeams() {
  return callApi('syncTeams');
}

export async function forceUpdate() {
  return callApi('forceUpdate');
}

export async function clearAllData() {
  return callApi('clearAll');
}

export async function checkAdmin() {
  const res = await callApi('isAdmin');
  return res.admin === true;
}
