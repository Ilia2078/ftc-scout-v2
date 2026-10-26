import { putPending, pending, deletePending } from './storage.js';
import { submitData, verifyApi } from './api.js';
let active = null;
export async function queueSubmission(payload) {
  const record = {submissionId: payload.submissionId, payload, createdAt:Date.now(), lastError:''};
  await putPending(record); // await durable transaction BEFORE reporting saved
  return record;
}
export function getQueue() { return pending(); }
export async function removeQueued(id) { await deletePending(id); }
/** Serialized and single-flight: no deletion until the server echoes stored=true. */
export async function syncQueue({ onUpdate=()=>{}, verify=verifyApi, send=submitData }={}) {
  if (active) return active;
  active = (async () => {
    const items = await pending();
    if (!items.length) { onUpdate(); return {sent:0, remaining:0}; }
    // navigator.onLine can be wrong, but an explicit offline status avoids wasted time.
    if (!navigator.onLine) { onUpdate(); return {sent:0,remaining:items.length}; }
    await verify(); // refuse to flush to old/misconfigured backend
    let sent=0;
    for (const entry of items) {
      try {
        await send(entry.payload);
        await deletePending(entry.submissionId);
        sent++;
      } catch(e) {
        entry.lastError=String(e && e.message || e);
        await putPending(entry);
        // Stop to avoid flooding or sending in unpredictable order.
        break;
      }
      onUpdate();
    }
    const remaining=(await pending()).length;
    onUpdate();
    return {sent,remaining};
  })();
  try { return await active; }
  finally { active=null; }
}
