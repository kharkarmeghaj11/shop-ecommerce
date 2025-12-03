(function () {
  // Authentication and session management
  const AUTH_KEY = 'myshop_auth_v1';
  const USER_KEY = 'myshop_user_v1';
  const LOGIN_TIME_KEY = 'myshop_login_time_v1';
  const CART_KEY = 'myshop_cart_v1';
  const SESSION_TIMEOUT = 2 * 60 * 1000; // 2 minutes in milliseconds
  const CREDENTIALS = { username: 'shiv', password: '8932' };

  // Check for session timeout on page load
  function checkSessionTimeout() {
    try {
      const loginTime = sessionStorage.getItem(LOGIN_TIME_KEY);
      if (loginTime) {
        const elapsed = Date.now() - parseInt(loginTime);
        if (elapsed > SESSION_TIMEOUT) {
          // Session expired
          setAuthenticated(false);
          return false;
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // Set up periodic session check
  function setupSessionChecker() {
    setInterval(() => {
      try {
        const loginTime = sessionStorage.getItem(LOGIN_TIME_KEY);
        if (loginTime) {
          const elapsed = Date.now() - parseInt(loginTime);
          if (elapsed > SESSION_TIMEOUT) {
            // Session expired, logout
            setAuthenticated(false);
            alert('bsdk tera time katham ho gya chrome band kar ke wapis login kare'); //Your session has expired due to inactivity. Please log in again.
            window.location.href = 'login.html';
          }
        }
      } catch (e) {
        // Handle error silently
      }
    }, 1000); // Check every second
  }

  function isAuthenticated() {
    try {
      return sessionStorage.getItem(AUTH_KEY) === '1' && checkSessionTimeout();
    } catch (e) {
      return false;
    }
  }

  function setAuthenticated(val, username) {
    if (val) {
      sessionStorage.setItem(AUTH_KEY, '1');
      if (username) sessionStorage.setItem(USER_KEY, username);
      sessionStorage.setItem(LOGIN_TIME_KEY, Date.now().toString());
    } else {
      sessionStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(LOGIN_TIME_KEY);
      // Also clear cart when logging out
      sessionStorage.removeItem(CART_KEY);
    }
    updateLogoutLink();
    updateWelcome();
  }

  function getAuthUser() {
    try {
      return sessionStorage.getItem(USER_KEY) || null;
    } catch (e) {
      return null;
    }
  }

  function updateLogoutLink() {
    const link = document.getElementById('logout-link');
    if (!link) return;
    if (isAuthenticated()) {
      link.style.display = '';
    } else {
      link.style.display = 'none';
    }
  }

  function updateWelcome() {
    const el = document.getElementById('welcome-msg');
    if (!el) return;
    if (isAuthenticated()) {
      const rawUser = getAuthUser() || CREDENTIALS.username || 'admin';
      const user = rawUser.charAt(0).toUpperCase() + rawUser.slice(1);
      el.textContent = `Welcome, ${user}`;
      el.style.display = '';
    } else {
      el.textContent = '';
      el.style.display = 'none';
    }
  }

  // Cart functionality
  function formatCurrency(n) {
    return '$' + n.toFixed(2);
  }

  function parsePrice(priceText) {
    if (typeof priceText === 'number') return priceText;
    return parseFloat(priceText.replace(/[^0-9.-]+/g, '')) || 0;
  }

  function makeIdFromTitle(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function getCart() {
    try {
      return JSON.parse(sessionStorage.getItem(CART_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function addToCart(product) {
    const cart = getCart();
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      existing.qty += product.qty || 1;
    } else {
      cart.push(Object.assign({ qty: 1 }, product));
    }
    saveCart(cart);
  }

  function removeFromCart(id) {
    const cart = getCart().filter(i => i.id !== id);
    saveCart(cart);
    renderCart();
  }

  function changeQty(id, delta) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart(cart);
    renderCart();
  }

  function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((s, i) => s + i.qty, 0);
    const link = document.querySelector('a[href="cart.html"]');
    if (link) link.textContent = `Cart (${count})`;
  }

  // Rendering on cart page
  function renderCart() {
    const container = document.querySelector('.cart-items');
    const cart = getCart();
    if (!container) return;
    container.innerHTML = '';

    if (cart.length === 0) {
      container.innerHTML = '<p class="empty">Your cart is empty.</p>';
      updateSummary(0);
      return;
    }

    cart.forEach(item => {
      const el = document.createElement('div');
      el.className = 'cart-item';
      el.innerHTML = `
        <img src="${item.img || 'img/img-placeholder.png'}" alt="${item.title}">
        <div class="item-details">
          <h3>${item.title}</h3>
          <p class="description">${item.description || ''}</p>
          <p class="price">${formatCurrency(item.price)}</p>
        </div>
        <div class="item-quantity">
          <button class="qty-decrease">-</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-increase">+</button>
        </div>
        <div class="item-total">
          <p class="item-total-text">${formatCurrency(item.price * item.qty)}</p>
        </div>
        <button class="remove-item">Remove</button>
      `;

      el.querySelector('.remove-item').addEventListener('click', () => removeFromCart(item.id));
      el.querySelector('.qty-decrease').addEventListener('click', () => changeQty(item.id, -1));
      el.querySelector('.qty-increase').addEventListener('click', () => changeQty(item.id, +1));

      container.appendChild(el);
    });

    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    updateSummary(subtotal);
  }

  function updateSummary(subtotal) {
    const SHIPPING = 9.99;
    const TAX_RATE = 0.08;
    const shipping = subtotal > 0 ? SHIPPING : 0;
    const tax = subtotal * TAX_RATE;
    const total = subtotal + shipping + tax;

    const elSubtotal = document.getElementById('subtotal-value');
    const elShipping = document.getElementById('shipping-value');
    const elTax = document.getElementById('tax-value');
    const elTotal = document.getElementById('total-value');

    if (elSubtotal) elSubtotal.textContent = formatCurrency(subtotal);
    if (elShipping) elShipping.textContent = formatCurrency(shipping);
    if (elTax) elTax.textContent = formatCurrency(tax);
    if (elTotal) elTotal.textContent = formatCurrency(total);
  }

  // Attach event listeners on products page
  function wireProductButtons() {
    const buttons = document.querySelectorAll('.add-to-cart');
    if (!buttons || buttons.length === 0) return;
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const productEl = btn.closest('.product-item');
        if (!productEl) return;
        const title = (productEl.querySelector('h3') || {}).textContent || 'Product';
        const priceText = (productEl.querySelector('.price') || {}).textContent || '0';
        const img = (productEl.querySelector('img') || {}).getAttribute('src') || '';
        const description = (productEl.querySelector('.description') || {}).textContent || '';
        const price = parsePrice(priceText);
        const id = makeIdFromTitle(title);

        addToCart({ id, title, price, img, description, qty: 1 });
        alert(`${title} added to cart`);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.replace(/^.*[\\/]/, '');
    if (path === 'login.html') {
      updateLogoutLink();
      updateWelcome();
      wireLoginForm();
      return;
    }

    // Setup session checker for all authenticated pages
    setupSessionChecker();

    if (!isAuthenticated()) {
      window.location.href = 'login.html';
      return;
    }

    updateLogoutLink();
    updateWelcome();
    wireLogout();
    
    // Initialize cart functionality
    wireProductButtons();
    updateCartCount();
    // If on cart page, render
    if (document.querySelector('.cart-items')) {
      renderCart();
    }
  });

  function wireLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = (document.getElementById('username') || {}).value || '';
      const pass = (document.getElementById('password') || {}).value || '';
      if (user === CREDENTIALS.username && pass === CREDENTIALS.password) {
        setAuthenticated(true, user);
        window.location.href = 'index.html';
      } else {
        alert('Invalid credentials. Use username: ' + CREDENTIALS.username + ' and password: ' + CREDENTIALS.password);
      }
    });
  }

  function wireLogout() {
    const link = document.getElementById('logout-link');
    if (!link) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      setAuthenticated(false);
      window.location.href = 'login.html';
    });
  }

})();