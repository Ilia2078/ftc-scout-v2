import { saveQueue, loadQueue } from './storage.js';
import { callApi } from './api.js';

let queue = loadQueue();

export function addToQueue(item) {
  queue.push(item);
  saveQueue(queue);
}

export async function processQueue() {
  if (!navigator.onLine) return;
  const copy = [...queue];
  queue = [];
  saveQueue(queue);

  for (const item of copy) {
    try {
      if (item.type === 'submit') {
        await callApi('submit', item.payload);
      }
      // другие типы
    } catch (e) {
      console.error('Sync error, re-queueing', e);
      queue.push(item); // вернуть в очередь
    }
  }
  saveQueue(queue);
}