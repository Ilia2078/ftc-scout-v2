// Подключаем Chart.js (загружаем из CDN)
// В index.html добавим <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

export function renderTeamChart(teamStats, canvasId) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  const labels = teamStats.matches.map(m => m.match);
  const autoData = teamStats.matches.map(m => m.autoArtifacts);
  const teleData = teamStats.matches.map(m => m.teleArtifacts);
  const rpData = teamStats.matches.map(m => m.totalRP);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Auto Samples', data: autoData, borderColor: '#4CAF50', tension: 0.2 },
        { label: 'TeleOp Samples', data: teleData, borderColor: '#2196F3', tension: 0.2 },
        { label: 'Total RP', data: rpData, borderColor: '#FF9800', tension: 0.2, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#EEE' } } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#444' } },
        y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } }
      }
    }
  });
}

export function renderRankingChart(ranking, canvasId) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  const labels = ranking.slice(0, 10).map(r => r.team);
  const data = ranking.slice(0, 10).map(r => r.totalRP);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: 'Total RP', data: data, backgroundColor: '#4CAF50' }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}