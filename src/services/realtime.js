let io;
function init(server) {
  io = server;
  io.on('connection', (socket) => {
    socket.on('join', (room) => socket.join(room));
    socket.on('leave', (room) => socket.leave(room));
  });
}
function emit(event, room, data) {
  if (!io) return;
  if (room) io.to(room).emit(event, data);
  else io.emit(event, data);
}
module.exports = { init, emit };
