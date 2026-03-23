// Shared user auth header logic — included on all public pages
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
      window.location.reload();
    });
  } else {
    nav.innerHTML = `
      <a href="/login.html">లాగిన్ (Login)</a>
      <a href="/register.html" class="btn-register">నమోదు (Register)</a>
    `;
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
})();
