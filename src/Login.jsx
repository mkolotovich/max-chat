import { useState } from 'react';
import { GreenApi, defaultApiUrl } from './api.js';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ idInstance: '', apiTokenInstance: '', apiUrl: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const creds = { ...form, apiUrl: form.apiUrl.trim() };
    try {
      const api = new GreenApi(creds);
      const { stateInstance } = (await api.getState()) || {};
      if (stateInstance && stateInstance !== 'authorized')
        throw new Error(`Инстанс не авторизован (статус: ${stateInstance}). Авторизуйте MAX в личном кабинете GREEN-API.`);
      onLogin(creds);
    } catch (err) {
      setError(err instanceof TypeError ? 'Не удалось подключиться. Проверьте idInstance, токен и адрес API.' : err.message);
    } finally { setBusy(false); }
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit}>
        <h1>Вход в MAX Чат</h1>
        <p className="muted">Введите данные инстанса из личного кабинета GREEN-API.</p>
        <label>idInstance
          <input value={form.idInstance} onChange={set('idInstance')} inputMode="numeric" autoComplete="off" required placeholder="3100123456" />
        </label>
        <label>apiTokenInstance
          <input type="password" value={form.apiTokenInstance} onChange={set('apiTokenInstance')} autoComplete="off" required />
        </label>
        <label>Адрес API <span className="muted">(необязательно)</span>
          <input value={form.apiUrl} onChange={set('apiUrl')} placeholder={defaultApiUrl(form.idInstance || '3100')} />
        </label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Проверяем…' : 'Войти'}</button>
      </form>
    </main>
  );
}
