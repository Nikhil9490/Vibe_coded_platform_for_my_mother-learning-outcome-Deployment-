// Shared user auth header — included on all public pages
(function () {
  const nav = document.getElementById('user-nav');
  if (!nav) return;

  const userToken  = localStorage.getItem('user_token');
  const userName   = localStorage.getItem('user_name');
  const adminToken = localStorage.getItem('admin_token');

  if (userToken && userName) {
    nav.innerHTML = `
      <span class="user-greeting">👤 ${escHtml(userName)}</span>
      <a href="#" id="logout-btn">లాగ్ అవుట్ (Logout)</a>
    `;
    document.getElementById('logout-btn').addEventListener('click', e => {
      e.preventDefault();
      localStorage.removeItem('user_token');
      localStorage.removeItem('user_name');
      window.location.href = '/';
    });
  } else if (adminToken) {
    nav.innerHTML = `
      <span class="user-greeting">✍️ రోహిణి (Admin)</span>
      <a href="/admin/dashboard.html">Dashboard</a>
    `;
  } else {
    nav.innerHTML = `<a href="/">లాగిన్ (Login)</a>`;
  }

  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
})();
