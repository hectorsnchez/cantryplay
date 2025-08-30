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
    rotateMobile BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0
  )`;
}

module.exports = async function handler(req, res){
  await ensureSchema();
  if(req.method === 'GET'){
    try{
      const { rows } = await sql`SELECT * FROM games ORDER BY position ASC, id DESC`;
      // Normalize keys to camelCase for frontend consistency
      const normalized = rows.map(r => ({
        id: r.id,
        name: r.name,
        img: r.img,
        video: r.video,
        embed: r.embed,
        category: r.category,
        size: r.size,
        noMobile: r.nomobile ?? r.noMobile ?? false,
        rotateMobile: r.rotatemobile ?? r.rotateMobile ?? false,
        position: r.position ?? 0,
      }));
      res.status(200).json(normalized);
    }catch(e){
      res.status(500).json({ error:'DB error' });
    }
    return;
  }
  if(req.method === 'POST'){
    try{
      const { name, img, video, embed, category, size, noMobile, rotateMobile, gameIds } = req.body || {};
      
      // Si es reordenamiento de juegos
      if(gameIds && Array.isArray(gameIds)){
        for(let i = 0; i < gameIds.length; i++){
          await sql`UPDATE games SET position = ${i + 1} WHERE id = ${gameIds[i]}`;
        }
        res.status(200).json({ ok: true });
        return;
      }
      
      // Si es crear nuevo juego
      if(!name || !img || !embed){
        return res.status(400).json({ error:'Faltan campos obligatorios' });
      }
      
      // Obtener la posición más alta
      const { rows: maxPosRows } = await sql`SELECT MAX(position) as maxPos FROM games`;
      const nextPosition = (maxPosRows[0]?.maxpos || 0) + 1;
      
      const { rows } = await sql`
        INSERT INTO games(name,img,video,embed,category,size,noMobile,rotateMobile,position)
        VALUES (${name}, ${img}, ${video||''}, ${embed}, ${category||'Acción'}, ${size||'pequeño'}, ${noMobile||false}, ${rotateMobile||false}, ${nextPosition})
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
