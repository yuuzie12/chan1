require('dotenv').config();
const { initDatabase, getDb } = require('../src/config/database');
const { hashPassword } = require('../src/middleware/security');

(async () => {
  initDatabase();
  const db = getDb();

  // Admins solicitados
  const admins = [
    { username: 'yuzie', password: 'yuzie12', role: 'admin', email: 'yuzie@anonchan.local' },
    { username: 'erikslava', password: 'erikslava55', role: 'admin', email: 'erikslava@anonchan.local' }
  ];

  for (const a of admins) {
    const exists = db.prepare('SELECT id FROM users WHERE username=?').get(a.username);
    if (exists) {
      console.log(`Usuário ${a.username} já existe.`);
      continue;
    }
    const hash = await hashPassword(a.password);
    db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?,?,?,?)')
      .run(a.username, a.email, hash, a.role);
    console.log(`✔ Admin criado: ${a.username}`);
  }

  // Boards iniciais
  const boards = [
    { slug: 'geral', name: 'Geral', description: 'Discussões gerais' },
    { slug: 'anime', name: 'Anime & Mangá', description: 'Fale sobre animes' },
    { slug: 'tech', name: 'Tecnologia', description: 'Programação, hardware, etc' },
    { slug: 'random', name: 'Random', description: 'Qualquer coisa' }
  ];
  for (const b of boards) {
    const ex = db.prepare('SELECT id FROM boards WHERE slug=?').get(b.slug);
    if (!ex) {
      db.prepare('INSERT INTO boards (slug, name, description) VALUES (?,?,?)')
        .run(b.slug, b.name, b.description);
      console.log(`✔ Board criado: /${b.slug}/`);
    }
  }

  console.log('\n✅ Seed concluído.');
  process.exit(0);
})();
