/**
 * routes/user.js — User profile endpoints
 *
 *  GET  /api/user/me          — current user (same as /auth/me)
 *  PUT  /api/user/profile     — update name, username, bio, avatar
 *  PUT  /api/user/password    — change password
 */
'use strict';

const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const { users } = require('../store');

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Authentication required.' });
}

/* ── Current user ────────────────────────────────────────── */
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

/* ── Update profile ──────────────────────────────────────── */
router.put('/profile', requireAuth, (req, res) => {
  const { name, username, bio, avatar } = req.body;

  const updated = users.update(req.user.id, {
    ...(name     !== undefined && { name }),
    ...(username !== undefined && { username }),
    ...(bio      !== undefined && { bio }),
    ...(avatar   !== undefined && { avatar }),
  });

  if (!updated) return res.status(404).json({ error: 'User not found.' });

  // Refresh session user
  const { password: _p, ...safe } = updated;
  req.user = safe;
  res.json({ ok: true, user: safe });
});

/* ── Change password ─────────────────────────────────────── */
router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });

  const fullUser = users.findById(req.user.id);
  if (!fullUser) return res.status(404).json({ error: 'User not found.' });

  // If user has a password, verify current
  if (fullUser.password) {
    if (!currentPassword)
      return res.status(400).json({ error: 'Current password is required.' });
    const ok = await bcrypt.compare(currentPassword, fullUser.password);
    if (!ok)
      return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  users.update(req.user.id, { password: hash });
  res.json({ ok: true });
});

module.exports = router;
