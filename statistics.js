/**
 * statistics.js
 * Модуль для работы со статистикой команд FTC.
 * Включает расчёт ключевых показателей, рендеринг карточки команды и построение графиков.
 * Зависит от Chart.js (подключается отдельно).
 */

// ========== Основные расчёты ==========

/**
 * Вычисляет статистику по массиву матчей команды.
 * @param {Array} matches - массив объектов матчей с полями:
 *   match, autoArtifacts, teleArtifacts, totalRP, (другие поля опционально)
 * @param {string} team - номер команды (опционально)
 * @returns {Object|null} - объект со статистикой или null, если данных нет.
 */
export function calculateTeamStats(matches, team = '') {
  if (!matches || matches.length === 0) {
    return null;
  }

  // Извлекаем значения Total RP
  const rpValues = matches.map(m => m.totalRP || 0);
  const totalRP = rpValues.reduce((a, b) => a + b, 0);
  const avg = totalRP / rpValues.length;

  // Медиана
  const sorted = [...rpValues].sort((a, b) => a - b);
  let median;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    median = (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    median = sorted[mid];
  }

  // Стандартное отклонение и консистентность (коэффициент вариации)
  const variance = rpValues.reduce((s, v) => s + (v - avg) ** 2, 0) / rpValues.length;
  const stdDev = Math.sqrt(variance);
  // Чем выше consistency (0-100%), тем стабильнее команда
  const consistency = avg > 0 ? Math.max(0, (1 - stdDev / avg) * 100) : 0;

  // Лучший и худший матчи
  const best = matches.reduce((a, b) => (a.totalRP || 0) > (b.totalRP || 0) ? a : b);
  const worst = matches.reduce((a, b) => (a.totalRP || 0) < (b.totalRP || 0) ? a : b);

  return {
    team: team,
    avg: Math.round(avg * 100) / 100,
    median: Math.round(median * 100) / 100,
    consistency: Math.round(consistency * 100) / 100,
    best: best,
    worst: worst,
    qCount: matches.length,
    matches: matches
  };
}

// ========== Рендеринг статистики ==========

/**
 * Отрисовывает карточку статистики команды в указанном контейнере.
 * @param {Object} stats - объект, возвращённый calculateTeamStats()
 * @param {string} containerId - id HTML-элемента, куда вставить статистику.
 */
export function renderStats(stats, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!stats || !stats.matches || stats.matches.length === 0) {
    container.innerHTML = `<p style="color: #999;">Нет данных для команды ${stats?.team || ''}.</p>`;
    return;
  }

  // Формируем HTML-разметку
  let html = `
    <h3>Команда ${stats.team}</h3>
    <div class="stat-grid">
      <div>Матчей <div class="value">${stats.qCount}</div></div>
      <div>Средний RP <div class="value">${stats.avg}</div></div>
      <div>Медиана RP <div class="value">${stats.median}</div></div>
      <div>Стабильность <div class="value">${stats.consistency}%</div></div>
      <div>Лучший матч <div class="value">${stats.best.match} (${stats.best.totalRP})</div></div>
      <div>Худший матч <div class="value">${stats.worst.match} (${stats.worst.totalRP})</div></div>
    </div>
    <canvas id="teamChart" width="400" height="200"></canvas>
  `;
  container.innerHTML = html;

  // Если библиотека Chart.js загружена, строим график
  if (typeof Chart !== 'undefined') {
    renderTeamChart(stats, 'teamChart');
  } else {
    console.warn('Chart.js не загружен. Для графиков подключите библиотеку.');
  }
}

// ========== Визуализация (графики) ==========

/**
 * Строит линейный график показателей команды по матчам.
 * @param {Object} stats - объект статистики.
 * @param {string} canvasId - id canvas-элемента.
 */
export function renderTeamChart(stats, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Уничтожаем предыдущий график, если он есть
  if (window._teamChart) {
    window._teamChart.destroy();
  }

  // Подготавливаем данные
  const labels = stats.matches.map(m => m.match);
  const autoData = stats.matches.map(m => m.autoArtifacts || 0);
  const teleData = stats.matches.map(m => m.teleArtifacts || 0);
  const rpData = stats.matches.map(m => m.totalRP || 0);

  // Определяем цвета в зависимости от темы (светлая/тёмная)
  const isDark = document.body.classList.contains('dark') !== false;
  const textColor = isDark ? '#EEE' : '#222';
  const gridColor = isDark ? '#444' : '#DDD';

  window._teamChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Auto Samples',
          data: autoData,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76,175,80,0.1)',
          tension: 0.2,
          fill: true,
        },
        {
          label: 'TeleOp Samples',
          data: teleData,
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33,150,243,0.1)',
          tension: 0.2,
          fill: true,
        },
        {
          label: 'Total RP',
          data: rpData,
          borderColor: '#FF9800',
          backgroundColor: 'rgba(255,152,0,0.1)',
          tension: 0.2,
          yAxisID: 'y1',
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: textColor }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: textColor }
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { color: textColor }
        },
        x: {
          ticks: { color: textColor }
        }
      }
    }
  });
}

// ========== Дополнительные утилиты ==========

/**
 * Генерирует HTML для отображения рейтинга команд (таблица).
 * @param {Array} ranking - массив объектов { team, totalRP, qCount }
 * @param {string} containerId - id контейнера.
 */
export function renderRanking(ranking, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!ranking || ranking.length === 0) {
    container.innerHTML = '<p>Рейтинг пуст.</p>';
    return;
  }

  let html = `
    <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="background: var(--accent); color: #fff;">
          <th style="padding: 8px;">#</th>
          <th style="padding: 8px;">Команда</th>
          <th style="padding: 8px;">Total RP</th>
          <th style="padding: 8px;">Q</th>
        </tr>
      </thead>
      <tbody>
  `;

  ranking.forEach((r, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
    html += `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 8px; text-align: center;">${medal || idx+1}</td>
        <td style="padding: 8px;">${r.team}</td>
        <td style="padding: 8px;">${r.totalRP.toFixed(2)}</td>
        <td style="padding: 8px;">${r.qCount}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

// ========== Экспорт по умолчанию ==========
export default {
  calculateTeamStats,
  renderStats,
  renderTeamChart,
  renderRanking
};