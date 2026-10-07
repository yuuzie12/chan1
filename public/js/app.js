// CSRF helper
let CSRF = null;
async function getCsrf() {
  if (CSRF) return CSRF;
  const r = await fetch('/api/csrf');
  const j = await r.json();
  CSRF = j.token;
  return CSRF;
}

async function api(url, opts = {}) {
  opts.headers = opts.headers || {};
  if (opts.method && opts.method !== 'GET') {
    opts.headers['X-CSRF-Token'] = await getCsrf();
  }
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error((await r.json()).error || 'Erro');
  return r.json();
}

// Tema
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('theme-toggle').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// Boards
async function loadBoards() {
  const grid = document.getElementById('boards-grid');
  try {
    const boards = await api('/api/boards');
    if (!boards.length) {
      grid.innerHTML = '<p>Nenhum board ainda. Administrador pode criar.</p>';
      return;
    }
    grid.innerHTML = boards.map(b => `
      <a class="board-card" href="/board.html?slug=${encodeURIComponent(b.slug)}">
        <h3>/${b.slug}/ - ${b.name}</h3>
        <p>${b.description || ''}</p>
        <p>${b.thread_count} tópicos</p>
      </a>
    `).join('');
  } catch (e) { grid.innerHTML = '<p>Erro ao carregar boards.</p>'; }
}

// Usuário
async function loadUser() {
  const area = document.getElementById('user-area');
  try {
    const { user } = await api('/api/auth/me');
    if (user) {
      area.innerHTML = `<span>@${user.username}</span> 
        <button id="logout-btn">Sair</button>`;
      document.getElementById('logout-btn').onclick = async () => {
        await api('/api/auth/logout', { method: 'POST' });
        location.reload();
      };
      if (user.role === 'admin' || user.role === 'moderator') {
        document.querySelector('.admin-link').classList.remove('hidden');
      }
    } else {
      area.innerHTML = `<button onclick="location.href='/login.html'">Entrar</button>`;
    }
  } catch { }
}

// Busca global
document.getElementById('global-search').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.value.trim()) {
    location.href = `/search.html?q=${encodeURIComponent(e.target.value.trim())}`;
  }
});

loadBoards();
loadUser();
