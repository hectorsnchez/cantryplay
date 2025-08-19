const path = require('path');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.sqlite');

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// Init DB
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    img TEXT NOT NULL,
    video TEXT,
    embed TEXT NOT NULL,
    category TEXT,
    size TEXT
  )`);

  // Seed default categories if empty
  db.get('SELECT COUNT(*) AS c FROM categories', (err, row) => {
    if (err) return console.error('DB error:', err);
    if (row && row.c === 0) {
      const defaults = ['Acción','Aventura','Puzzle','Deportes','Estrategia'];
      const stmt = db.prepare('INSERT INTO categories(name) VALUES (?)');
      defaults.forEach(n => stmt.run(n));
      stmt.finalize();
      console.log('Seeded default categories');
    }
  });
});

// Categories API
app.get('/api/categories', (req, res) => {
  db.all('SELECT name FROM categories ORDER BY name ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows.map(r => r.name));
  });
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Nombre inválido' });
  }
  const norm = name.trim();
  if (!norm) return res.status(400).json({ error: 'Nombre vacío' });
  db.run('INSERT INTO categories(name) VALUES (?)', [norm], function(err) {
    if (err) {
      if (err.message && err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Categoría ya existe' });
      }
      return res.status(500).json({ error: 'DB error' });
    }
    res.status(201).json({ name: norm });
  });
});

app.delete('/api/categories/:name', (req, res) => {
  const name = req.params.name;
  if (name === 'Acción') {
    return res.status(400).json({ error: 'No se puede eliminar la categoría predeterminada' });
  }
  db.serialize(() => {
    db.run('UPDATE games SET category = ? WHERE category = ?', ['Acción', name], function(err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      db.run('DELETE FROM categories WHERE name = ?', [name], function(err2) {
        if (err2) return res.status(500).json({ error: 'DB error' });
        res.json({ ok: true });
      });
    });
  });
});

// Games API
app.get('/api/games', (req, res) => {
  db.all('SELECT * FROM games ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

app.post('/api/games', (req, res) => {
  const { name, img, video, embed, category, size } = req.body || {};
  if (!name || !img || !embed) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const sql = 'INSERT INTO games(name,img,video,embed,category,size) VALUES (?,?,?,?,?,?)';
  db.run(sql, [name, img, video || '', embed, category || 'Acción', size || 'pequeño'], function(err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    db.get('SELECT * FROM games WHERE id = ?', [this.lastID], (err2, row) => {
      if (err2) return res.status(500).json({ error: 'DB error' });
      res.status(201).json(row);
    });
  });
});

app.delete('/api/games/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });
  db.run('DELETE FROM games WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (this.changes === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

