const socket = io();
socket.on('new_thread', (t) => {
  document.dispatchEvent(new CustomEvent('realtime:new_thread', { detail: t }));
});
socket.on('new_post', (p) => {
  document.dispatchEvent(new CustomEvent('realtime:new_post', { detail: p }));
});
