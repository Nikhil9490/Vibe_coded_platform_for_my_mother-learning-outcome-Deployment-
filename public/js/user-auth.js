// Shared user auth header — included on all public pages
(function () {
  const nav = document.getElementById('user-nav');
  if (!nav) return;

  const token = localStorage.getItem('user_token');
  const name  = localStorage.getItem('user_name');

  if (token && name) {
    nav.innerHTML = `
      <span class="user-greeting">👤 ${escHtml(name)}</span>
      <a href="#" id="logout-btn">లాగ్ అవుట్ (Logout)</a>
    `;
    document.getElementById('logout-btn').addEventListener('click', e => {
      e.preventDefault();
      localStorage.removeItem('user_token');
      localStorage.removeItem('user_name');
      window.location.href = '/';
    });
  } else {
    nav.innerHTML = `<a href="/">లాగిన్ (Login)</a>`;
  }

  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
})();
