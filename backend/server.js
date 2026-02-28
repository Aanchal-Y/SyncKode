/**
 * server.js — SyncKode main server
 * Express + Passport (GitHub OAuth + Local) + Socket.io
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express   = require('express');
const http      = require('http');
const path      = require('path');
const session   = require('express-session');
const passport  = require('passport');

const app       = express();
const server    = http.createServer(app);
const { Server } = require('socket.io');
const io        = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 10 * 1024 * 1024,  // 10 MB — needed for PNG snapshot payloads
});

/* ── Middleware ──────────────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'synckode-super-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,                          // set true behind HTTPS proxy
    maxAge: 7 * 24 * 60 * 60 * 1000,       // 7 days
  },
}));

app.use(passport.initialize());
app.use(passport.session());

/* ── Passport config ─────────────────────────────────────── */
require('./passport')(passport);

/* ── Routes ──────────────────────────────────────────────── */
app.use('/auth',      require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/user',  require('./routes/user'));
app.use('/api/ai',    require('./routes/ai'));

/* ── Auth-guard redirect for protected pages ─────────────── */
const PROTECTED = ['/rooms.html', '/room.html', '/profile.html'];
app.use((req, res, next) => {
  if (PROTECTED.some(p => req.path === p) && !req.isAuthenticated()) {
    return res.redirect('/index.html');
  }
  next();
});

/* ── Serve static HTML files ─────────────────────────────── */
app.use(express.static(path.join(__dirname, '..')));

// Root → index.html
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

/* ── Socket.io real-time ─────────────────────────────────── */
require('./socket')(io);

/* ── Start ───────────────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n⚡ SyncKode server running  →  http://localhost:${PORT}\n`);
});
