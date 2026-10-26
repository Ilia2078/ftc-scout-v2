/**
 * FTC Scout V2 - drop-in repair for the Qualifications tab.
 *
 * Add this as a NEW file to the bound Apps Script project.
 * Run ftcRepairQualifications() once from the editor to rebuild old results.
 *
 * To keep it updated after every approved submission, in submitScoutData(data),
 * replace writeToQualifications(row) with ftcRepairQualifications().
 *
 * The RawData schema is positional (A:O), even when legacy column labels are wrong:
 * B Match, C Alliance, D Team, E AutoArtifacts, F AutoHits,
 * G TeleArtifacts, H TeleHits, I Parking, J Pattern, K ArtifactsRP,
 * L Win, N Approved, O SubmissionId.
 *
 * Only derived cells B:E on Qualifications are replaced. Label column A,
 * RawData, Team, MatchLocks and Average are not altered by this function.
 */
function ftcRepairQualifications() {
  const spreadsheetId = String(PropertiesService.getScriptProperties()
    .getProperty('SPREADSHEET_ID') || '').trim();
  if (!spreadsheetId) throw new Error('Set SPREADSHEET_ID in Script properties');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const raw = ss.getSheetByName('RawData');
  const target = ss.getSheetByName('Qualifications');
  if (!raw || !target) throw new Error('Missing RawData or Qualifications sheet');

  const bool = value => value === true || String(value).toLowerCase() === 'true';
  const stations = {Red1:0, Red2:1, Blue1:2, Blue2:3};
  const lastRow = raw.getLastRow();
  const rows = lastRow > 1 ? raw.getRange(2, 1, lastRow - 1, 15).getValues() : [];
  const latest = new Map();

  for (const row of rows) {
    const match = /^Q\s*(\d+)$/i.exec(String(row[1] || '').trim());
    const station = String(row[2] || '').trim();
    if (!match || !Object.prototype.hasOwnProperty.call(stations,station) || !bool(row[13])) continue;
    const n = Number(match[1]);
    if (!Number.isSafeInteger(n) || n < 1 || n > 200) continue;
    latest.set(n + ':' + station, {n, station, row});
  }
  const highest = Math.max(0, ...Array.from(latest.values(), entry => entry.n));
  const height = Math.max(highest * 6, target.getLastRow() - 1);
  if (!height) return {published: 0, matches: 0};

  if (target.getMaxRows() < height + 1) {
    target.insertRowsAfter(target.getMaxRows(), height + 1 - target.getMaxRows());
  }
  const output = Array.from({length:height}, () => ['', '', '', '']);
  for (const {n, station, row} of latest.values()) {
    const offset = (n - 1) * 6;
    const column = stations[station];
    const points = (bool(row[8]) ? 1 : 0) + (bool(row[9]) ? 1 : 0)
      + (bool(row[10]) ? 1 : 0) + (bool(row[11]) ? 3 : 0);
    const vals = [String(row[3] || ''),Number(row[4]) || 0,Number(row[6]) || 0,
      Number(row[5]) || 0, Number(row[7]) || 0, points];
    for (let i=0; i<6; i++) output[offset+i][column] = vals[i];
  }
  target.getRange(2, 2, height, 4).setValues(output);
  SpreadsheetApp.flush();
  return {published: latest.size, matches: highest};
}
