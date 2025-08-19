'use strict';
const { sql } = require('@vercel/postgres');

async function ensureSchema(){
  await sql`CREATE TABLE IF NOT EXISTS categories (name TEXT PRIMARY KEY)`;
  await sql`CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    img TEXT NOT NULL,
    video TEXT,
    embed TEXT NOT NULL,
    category TEXT,
    size TEXT
  )`;
}

module.exports = async function handler(req, res){
  await ensureSchema();
  if(req.method === 'GET'){
    try{
      const { rows } = await sql`SELECT name FROM categories ORDER BY name ASC`;
      res.status(200).json(rows.map(r => r.name));
    }catch(e){
      res.status(500).json({ error:'DB error' });
    }
    return;
  }
  if(req.method === 'POST'){
    try{
      const { name } = req.body || {};
      if(!name || !String(name).trim()) return res.status(400).json({ error:'Nombre inválido' });
      const n = String(name).trim();
      await sql`INSERT INTO categories(name) VALUES(${n}) ON CONFLICT (name) DO NOTHING`;
      res.status(201).json({ name:n });
    }catch(e){
      res.status(500).json({ error:'DB error' });
    }
    return;
  }
  if(req.method === 'DELETE'){
    try{
      const name = req.query.name;
      if(!name) return res.status(400).json({ error:'Nombre requerido' });
      if(name === 'Acción') return res.status(400).json({ error:'No se puede eliminar la categoría predeterminada' });
      await sql`UPDATE games SET category = 'Acción' WHERE category = ${name}`;
      await sql`DELETE FROM categories WHERE name = ${name}`;
      res.status(200).json({ ok:true });
    }catch(e){
      res.status(500).json({ error:'DB error' });
    }
    return;
  }
  res.setHeader('Allow', ['GET','POST','DELETE']);
  res.status(405).end('Method Not Allowed');
}

