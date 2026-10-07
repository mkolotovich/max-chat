import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { GreenApi } from './api.js';
import { loadChats, reducer, saveChats } from './store.js';
import Login from './Login.jsx';

const CREDS_KEY = 'max-chat:creds';
const sleep = (ms, signal) => new Promise((r) => { const t = setTimeout(r, ms); signal.addEventListener('abort', () => { clearTimeout(t); r(); }); });
const fmtTime = (ts) => new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const initials = (s = '?') => s.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '#';

function textOf(md = {}) {
  if (md.textMessageData) return md.textMessageData.textMessage;
  if (md.extendedTextMessageData) return md.extendedTextMessageData.text;
  return 'Сообщение этого типа не поддерживается';
}

export default function App() {
  const [creds, setCreds] = useState(() => { try { return JSON.parse(localStorage.getItem(CREDS_KEY)); } catch { return null; } });
  const api = useMemo(() => (creds ? new GreenApi(creds) : null), [creds]);
  const login = (c) => { localStorage.setItem(CREDS_KEY, JSON.stringify(c)); setCreds(c); };
  const logout = () => { localStorage.removeItem(CREDS_KEY); setCreds(null); };
  return api ? <Chat key={api.id} api={api} onLogout={logout} /> : <Login onLogin={login} />;
}

function Chat({ api, onLogout }) {
  const [chats, dispatch] = useReducer(reducer, api.id, loadChats);
  const [activeId, setActiveId] = useState(null);
  const [online, setOnline] = useState(true);
  const activeRef = useRef(null);
  activeRef.current = activeId;

  useEffect(() => saveChats(api.id, chats), [api.id, chats]);

  // Получение: long polling ReceiveNotification (5 с) -> обработка -> DeleteNotification
  useEffect(() => {
    const ctrl = new AbortController();
    const { signal } = ctrl;
    (async () => {
      while (!signal.aborted) {
        try {
          const n = await api.receive(signal);
          setOnline(true);
          if (!n) continue;
          const b = n.body || {};
          const s = b.senderData || {};
          if (b.typeWebhook === 'incomingMessageReceived' && s.chatId) {
            dispatch({
              type: 'addMessage', chatId: s.chatId, active: activeRef.current === s.chatId,
              title: s.chatName || s.senderName || s.chatId, phone: undefined,
              msg: { id: b.idMessage, out: false, text: textOf(b.messageData), ts: (b.timestamp || Date.now() / 1000) * 1000 },
            });
          }
          await api.remove(n.receiptId);
        } catch (e) {
          if (signal.aborted) return;
          setOnline(false);
          await sleep(3000, signal);
        }
      }
    })();
    return () => ctrl.abort();
  }, [api]);

  const list = Object.values(chats).sort((a, b) => (b.messages.at(-1)?.ts || 0) - (a.messages.at(-1)?.ts || 0));
  const active = chats[activeId];
  const open = (id) => { setActiveId(id); dispatch({ type: 'read', chatId: id }); };

  async function send(text) {
    const tempId = `tmp-${Date.now()}`;
    const chatId = activeId;
    dispatch({ type: 'addMessage', chatId, active: true, msg: { id: tempId, out: true, text, ts: Date.now(), status: 'sending' } });
    try {
      const r = await api.sendMessage(chatId, text);
      dispatch({ type: 'patchMessage', chatId, id: tempId, patch: { id: r?.idMessage || tempId, status: 'sent' } });
    } catch (e) {
      dispatch({ type: 'patchMessage', chatId, id: tempId, patch: { status: 'error', error: e.message } });
    }
  }

  return (
    <div className={`app ${active ? 'has-chat' : ''}`}>
      <Sidebar {...{ api, list, activeId, open, dispatch, online, onLogout }} />
      {active ? <Thread chat={active} send={send} back={() => setActiveId(null)} /> : (
        <section className="thread empty"><p>Выберите чат или создайте новый по номеру телефона</p></section>
      )}
    </div>
  );
}

function Sidebar({ api, list, activeId, open, dispatch, online, onLogout }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(e) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) return setError('Введите номер в международном формате, например 79991234567');
    setBusy(true); setError('');
    try {
      const chatId = await api.checkAccount(digits);
      dispatch({ type: 'addChat', chatId, title: `+${digits}`, phone: digits });
      setPhone(''); open(chatId);
    } catch (err) {
      setError(err instanceof TypeError ? 'Нет связи с GREEN-API' : err.message);
    } finally { setBusy(false); }
  }

  return (
    <aside className="sidebar">
      <header>
        <h2>Чаты</h2>
        <span className={`dot ${online ? 'on' : 'off'}`} title={online ? 'Подключено' : 'Нет связи, повторяем…'} />
        <button className="link" onClick={onLogout}>Выйти</button>
      </header>
      <form className="new-chat" onSubmit={create}>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Номер получателя: 79991234567" aria-label="Номер телефона получателя" />
        <button className="primary" disabled={busy}>{busy ? '…' : 'Новый чат'}</button>
      </form>
      {error && <div className="error" role="alert">{error}</div>}
      <ul className="chat-list">
        {list.map((c) => {
          const last = c.messages.at(-1);
          return (
            <li key={c.id}>
              <button className={c.id === activeId ? 'row active' : 'row'} onClick={() => open(c.id)}>
                <span className="avatar">{initials(c.title)}</span>
                <span className="meta">
                  <b>{c.title}</b>
                  <span className="muted ellipsis">{last ? (last.out ? 'Вы: ' : '') + last.text : 'Нет сообщений'}</span>
                </span>
                {c.unread > 0 && <span className="badge">{c.unread}</span>}
              </button>
            </li>
          );
        })}
        {!list.length && <li className="muted pad">Чатов пока нет</li>}
      </ul>
    </aside>
  );
}

function Thread({ chat, send, back }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [chat.messages.length, chat.id]);

  function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    send(t);
  }

  return (
    <section className="thread">
      <header>
        <button className="link back" onClick={back} aria-label="К списку чатов">‹</button>
        <span className="avatar">{initials(chat.title)}</span>
        <div className="meta"><b>{chat.title}</b><span className="muted">{chat.phone ? `+${chat.phone}` : `id ${chat.id}`}</span></div>
      </header>
      <div className="messages">
        {chat.messages.map((m) => (
          <div key={m.id} className={`bubble ${m.out ? 'out' : 'in'}`}>
            <span className="text">{m.text}</span>
            <span className="time">
              {fmtTime(m.ts)}
              {m.out && (m.status === 'sending' ? ' · отправка…' : m.status === 'error' ? ' · не отправлено' : ' ✓')}
            </span>
            {m.status === 'error' && <span className="err-note">{m.error}</span>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="composer" onSubmit={submit}>
        <textarea
          rows={1} value={text} placeholder="Сообщение" aria-label="Сообщение"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}
        />
        <button className="primary" disabled={!text.trim()}>Отправить</button>
      </form>
    </section>
  );
}
