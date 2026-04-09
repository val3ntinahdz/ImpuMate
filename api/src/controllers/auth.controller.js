'use strict';

const bcrypt   = require('bcrypt');
const { users } = require('../services/inMemoryStore');

const SALT_ROUNDS = 10;

async function register(req, res, next) {
  try {
    const { email, password, rfc, nombreCompleto } = req.body;

    if (!email || !password || !rfc || !nombreCompleto) {
      return res.status(400).json({ error: 'Campos requeridos: email, password, rfc, nombreCompleto.' });
    }

    if (await users.findByEmail(email)) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await users.create({ email, passwordHash, rfc, nombreCompleto });

    req.session.userId = user.id;

    res.status(201).json({ id: user.id, email: user.email, rfc: user.rfc, nombreCompleto: user.nombreCompleto });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Campos requeridos: email, password.' });
    }

    const user = await users.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    req.session.userId = user.id;

    res.json({ id: user.id, email: user.email, rfc: user.rfc, nombreCompleto: user.nombreCompleto });
  } catch (err) {
    next(err);
  }
}

function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.json({ message: 'Sesión cerrada correctamente.' });
  });
}

module.exports = { register, login, logout };
