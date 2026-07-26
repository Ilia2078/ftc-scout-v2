import { loadMatches, loadTeams, submitData, getTeamStats } from './api.js';
import { saveDraft, loadDraft, clearDraft, saveStation, loadStation, saveTheme, loadTheme } from './storage.js';
import { addToQueue, processQueue } from './queue.js';
import { startSync } from './sync.js';
import { renderTeamDropdown, updateUI } from './ui.js';
import { initSearch } from './search.js';
import { initSettings } from './settings.js';

let currentMatch = '';
let currentAlliance = 'Red1';
let selectedTeam = '';

document.addEventListener('DOMContentLoaded', async () => {
  // Загрузка сохранённых настроек
  const theme = loadTheme();
  document.body.classList.toggle('light', theme === 'light');
  currentAlliance = loadStation() || 'Red1';
  document.querySelectorAll('.alliance-buttons button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.alliance === currentAlliance);
  });

  // Загрузка матчей и команд
  const matches = await loadMatches();
  const teams = await loadTeams();
  renderMatchSelect(matches);
  renderTeamDropdown(teams);

  // Восстановление черновика
  const draft = loadDraft();
  if (draft && draft.team) {
    if (confirm('Восстановить предыдущие данные?')) {
      document.getElementById('matchSelect').value = draft.match;
      document.getElementById('teamInput').value = draft.team;
      document.getElementById('autoArtifacts').innerText = draft.autoArtifacts;
      document.getElementById('autoHits').innerText = draft.autoHits;
      document.getElementById('teleArtifacts').innerText = draft.teleArtifacts;
      document.getElementById('teleHits').innerText = draft.teleHits;
      document.getElementById('parking').checked = draft.parking;
      document.getElementById('pattern').checked = draft.pattern;
      document.getElementById('artifactsRP').checked = draft.artifactsRP;
      document.getElementById('win').checked = draft.win;
      selectedTeam = draft.team;
    }
  }

  // Автосохранение каждые 2 сек
  setInterval(autoSave, 2000);

  // Обработчики событий
  document.querySelectorAll('.counter-row button').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const delta = parseInt(btn.dataset.delta);
      changeCounter(id, delta);
    });
  });

  document.querySelectorAll('.alliance-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.alliance-buttons button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAlliance = btn.dataset.alliance;
      saveStation(currentAlliance);
    });
  });

  document.getElementById('sendBtn').addEventListener('click', sendData);

  // Поиск команды
  initSearch(teams);

  // Настройки
  initSettings();

  // Запуск синхронизации
  startSync();
});

function renderMatchSelect(matches) {
  const sel = document.getElementById('matchSelect');
  sel.innerHTML = matches.map(m => `<option value="${m}">${m}</option>`).join('');
}

function changeCounter(id, delta) {
  const el = document.getElementById(id);
  let val = parseInt(el.innerText) + delta;
  if (val < 0) val = 0;
  el.innerText = val;

  // Логика пар (Hits не может быть больше Samples)
  const pairMap = {
    autoHits: 'autoArtifacts',
    teleHits: 'teleArtifacts'
  };
  if (pairMap[id]) {
    const pairEl = document.getElementById(pairMap[id]);
    if (parseInt(el.innerText) > parseInt(pairEl.innerText)) {
      pairEl.innerText = el.innerText;
    }
  }
}

function autoSave() {
  const data = {
    match: document.getElementById('matchSelect').value,
    alliance: currentAlliance,
    team: document.getElementById('teamInput').value,
    autoArtifacts: document.getElementById('autoArtifacts').innerText,
    autoHits: document.getElementById('autoHits').innerText,
    teleArtifacts: document.getElementById('teleArtifacts').innerText,
    teleHits: document.getElementById('teleHits').innerText,
    parking: document.getElementById('parking').checked,
    pattern: document.getElementById('pattern').checked,
    artifactsRP: document.getElementById('artifactsRP').checked,
    win: document.getElementById('win').checked
  };
  saveDraft(data);
}

async function sendData() {
  const team = document.getElementById('teamInput').value.trim();
  if (!team) { alert('Выберите команду'); return; }
  const match = document.getElementById('matchSelect').value;
  if (!match) { alert('Выберите матч'); return; }

  const data = {
    match,
    alliance: currentAlliance,
    team,
    autoArtifacts: parseInt(document.getElementById('autoArtifacts').innerText),
    autoHits: parseInt(document.getElementById('autoHits').innerText),
    teleArtifacts: parseInt(document.getElementById('teleArtifacts').innerText),
    teleHits: parseInt(document.getElementById('teleHits').innerText),
    parking: document.getElementById('parking').checked,
    pattern: document.getElementById('pattern').checked,
    artifactsRP: document.getElementById('artifactsRP').checked,
    win: document.getElementById('win').checked
  };

  // Добавляем в очередь
  addToQueue({ type: 'submit', payload: data });
  // Пытаемся отправить сразу (если онлайн)
  await processQueue();

  // Сброс формы, переход на следующий матч
  resetForm();
  clearDraft();
  const sel = document.getElementById('matchSelect');
  if (sel.selectedIndex < sel.options.length - 1) {
    sel.selectedIndex++;
  }
}

function resetForm() {
  document.getElementById('teamInput').value = '';
  document.getElementById('autoArtifacts').innerText = '0';
  document.getElementById('autoHits').innerText = '0';
  document.getElementById('teleArtifacts').innerText = '0';
  document.getElementById('teleHits').innerText = '0';
  document.getElementById('parking').checked = false;
  document.getElementById('pattern').checked = false;
  document.getElementById('artifactsRP').checked = false;
  document.getElementById('win').checked = false;
}
// ... существующий код

// Переключение вкладок
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById('tab-' + tab).style.display = 'block';

    if (tab === 'admin') loadAdminPanel();
    if (tab === 'stats') loadStatsPanel();
  });
});

async function loadAdminPanel() {
  const pending = await getPending();
  const matches = await loadMatches();
  renderAdminPanel(pending, matches);
}

async function loadStatsPanel() {
  const team = document.getElementById('teamInput').value.trim();
  if (!team) { alert('Сначала выберите команду'); return; }
  const stats = await getTeamStats(team);
  renderTeamStats(stats);
}

// Экспорт
document.getElementById('exportCSV').addEventListener('click', async () => {
  const ranking = await getRanking();
  exportRankingCSV(ranking);
});
document.getElementById('exportPDF').addEventListener('click', async () => {
  const ranking = await getRanking();
  exportRankingPDF(ranking);
});