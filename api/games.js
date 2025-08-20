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
    size TEXT,
    noMobile BOOLEAN DEFAULT FALSE,
    rotateMobile BOOLEAN DEFAULT FALSE
  )`;
}

module.exports = async function handler(req, res){
  await ensureSchema();
  if(req.method === 'GET'){
    try{
      const { rows } = await sql`SELECT * FROM games ORDER BY id DESC`;
      res.status(200).json(rows);
    }catch(e){
      res.status(500).json({ error:'DB error' });
    }
    return;
  }
  if(req.method === 'POST'){
    try{
      const { name, img, video, embed, category, size, noMobile, rotateMobile } = req.body || {};
      if(!name || !img || !embed){
        return res.status(400).json({ error:'Faltan campos obligatorios' });
      }
      const { rows } = await sql`
        INSERT INTO games(name,img,video,embed,category,size,noMobile,rotateMobile)
        VALUES (${name}, ${img}, ${video||''}, ${embed}, ${category||'Acción'}, ${size||'pequeño'}, ${noMobile||false}, ${rotateMobile||false})
        RETURNING *
      `;
      res.status(201).json(rows[0]);
    }catch(e){
      res.status(500).json({ error:'DB error' });
    }
    return;
  }
  if(req.method === 'DELETE'){
    try{
      const id = Number(req.query.id);
      if(!Number.isInteger(id)) return res.status(400).json({ error:'ID inválido' });
      const { rowCount } = await sql`DELETE FROM games WHERE id = ${id}`;
      if(rowCount === 0) return res.status(404).json({ error:'No encontrado' });
      res.status(200).json({ ok:true });
    }catch(e){
      res.status(500).json({ error:'DB error' });
    }
    return;
  }
  res.setHeader('Allow', ['GET','POST','DELETE']);
  res.status(405).end('Method Not Allowed');
}


