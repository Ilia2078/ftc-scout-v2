/**
 * FTC Scout V2 — repair Average independently from Qualifications.
 *
 * Installation:
 * 1. Add this file to the Apps Script project bound to the spreadsheet.
 * 2. Set SPREADSHEET_ID in Script properties.
 * 3. Run ftcRepairAverage() manually once to rebuild historic data.
 * 4. Call ftcRepairAverage() after every approved submission and approval.
 *
 * This function uses the existing RawData positional schema (A:O), not
 * legacy header text. It never edits RawData, Team or Qualifications.
 * The first two Average rows and all cell formatting are preserved.
 */
function ftcRepairAverage() {
  const id = String(PropertiesService.getScriptProperties()
    .getProperty('SPREADSHEET_ID') || '').trim();
  if (!id) throw new Error('SPREADSHEET_ID is not configured');
  const ss = SpreadsheetApp.openById(id);
  const raw = ss.getSheetByName('RawData');
  const average = ss.getSheetByName('Average');
  const teamsSheet = ss.getSheetByName('Team');
  if (!raw || !average || !teamsSheet) {
    throw new Error('Required sheets: RawData, Average, Team');
  }

  const yes = value => value === true || String(value).toLowerCase() === 'true';
  const number = value => Number(value) || 0;
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const data = raw.getLastRow() > 1
    ? raw.getRange(2, 1, raw.getLastRow() - 1, 15).getValues()
    : [];

  // Preserve existing Average team order and retain every team from Team
  // (plus teams with approved observations, including legacy entries).
  const teamIds = [];
  const seen = new Set();
  function addTeam(value) {
    const t = String(value === null || value === undefined ? '' : value).trim();
    if (t && !seen.has(t)) { teamIds.push(t); seen.add(t); }
  }
  const existingCount = Math.max(0, average.getLastRow() - 2);
  if (existingCount) {
    average.getRange(3, 1, existingCount, 1)
      .getValues().forEach(row => addTeam(row[0]));
  }
  if (teamsSheet.getLastRow()) {
    teamsSheet.getRange(1, 1, teamsSheet.getLastRow(), 1)
      .getValues().forEach(row => addTeam(row[0]));
  }

  const stats = new Map();
  for (const row of data) {
    if (!yes(row[13])) continue; // N = Approved
    const team = String(row[3] === undefined || row[3] === null ? '' : row[3]).trim();
    if (!team) continue;
    addTeam(team);
    let s = stats.get(team);
    if (!s) {
      s = {q:0,auto:0,autoHits:0,tele:0,teleHits:0,
           parking:0,pattern:0,artifactsRP:0,win:0};
      stats.set(team, s);
    }
    s.q++;
    s.auto += number(row[4]);       // E = AutoArtifacts
    s.autoHits += number(row[5]);   // F = AutoHits
    s.tele += number(row[6]);       // G = TeleArtifacts
    s.teleHits += number(row[7]);   // H = TeleHits
    s.parking += yes(row[8]) ? 1 : 0;
    s.pattern += yes(row[9]) ? 1 : 0;
    s.artifactsRP += yes(row[10]) ? 1 : 0;
    s.win += yes(row[11]) ? 1 : 0;
  }

  const rows = teamIds.map(team => {
    const s = stats.get(team);
    if (!s) return [team,'','','','','','','','',0];
    return [
      team,
      round(s.auto/s.q),
      round(s.tele/s.q),
      s.auto ? round(100*s.autoHits/s.auto) : 0,
      s.tele ? round(100*s.teleHits/s.tele) : 0,
      round(s.parking/s.q),
      round(s.pattern/s.q),
      round(s.artifactsRP/s.q),
      round((s.parking+s.pattern+s.artifactsRP+3*s.win)/s.q),
      s.q
    ];
  });

  const height = Math.max(existingCount, rows.length);
  if (!height) return {teams:0, approvedRecords:0};
  if (average.getMaxRows() < height + 2) {
    average.insertRowsAfter(average.getMaxRows(), height + 2 - average.getMaxRows());
  }
  while (rows.length < height) rows.push(['','','','','','','','','','']);
  // Changes only Average!A3:J, preserving the labels, blank row 2,
  // all sheet formatting, and every other sheet.
  average.getRange(3, 1, height, 10).setValues(rows);
  SpreadsheetApp.flush();
  let approvedRecords = 0;
  stats.forEach(s => { approvedRecords += s.q; });
  return {teams:teamIds.length, approvedRecords:approvedRecords};
}
