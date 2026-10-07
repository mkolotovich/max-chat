// Состояние чатов: { chats: { [chatId]: { id, title, phone, unread, messages[] } } }
const KEY = (id) => `max-chat:${id}`;
export const loadChats = (id) => {
  try { return JSON.parse(localStorage.getItem(KEY(id))) || {}; } catch { return {}; }
};
export const saveChats = (id, chats) => {
  try { localStorage.setItem(KEY(id), JSON.stringify(chats)); } catch { /* квота */ }
};

export function reducer(state, a) {
  switch (a.type) {
    case 'init': return a.chats;
    case 'addChat':
      return state[a.chatId] ? state : { ...state, [a.chatId]: { id: a.chatId, title: a.title, phone: a.phone, unread: 0, messages: [] } };
    case 'addMessage': {
      const chat = state[a.chatId] || { id: a.chatId, title: a.title || a.chatId, phone: a.phone, unread: 0, messages: [] };
      if (a.msg.id && chat.messages.some((m) => m.id === a.msg.id)) return state;
      return {
        ...state,
        [a.chatId]: {
          ...chat,
          title: chat.phone ? chat.title : a.title || chat.title,
          unread: a.msg.out || a.active ? 0 : chat.unread + 1,
          messages: [...chat.messages, a.msg],
        },
      };
    }
    case 'patchMessage': {
      const chat = state[a.chatId];
      if (!chat) return state;
      return { ...state, [a.chatId]: { ...chat, messages: chat.messages.map((m) => (m.id === a.id ? { ...m, ...a.patch } : m)) } };
    }
    case 'read':
      return state[a.chatId] ? { ...state, [a.chatId]: { ...state[a.chatId], unread: 0 } } : state;
    default: return state;
  }
}
