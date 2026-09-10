import client from './client';

export const agentApi = {
  sendMessage: (message, context) =>
    client.post('/agent/message', { message, context }).then((r) => r.data),
  confirm: (typeConfirmValue) =>
    client.post('/agent/confirm', { typeConfirmValue }).then((r) => r.data),
  cancel: () =>
    client.post('/agent/cancel').then((r) => r.data),
  clearHistory: () =>
    client.delete('/agent/history').then((r) => r.data),
};
