export function renderAdminPanel(pending, matches) {
  const container = document.getElementById('admin-content');
  let html = `<h2>📋 Pending Submissions</h2>`;
  if (!pending || pending.length === 0) {
    html += `<p>All submissions are approved.</p>`;
  } else {
    // Группировка по матчу и команде
    const groups = {};
    pending.forEach(p => {
      const key = p.match + '|' + p.team;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    for (const [key, records] of Object.entries(groups)) {
      const [match, team] = key.split('|');
      html += `<div class="pending-group"><h3>${match} – Team ${team}</h3>`;
      records.forEach(r => {
        html += `<div class="pending-item">
          <span>${r.user}</span>
          <span>Auto: ${r.autoArtifacts}/${r.autoHits}</span>
          <span>Tele: ${r.teleArtifacts}/${r.teleHits}</span>
          <span>RP: ${r.parking+','+r.pattern+','+r.artifactsRP+','+r.win}</span>
          <button data-match="${r.match}" data-team="${r.team}" data-scout="${r.user}" class="approve-btn">✅ Approve</button>
        </div>`;
      });
      html += `</div>`;
    }
  }
  container.innerHTML = html;

  // Обработчики кнопок Approve
  container.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const match = btn.dataset.match;
      const team = btn.dataset.team;
      const scout = btn.dataset.scout;
      if (confirm(`Approve scout ${scout} for ${match} – Team ${team}?`)) {
        await approveSubmission(match, team, scout);
        // Обновить список
        const updated = await getPending();
        renderAdminPanel(updated);
      }
    });
  });
}

export function renderTeamStats(stats) {
  const container = document.getElementById('stats-content');
  container.innerHTML = `
    <h3>Team ${stats.team}</h3>
    <p>Matches: ${stats.qCount}</p>
    <p>Average RP: ${stats.avg}</p>
    <p>Median RP: ${stats.median}</p>
    <p>Consistency: ${stats.consistency}%</p>
    <p>Best match: ${stats.best.match} (${stats.best.totalRP} RP)</p>
    <p>Worst match: ${stats.worst.match} (${stats.worst.totalRP} RP)</p>
    <canvas id="teamChart" width="400" height="200"></canvas>
  `;
  renderTeamChart(stats, 'teamChart');
}