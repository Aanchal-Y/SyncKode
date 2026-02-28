/**
 * passport.js — Passport strategies (Local: email + password)
 */
'use strict';

const LocalStrategy = require('passport-local').Strategy;
const bcrypt        = require('bcryptjs');
const { users }     = require('./store');

module.exports = function configurePassport(passport) {

  /* ── Serialize / Deserialize ─────────────────────────── */
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    const user = users.findById(id);
    if (!user) return done(null, false);
    const { password: _p, ...safe } = user;
    done(null, safe);
  });

  /* ── Local Strategy (email + password) ───────────────── */
  passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = users.findByEmail(email);
        if (!user)                          return done(null, false, { message: 'No account with that email.' });
        if (!user.password)                 return done(null, false, { message: 'No password set for this account.' });
        const ok = await bcrypt.compare(password, user.password);
        if (!ok)                            return done(null, false, { message: 'Incorrect password.' });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ));
};
