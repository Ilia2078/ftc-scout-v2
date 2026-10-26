import { verifyApi,fetchTeams,fetchMatches,fetchRanking,fetchStats } from './api.js';
import { getCache,setCache,getSetting,setSetting,createId,putPending,pending } from './storage.js';
import { queueSubmission,getQueue,syncQueue,removeQueued } from './queue.js';
import { adjustCounters } from './counter-rules.js';
const $=id=>document.getElementById(id);
const fields=['autoArtifacts','autoHits','teleArtifacts','teleHits'];
const flags=['parking','pattern','artifactsRP','win'];
let teams=[],matches=[],station=getSetting('station','Red1'),ranking=[];
let connected=false;
let lastSync=0;
function note(message, kind='') {
 const el=$('notice');el.textContent=message;el.className='visible '+kind;
}
function connection(message, ok=false) { $('connection').textContent=message;$('connection').className='pill '+(ok?'ok':'bad');connected=ok; }
function selectTab(name){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+name));if(name==='queue')renderQueue();if(name==='stats')renderRanking();}
function populate(select,values,prior){select.replaceChildren();for(const value of values){const opt=document.createElement('option');opt.value=opt.textContent=String(value);select.append(opt);}if(values.includes(prior))select.value=prior;}
function refreshLists(){
 populate($('matchSelect'),matches,$('matchSelect').value||getSetting('match','Q1'));
 $('teamOptions').replaceChildren();for(const team of teams){const option=document.createElement('option');option.value=team;$('teamOptions').append(option);}
}
function getDraft(){const d={match:$('matchSelect').value,alliance:station,team:$('teamInput').value.trim()};for(const f of fields)d[f]=Number($(f).textContent)||0;for(const f of flags)d[f]=$(f).checked;return d;}
function saveDraft(){setCache('draft',getDraft());}
function restoreDraft(){let d=getCache('draft',null);if(!d){try{d=JSON.parse(localStorage.getItem('scoutDraft')||'null')}catch(e){}}if(!d)return;
 if(d.match && !matches.includes(d.match))matches.push(String(d.match));refreshLists();
 if(d.match)$('matchSelect').value=d.match;
 if(d.team)$('teamInput').value=String(d.team);
 if(d.alliance && ['Red1','Red2','Blue1','Blue2'].includes(d.alliance))station=d.alliance;
 for(const f of fields)$(f).textContent=String(Math.max(0,Math.min(1000,Number(d[f])||0)));for(const phase of ['auto','tele']){const art=$(phase+'Artifacts'),hits=$(phase+'Hits');art.textContent=String(Math.max(Number(art.textContent)||0,Number(hits.textContent)||0));}for(const f of flags)$(f).checked=d[f]===true||d[f]==='true';setStation(station);
}
function setStation(s){station=s;setSetting('station',s);document.querySelectorAll('[data-station]').forEach(b=>b.classList.toggle('active',b.dataset.station===s));saveDraft();}
function clearCounters(){for(const f of fields)$(f).textContent='0';for(const f of flags)$(f).checked=false;$('teamInput').value='';saveDraft();}
function validate(d){if(!/^Q\d{1,3}$/i.test(d.match))throw Error('Выберите матч');if(!/^\d{1,8}$/.test(d.team))throw Error('Введите корректный номер команды');if(teams.length && !teams.includes(d.team))throw Error('Команды нет в списке Team');if(d.autoHits>d.autoArtifacts || d.teleHits>d.teleArtifacts)throw Error('Попаданий больше артефактов');if(d.autoArtifacts>1000||d.teleArtifacts>1000)throw Error('Слишком большое значение');}
async function updateQueueBadge(){try{const rows=await getQueue();$('queueBadge').textContent=rows.length;}catch(e){note('Хранилище недоступно: '+e.message,'danger');}}
async function renderQueue(){const root=$('queueList');root.replaceChildren();let rows;try{rows=await getQueue();}catch(e){root.textContent='Не удалось прочитать очередь: '+e.message;return;}$('queueBadge').textContent=rows.length;
 if(!rows.length){root.textContent='Все записи отправлены и подтверждены.';return;}
 for(const item of rows.sort((a,b)=>a.createdAt-b.createdAt)){const el=document.createElement('div');el.className='item';const title=document.createElement('strong');title.textContent=`${item.payload.match} · ${item.payload.alliance} · ${item.payload.team}`;el.append(title);const p=document.createElement('p');p.textContent=`ID ${item.submissionId} · ${new Date(item.createdAt).toLocaleString()}`;el.append(p);if(item.lastError){const error=document.createElement('p');error.className='danger';error.textContent='Последняя ошибка: '+item.lastError;el.append(error);}const remove=document.createElement('button');remove.className='secondary danger';remove.textContent='Удалить запись';remove.addEventListener('click',async()=>{if(!confirm('Удалить эту НЕОТПРАВЛЕННУЮ запись с устройства? Это нельзя отменить.'))return;await removeQueued(item.submissionId);await renderQueue();});el.append(remove);root.append(el);}
}
async function checkServer({refresh=true}={}){if(!navigator.onLine){connection('Офлайн');return false;}try{await verifyApi();connection('Сервер доступен',true);if(refresh){const [m,t]=await Promise.all([fetchMatches(),fetchTeams()]);if(m.length){matches=m;setCache('matches',m);}if(t.length){teams=t;setCache('teams',t);}refreshLists();}return true;}catch(e){connection('Нет связи с таблицей');note('Проверка API: '+e.message,'danger');return false;}}
async function syncNow(){try{const res=await syncQueue({onUpdate:updateQueueBadge});if(res.needsRepair)note('Запись сохранена в RawData, но Qualifications/Average не обновились. Администратору нужно запустить forceUpdateData.','danger');else if(res.sent)note('Отправлено и подтверждено записей: '+res.sent);else if(res.remaining)note('Осталось в очереди: '+res.remaining+'. Проверьте соединение и ошибки в очереди.');await renderQueue();lastSync=Date.now();}catch(e){connection('Нет связи с таблицей');note('Синхронизация не завершена: '+e.message+' — данные сохранены локально.','danger');await renderQueue();}}
function safeFilename(value){return String(value).replace(/[^0-9A-Za-z_-]/g,'_').slice(0,40);}
function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
async function exportQueue(){const rows=await getQueue();download('ftc-pending-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({format:'ftc-scout-queue-v2',exportedAt:new Date().toISOString(),records:rows},null,2),'application/json');note('Копия очереди сохранена. Не публикуйте её: в ней могут быть имена скаутов.');}
function renderRanking(){const root=$('rankingList');root.replaceChildren();if(!ranking.length){root.textContent='Нет закэшированного рейтинга. Подключитесь к серверу и обновите.';return;}ranking.forEach((r,i)=>{const d=document.createElement('div');d.className='item';d.textContent=`${i+1}. Команда ${r.team} — ${r.totalRP} RP (${r.qCount} матчей)`;root.append(d);});}
async function loadRanking(){try{const val=await fetchRanking();ranking=val;setCache('ranking',val);renderRanking();note('Рейтинг обновлён.');}catch(e){note('Рейтинг из кеша. Ошибка обновления: '+e.message,'danger');renderRanking();}}
async function loadStats(){const team=$('statsTeam').value.trim();if(!/^\d+$/.test(team)){note('Укажите номер команды');return;}try{const s=await fetchStats(team);setCache('stats_'+safeFilename(team),s);renderStats(s);}catch(e){const cache=getCache('stats_'+safeFilename(team),null);if(cache)renderStats(cache);else note('Нет сохранённой статистики: '+e.message,'danger');}}
function renderStats(s){const root=$('statsResult');root.replaceChildren();const txt=document.createElement('p');txt.textContent=`Команда ${s.team||'?'} · ${s.qCount||0} матчей · средний RP ${s.avg||0} · медиана ${s.median||0} · стабильность ${s.consistency||0}%`;root.append(txt);for(const m of s.matches||[]){const row=document.createElement('div');row.className='item';row.textContent=`${m.match}: Auto ${m.autoArtifacts} / ${m.autoHits}; TeleOp ${m.teleArtifacts} / ${m.teleHits}; RP ${m.totalRP}`;root.append(row);}}
function csvRanking(){const clean=v=>'"'+String(v??'').replaceAll('"','""')+'"';const rows=[['Team','Total RP','Q Count'],...ranking.map(x=>[x.team,x.totalRP,x.qCount])];download('ftc-ranking.csv','\ufeff'+rows.map(r=>r.map(clean).join(',')).join('\r\n'),'text/csv;charset=utf-8');}
function initCounters(){
  document.querySelectorAll('[data-counter]').forEach(btn=>btn.addEventListener('click',()=>{
    const id=btn.dataset.counter;
    const phase=id.startsWith('auto')?'auto':'tele';
    const artifactsEl=$(phase+'Artifacts');
    const hitsEl=$(phase+'Hits');
    const target=id.endsWith('Hits')?'hits':'artifacts';
    const delta=Number(btn.dataset.delta);
    const next=adjustCounters(Number(artifactsEl.textContent),Number(hitsEl.textContent),target,delta);
    artifactsEl.textContent=String(next.artifacts);
    hitsEl.textContent=String(next.hits);
    saveDraft();
  }));
}
function legacyId(item,index){const payload=JSON.stringify(item);let hash=2166136261;for(let i=0;i<payload.length;i++){hash=Math.imul(hash^payload.charCodeAt(i),16777619);}return 'legacy_'+index+'_'+(hash>>>0).toString(16);}
async function migrateLegacyQueue(){let legacy;try{legacy=JSON.parse(localStorage.getItem('queue')||'[]')}catch(e){note('Старая очередь повреждена. Сделайте копию данных Safari.','danger');return;}
 if(!Array.isArray(legacy)||!legacy.length)return;
 for(let i=0;i<legacy.length;i++){const old=legacy[i];if(!old||old.type!=='submit'||!old.payload)continue;const payload={...old.payload,submissionId:old.payload.submissionId||legacyId(old,i)};await putPending({submissionId:payload.submissionId,payload,createdAt:Date.now()+i,lastError:''});}
 localStorage.removeItem('queue');note('Старая офлайн-очередь перенесена в новое хранилище.');}
async function start(){
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js').catch(e=>console.warn('Offline shell:',e));
 teams=getCache('teams',[]);matches=getCache('matches',[]);ranking=getCache('ranking',[]);
 if(!teams.length){try{teams=JSON.parse(localStorage.getItem('cachedTeams')||'[]').map(String);}catch(e){}}
 if(!matches.length){try{matches=JSON.parse(localStorage.getItem('cachedMatches')||'[]').map(String);}catch(e){}}
 if(!matches.length)matches=Array.from({length:20},(_,i)=>'Q'+(i+1));
 refreshLists();$('themeSelect').value=getSetting('theme','dark');document.body.classList.toggle('light',$('themeSelect').value==='light');$('scoutName').value=getSetting('scout','');
 restoreDraft();setStation(station);renderRanking();
 initCounters();
 for(const el of document.querySelectorAll('[data-tab]'))el.addEventListener('click',()=>selectTab(el.dataset.tab));
 for(const el of document.querySelectorAll('[data-station]'))el.addEventListener('click',()=>setStation(el.dataset.station));
 document.querySelectorAll('#tab-scout input,#matchSelect').forEach(el=>el.addEventListener('change',saveDraft));$('teamInput').addEventListener('input',saveDraft);
 $('scoutName').addEventListener('change',()=>setSetting('scout',$('scoutName').value.trim()));
 $('themeSelect').addEventListener('change',()=>{document.body.classList.toggle('light',$('themeSelect').value==='light');setSetting('theme',$('themeSelect').value);});
 $('sendBtn').addEventListener('click',async()=>{const btn=$('sendBtn');btn.disabled=true;try{const d=getDraft();validate(d);d.scout=$('scoutName').value.trim();d.submissionId=createId();await queueSubmission(d);await updateQueueBadge();note('Запись сохранена на устройстве. Отправка…');clearCounters();if(navigator.onLine)await syncNow();else note('Сохранено офлайн. Запись будет отправлена при восстановлении связи.');}catch(e){note('Не удалось сохранить запись! НЕ закрывайте страницу: '+e.message,'danger');}finally{btn.disabled=false;}});
 $('syncBtn').addEventListener('click',syncNow);$('backupBtn').addEventListener('click',()=>exportQueue().catch(e=>note(e.message,'danger')));
 $('rankingBtn').addEventListener('click',loadRanking);$('csvBtn').addEventListener('click',csvRanking);$('printBtn').addEventListener('click',()=>window.print());$('statsBtn').addEventListener('click',loadStats);
 $('checkBtn').addEventListener('click',()=>checkServer());$('clearDraftBtn').addEventListener('click',()=>{if(confirm('Очистить только черновик? Очередь не затрагивается.')){setCache('draft',null);clearCounters();note('Черновик очищен.');}});
 window.addEventListener('online',async()=>{connection('Проверка…');await checkServer();await syncNow();});
 window.addEventListener('offline',()=>connection('Офлайн'));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden && Date.now()-lastSync>30000)syncNow();else saveDraft();});
 window.addEventListener('pagehide',saveDraft);
 try{await migrateLegacyQueue();await updateQueueBadge();}catch(e){note('Ошибка переноса старой очереди: '+e.message,'danger');}
 if(navigator.onLine){await checkServer();await syncNow();}else connection('Офлайн');
}
start().catch(e=>note('Ошибка запуска: '+e.message,'danger'));
