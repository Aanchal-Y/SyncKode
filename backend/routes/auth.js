/**
 * routes/auth.js — Authentication endpoints
 *
 *  POST /auth/register    — create email/password account
 *  POST /auth/login       — email/password sign-in (JSON response)
 *  GET  /auth/github      — start GitHub OAuth
 *  GET  /auth/github/callback
 *  GET  /auth/logout
 *  GET  /auth/me          — current session user (JSON)
 */
'use strict';

const router   = require('express').Router();
const passport = require('passport');
const bcrypt   = require('bcryptjs');
const { users } = require('../store');

/* ── Register ────────────────────────────────────────────── */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  if (users.findByEmail(email))
    return res.status(409).json({ error: 'Email already in use.' });

  const hash = await bcrypt.hash(password, 10);
  const user = users.create({ name, email, password: hash });

  req.login(user, err => {
    if (err) return res.status(500).json({ error: 'Session error.' });
    const { password: _p, ...safe } = user;
    return res.json({ ok: true, user: safe });
  });
});

/* ── Login ───────────────────────────────────────────────── */
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err)    return next(err);
    if (!user)  return res.status(401).json({ error: info?.message || 'Invalid credentials.' });

    req.login(user, loginErr => {
      if (loginErr) return next(loginErr);
      const { password: _p, ...safe } = user;
      return res.json({ ok: true, user: safe });
    });
  })(req, res, next);
});

/* ── Logout ──────────────────────────────────────────────── */
router.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/index.html'));
});

router.post('/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

/* ── Current user ────────────────────────────────────────── */
router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated.' });
  res.json(req.user);
});

module.exports = router;
