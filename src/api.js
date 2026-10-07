// Клиент GREEN-API (MAX). Формат: {apiUrl}/waInstance{id}/{method}/{token}
export const defaultApiUrl = (id) =>
  /^\d{4}/.test(id) ? `https://${id.slice(0, 4)}.api.green-api.com` : 'https://api.green-api.com';

export class GreenApi {
  constructor({ idInstance, apiTokenInstance, apiUrl }) {
    this.id = idInstance.trim();
    this.token = apiTokenInstance.trim();
    this.apiUrl = (apiUrl || defaultApiUrl(this.id)).trim().replace(/\/+$/, '');
  }

  async call(method, { httpMethod = 'GET', body, tail = '', signal } = {}) {
    const res = await fetch(`${this.apiUrl}/waInstance${this.id}/${method}/${this.token}${tail}`, {
      method: httpMethod,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* не JSON */ }
    if (!res.ok) throw new Error(data?.reason || data?.message || `Ошибка ${res.status}`);
    return data;
  }

  getState = () => this.call('getStateInstance');

  // Номер телефона -> chatId пользователя MAX
  async checkAccount(phone) {
    const data = await this.call('checkAccount', {
      httpMethod: 'POST',
      body: { phoneNumber: Number(phone) },
    });
    if (!data?.chatId) throw new Error('На этом номере нет аккаунта MAX');
    return String(data.chatId);
  }

  // SendMessage: https://green-api.com/v3/docs/api/sending/SendMessage/
  sendMessage = (chatId, message) =>
    this.call('sendMessage', { httpMethod: 'POST', body: { chatId, message } });

  // HTTP API: ReceiveNotification + DeleteNotification
  receive = (signal) => this.call('receiveNotification', { tail: '?receiveTimeout=5', signal });
  remove = (receiptId) => this.call('deleteNotification', { httpMethod: 'DELETE', tail: `/${receiptId}` });
}
