require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const { Server } = require('socket.io');

const { initDatabase } = require('./src/config/database');
const { csrfMiddleware, csrfTokenEndpoint } = require('./src/middleware/csrf');
const { globalLimiter } = require('./src/middleware/rateLimit');
const { attachUser } = require('./src/middleware/auth');
const realtime = require('./src/services/realtime');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: false } });
realtime.init(io);

// Segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Sessão
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: './data' }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

// CSRF
app.use(csrfMiddleware);
app.get('/api/csrf', csrfTokenEndpoint);

// Rate limit global
app.use('/api', globalLimiter);

// DB
initDatabase();

// Attach user
app.use(attachUser);

// Estáticos
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.use('/uploads', express.static(path.join(__dirname, 'data/uploads'), { maxAge: '7d' }));

// Rotas
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/boards', require('./src/routes/boards'));
app.use('/api/threads', require('./src/routes/threads'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/search', require('./src/routes/search'));
app.use('/api/favorites', require('./src/routes/favorites'));
app.use('/api/discord', require('./src/routes/discord'));

// SPA fallback básico
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Erros
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`AnonChan rodando em http://localhost:${PORT}`));
