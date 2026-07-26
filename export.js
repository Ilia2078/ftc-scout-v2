import { getRanking } from './api.js';

// Простой экспорт CSV
export function exportRankingCSV(ranking) {
  const header = 'Team,Total RP,Q Count\n';
  const rows = ranking.map(r => `${r.team},${r.totalRP},${r.qCount}`).join('\n');
  const csv = header + rows;
  downloadFile(csv, 'ranking.csv', 'text/csv');
}

// Экспорт PDF с использованием jsPDF и autoTable
export async function exportRankingPDF(ranking) {
  // Загружаем библиотеки динамически (или используем CDN)
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('FTC Ranking', 14, 16);
  const tableData = ranking.map(r => [r.team, r.totalRP.toFixed(2), r.qCount]);
  doc.autoTable({
    head: [['Team', 'Total RP', 'Q Count']],
    body: tableData,
    startY: 20,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [76, 175, 80] }
  });
  doc.save('ranking.pdf');
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}