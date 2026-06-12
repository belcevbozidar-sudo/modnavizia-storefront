// local_app.js - Brain of the local static prestorebg.com clone

// Local Cart State
let cart = JSON.parse(localStorage.getItem('prestore_cart')) || [];
let productsData = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load products database
  try {
    const res = await fetch('/products.json');
    productsData = await res.json();
  } catch (err) {
    console.error('Error loading products.json:', err);
  }

  // Set up global elements & interception
  setupNetworkInterception();
  setupGlobalCartDrawer();
  setupMobileMenu();
  setupSearch();
  updateGlobalCartBadges();

  // Run page-specific logic
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  
  if (path.includes('product.html')) {
    const interval = setInterval(() => {
      if (productsData.length > 0) {
        clearInterval(interval);
        const defaultHandle = productsData[0].handle;
        initProductPage(params.get('handle') || defaultHandle);
      }
    }, 50);
  } else if (path.includes('collection.html')) {
    initCollectionPage(params.get('c') || 'men');
  } else if (path.includes('policy.html')) {
    initPolicyPage(params.get('p') || 'privacy-policy');
  } else {
    initHomepageProducts();
  }
});

// Monkey patch window.fetch to capture Shopify cart & search API calls
function setupNetworkInterception() {
  const originalFetch = window.fetch;
  window.fetch = async function(resource, init) {
    const url = typeof resource === 'string' ? resource : resource.url;
    
    // Intercept Cart Add
    if (url.includes('/cart/add.js') || url.includes('/cart/add')) {
      let variantId = null;
      let qty = 1;
      
      // Parse request body
      if (init && init.body) {
        if (init.body instanceof FormData) {
          variantId = init.body.get('id');
          qty = parseInt(init.body.get('quantity') || '1');
        } else if (typeof init.body === 'string') {
          try {
            const parsed = JSON.parse(init.body);
            if (parsed.items && parsed.items[0]) {
              variantId = parsed.items[0].id;
              qty = parsed.items[0].quantity || 1;
            } else if (parsed.id) {
              variantId = parsed.id;
              qty = parsed.quantity || 1;
            }
          } catch(e) {}
        }
      }
      
      // Add item to local cart
      if (variantId) {
        // Find product variant
        let matchedProduct = null;
        let selectedSize = '42'; // default fallback size
        
        // Find product that matches variantId
        // In our products.json, we map sizes.
        // Let's find the active product handle from the product page or match from database
        const urlParams = new URLSearchParams(window.location.search);
        const activeHandle = urlParams.get('handle') || 'nike-air-max-tuned-1-manchester';
        matchedProduct = productsData.find(p => p.handle === activeHandle || p.sizes.includes(variantId.toString()));
        
        if (!matchedProduct) {
          // Fallback to first product
          matchedProduct = productsData[0];
        }
        
        if (variantId.toString().length < 5) {
          selectedSize = variantId.toString(); // size number
        }

        addToLocalCart(matchedProduct, selectedSize, qty);
      }
      
      // Return mock successful cart response
      const mockResponse = {
        id: variantId || 99999,
        quantity: qty,
        title: "Nike Sneaker",
        price: 18999
      };
      
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Intercept Cart State fetch
    if (url.includes('/cart.js') || url.includes('/cart')) {
      if (init && init.method === 'POST') {
        // quantity changes
      }
      
      const totalCost = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const mockCart = {
        item_count: cart.reduce((sum, item) => sum + item.quantity, 0),
        total_price: totalCost * 100, // Shopify expects cents
        items: cart.map(item => ({
          id: item.variant_id,
          title: `${item.title} - ${item.size}`,
          price: item.price * 100,
          quantity: item.quantity,
          image: item.image,
          handle: item.handle
        }))
      };
      return new Response(JSON.stringify(mockCart), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Intercept Search Suggestions
    if (url.includes('/search/suggest')) {
      const urlObj = new URL(url, window.location.origin);
      const query = (urlObj.searchParams.get('q') || '').toLowerCase().trim();
      const matches = productsData.filter(p => p.title.toLowerCase().includes(query)).slice(0, 5);
      
      const mockSuggestions = {
        resources: {
          results: {
            products: matches.map(p => ({
              title: p.title,
              url: `/product.html?handle=${p.handle}`,
              image: p.images[0],
              price: `${p.price.toFixed(2)} лв.`
            }))
          }
        }
      };
      return new Response(JSON.stringify(mockSuggestions), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return originalFetch.apply(this, arguments);
  };
}

// Local Cart Management
function addToLocalCart(product, size, qty) {
  const existingIndex = cart.findIndex(item => item.handle === product.handle && item.size === size);
  if (existingIndex > -1) {
    cart[existingIndex].quantity += qty;
  } else {
    cart.push({
      handle: product.handle,
      title: product.title,
      image: product.images[0],
      price: product.price,
      size: size,
      quantity: qty,
      variant_id: Math.floor(100000 + Math.random() * 900000)
    });
  }
  saveCart();
  updateGlobalCartBadges();
  renderLocalCartDrawer();
  openCartDrawer();
}

function updateLocalQuantity(handle, size, delta) {
  const idx = cart.findIndex(item => item.handle === handle && item.size === size);
  if (idx === -1) return;
  cart[idx].quantity += delta;
  if (cart[idx].quantity <= 0) {
    cart.splice(idx, 1);
  }
  saveCart();
  updateGlobalCartBadges();
  renderLocalCartDrawer();
}

function saveCart() {
  localStorage.setItem('prestore_cart', JSON.stringify(cart));
}

// Update Cart Badges across Header elements
function updateGlobalCartBadges() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  // Find all badge count texts
  const badges = document.querySelectorAll('.cart-bubble__text-count, .cart-badge');
  badges.forEach(b => {
    b.innerText = count;
    if (count > 0) {
      b.classList.remove('hidden');
      b.parentElement.parentElement.classList.remove('visually-hidden');
    } else {
      b.classList.add('hidden');
    }
  });
}

// Open/Close Cart Drawer Natively
function openCartDrawer() {
  const dialog = document.querySelector('dialog.cart-drawer__dialog');
  if (dialog) {
    dialog.setAttribute('open', '');
    dialog.classList.remove('cart-drawer--empty');
  }
}

function closeCartDrawer() {
  const dialog = document.querySelector('dialog.cart-drawer__dialog');
  if (dialog) {
    dialog.removeAttribute('open');
  }
}

// Intercept clicks on original theme buttons to trigger drawers
function setupGlobalCartDrawer() {
  // Catch close button clicks
  document.addEventListener('click', (e) => {
    // Check if clicked cart button
    const btn = e.target.closest('button');
    if (btn && (btn.getAttribute('on:click') === '/open' || btn.querySelector('cart-icon'))) {
      e.preventDefault();
      e.stopPropagation();
      renderLocalCartDrawer();
      openCartDrawer();
    }
    
    // Check if clicked close cart button
    if (btn && btn.getAttribute('on:click') === 'cart-drawer-component/close') {
      e.preventDefault();
      closeCartDrawer();
    }
    
    // Check if clicked cart backdrop/overlay
    if (e.target.classList.contains('cart-drawer__dialog') && e.target.hasAttribute('open')) {
      closeCartDrawer();
    }
  });

  // Render original initial load
  renderLocalCartDrawer();
}

// Mobile Hamburger Menu Activation
function setupMobileMenu() {
  const headerDrawer = document.querySelector('header-drawer');
  if (!headerDrawer) return;

  const details = headerDrawer.querySelector('details');
  const summary = headerDrawer.querySelector('summary');
  const closeBtn = headerDrawer.querySelector('.menu-drawer__close-button');
  const backdrop = headerDrawer.querySelector('.menu-drawer__backdrop');

  if (!details || !summary) return;

  const openMenu = () => {
    details.setAttribute('open', '');
    details.classList.add('menu-open');
    document.body.classList.add('overflow-hidden');
  };

  const closeMenu = () => {
    details.removeAttribute('open');
    details.classList.remove('menu-open');
    document.body.classList.remove('overflow-hidden');
  };

  summary.addEventListener('click', (e) => {
    e.preventDefault();
    if (details.hasAttribute('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu();
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu();
    });
  }
}

// Populate Cart Drawer inner HTML dynamically with local items
function renderLocalCartDrawer() {
  const drawerInner = document.querySelector('.cart-drawer__inner');
  if (!drawerInner) return;
  
  if (cart.length === 0) {
    drawerInner.innerHTML = `
      <div class="cart-drawer__header">
        <h2 class="cart-drawer__title">Количка</h2>
        <button class="button button-unstyled cart-drawer__close" onclick="closeLocalCart()">&times;</button>
      </div>
      <div class="cart-drawer__content" style="text-align: center; padding: 40px 20px;">
        <p>Количката ви е празна</p>
      </div>
    `;
    return;
  }

  const totalCost = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  drawerInner.innerHTML = `
    <div class="cart-drawer__header" style="display:flex; justify-content:space-between; padding:20px; border-bottom:1px solid #eee; align-items:center;">
      <h2 style="font-family:var(--font-heading); text-transform:uppercase; margin:0;">Количка</h2>
      <button style="font-size:24px; cursor:pointer;" onclick="closeLocalCart()">&times;</button>
    </div>
    <div class="cart-drawer__items-wrapper" style="flex-grow:1; overflow-y:auto; padding:20px;">
      ${cart.map(item => `
        <div style="display:grid; grid-template-columns: 80px 1fr; gap:15px; margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid #eee;">
          <img src="${item.image}" style="width:80px; height:80px; object-fit:cover;">
          <div style="display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <h4 style="font-family:var(--font-heading); text-transform:uppercase; font-size:14px; margin:0 0 4px 0;">${item.title}</h4>
              <span style="font-size:12px; color:#666;">Размер: ${item.size}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
              <div style="display:flex; border:1px solid #ccc; align-items:center;">
                <button style="width:24px; height:24px; cursor:pointer;" onclick="updateCartQuantity('${item.handle}', '${item.size}', -1)">-</button>
                <span style="padding:0 8px; font-size:12px;">${item.quantity}</span>
                <button style="width:24px; height:24px; cursor:pointer;" onclick="updateCartQuantity('${item.handle}', '${item.size}', 1)">+</button>
              </div>
              <span style="font-family:var(--font-heading); font-weight:700;">${(item.price * item.quantity).toFixed(2)} лв.</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="padding:20px; border-top:1px solid #eee; background-color:#fafafa;">
      <div style="display:flex; justify-content:space-between; font-family:var(--font-heading); font-weight:700; font-size:18px; margin-bottom:15px;">
        <span>Общо:</span>
        <span>${totalCost.toFixed(2)} лв.</span>
      </div>
      <button onclick="openLocalCheckout()" style="width:100%; padding:14px; background-color:var(--color-primary); color:white; font-family:var(--font-heading); font-weight:700; text-transform:uppercase; cursor:pointer; font-size:14px; text-align:center;">Завърши поръчката</button>
    </div>
  `;
}

// Global hooks for onClick handlers in rendered drawer
window.closeLocalCart = () => {
  closeCartDrawer();
};

window.updateCartQuantity = (handle, size, delta) => {
  updateLocalQuantity(handle, size, delta);
};

window.openLocalCheckout = () => {
  closeCartDrawer();
  injectCheckoutModal();
};

// Checkout Modal Implementation
function injectCheckoutModal() {
  // Check if modal already exists
  let modal = document.getElementById('local-checkout-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'local-checkout-modal';
    modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background-color:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';
    document.body.appendChild(modal);
  }
  
  const totalCost = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  modal.innerHTML = `
    <div style="background-color:white; padding:30px; max-width:500px; width:100%; box-shadow:0 4px 20px rgba(0,0,0,0.25); display:flex; flex-direction:column; position:relative;">
      <button onclick="closeCheckoutModal()" style="position:absolute; top:15px; right:15px; font-size:24px; cursor:pointer;">&times;</button>
      <h2 style="font-family:var(--font-heading); text-transform:uppercase; margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:10px;">Поръчка с наложен платеж</h2>
      <form id="local-checkout-form" onsubmit="submitLocalCheckout(event)">
        <div style="margin-bottom:15px;">
          <label style="display:block; font-size:12px; font-weight:600; text-transform:uppercase; margin-bottom:4px;">Име и Фамилия</label>
          <input type="text" id="check-name" required placeholder="Иван Иванов" style="width:100%; padding:10px; border:1px solid #ccc;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; font-size:12px; font-weight:600; text-transform:uppercase; margin-bottom:4px;">Телефон за връзка</label>
          <input type="tel" id="check-phone" required placeholder="08XXXXXXXX" style="width:100%; padding:10px; border:1px solid #ccc;">
        </div>
        <div style="margin-bottom:15px;">
          <label style="display:block; font-size:12px; font-weight:600; text-transform:uppercase; margin-bottom:4px;">Куриер</label>
          <select id="check-courier" style="width:100%; padding:10px; border:1px solid #ccc;">
            <option value="Еконт (офис)">Еконт (до офис)</option>
            <option value="Спиди (офис)">Спиди (до офис)</option>
            <option value="Адрес">До адрес</option>
          </select>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
          <div>
            <label style="display:block; font-size:12px; font-weight:600; text-transform:uppercase; margin-bottom:4px;">Град</label>
            <input type="text" id="check-city" required placeholder="София" style="width:100%; padding:10px; border:1px solid #ccc;">
          </div>
          <div>
            <label style="display:block; font-size:12px; font-weight:600; text-transform:uppercase; margin-bottom:4px;">Офис / Адрес</label>
            <input type="text" id="check-office" required placeholder="офис Централен" style="width:100%; padding:10px; border:1px solid #ccc;">
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:700; margin-bottom:20px; font-size:16px;">
          <span>Обща сума:</span>
          <span>${totalCost.toFixed(2)} лв.</span>
        </div>
        <button type="submit" style="width:100%; padding:14px; background-color:var(--color-primary); color:white; font-family:var(--font-heading); font-weight:700; text-transform:uppercase; cursor:pointer; font-size:14px;">Потвърди поръчката</button>
      </form>
    </div>
  `;
  modal.style.display = 'flex';
}

window.closeCheckoutModal = () => {
  const modal = document.getElementById('local-checkout-modal');
  if (modal) modal.style.display = 'none';
};

window.submitLocalCheckout = (e) => {
  e.preventDefault();
  const phone = document.getElementById('check-phone').value;
  const courier = document.getElementById('check-courier').value;
  const city = document.getElementById('check-city').value;
  const office = document.getElementById('check-office').value;
  const totalCost = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const orderNum = Math.floor(100000 + Math.random() * 900000);

  const modal = document.getElementById('local-checkout-modal');
  modal.innerHTML = `
    <div style="background-color:white; padding:40px; max-width:500px; width:100%; box-shadow:0 4px 20px rgba(0,0,0,0.25); text-align:center;">
      <div style="font-size:48px; color:green; margin-bottom:15px;">✔</div>
      <h2 style="font-family:var(--font-heading); text-transform:uppercase; margin-bottom:10px;">Поръчката е приета!</h2>
      <h3 style="font-size:16px; margin-bottom:15px;">Номер на поръчка: #${orderNum}</h3>
      <p style="font-size:14px; color:#555; line-height:1.5; margin-bottom:20px;">
        Благодарим ви! Записахме поръчката ви на обща стойност <strong>${totalCost.toFixed(2)} лв.</strong>. Представител ще ви позвъни на телефон <strong>${phone}</strong> за окончателно потвърждение преди изпращане до <strong>${city} (${courier} ${office})</strong>.
      </p>
      <button onclick="completeCheckoutFlow()" style="padding:12px 24px; background-color:var(--color-primary); color:white; font-family:var(--font-heading); font-weight:700; text-transform:uppercase; cursor:pointer;">Към магазина</button>
    </div>
  `;
};

window.completeCheckoutFlow = () => {
  cart = [];
  saveCart();
  updateGlobalCartBadges();
  renderLocalCartDrawer();
  closeCheckoutModal();
  window.location.href = '/index.html';
};

// Search Autocomplete Interceptor
function setupSearch() {
  const searchBtn = document.querySelector('button[aria-label="Отваряне на търсенето"]');
  const searchDialog = document.querySelector('dialog#search-modal');
  
  if (searchBtn && searchDialog) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      searchDialog.setAttribute('open', '');
    });
  }

  // Intercept closes
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('button');
    if (closeBtn && closeBtn.getAttribute('on:click') === '/closeDialogOnClickOutside') {
      searchDialog.removeAttribute('open');
    }
  });

  const searchInput = document.getElementById('cmdk-input');
  if (searchInput) {
    // We override search input
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const resultsDiv = document.getElementById('predictive-search-results') || document.querySelector('.predictive-search');
      
      if (query.length < 2) {
        if (resultsDiv) resultsDiv.innerHTML = '';
        return;
      }
      
      const matches = productsData.filter(p => p.title.toLowerCase().includes(query)).slice(0, 5);
      if (resultsDiv) {
        if (matches.length === 0) {
          resultsDiv.innerHTML = '<div style="padding:20px; text-align:center;">Няма намерени продукти.</div>';
          return;
        }
        
        resultsDiv.innerHTML = `
          <div style="padding:10px;">
            ${matches.map(p => `
              <a href="/product.html?handle=${p.handle}" style="display:flex; align-items:center; gap:15px; padding:10px 0; border-bottom:1px solid #eee; text-decoration:none; color:inherit;">
                <img src="${p.images[0]}" style="width:40px; height:40px; object-fit:cover;">
                <span style="font-family:var(--font-heading); text-transform:uppercase; font-size:14px; font-weight:600;">${p.title}</span>
                <span style="margin-left:auto; font-family:var(--font-heading); font-weight:700;">${p.price.toFixed(2)} лв.</span>
              </a>
            `).join('')}
          </div>
        `;
      }
    });
  }
}


// ================= PAGE IMPLEMENTATIONS =================

// DYNAMIC SNEAKER DETAIL PAGE
function initProductPage(handle) {
  const interval = setInterval(() => {
    if (productsData.length > 0) {
      clearInterval(interval);
      
      const product = productsData.find(p => p.handle === handle);
      if (!product) return;
      
      // 1. Replace Title
      const h1 = document.querySelector('h1');
      if (h1) h1.innerText = product.title;
      
      // 2. Replace Prices
      const priceItems = document.querySelectorAll('.price');
      priceItems.forEach(item => {
        item.innerText = `${product.price.toFixed(2)} лв.`;
      });
      const compPriceItems = document.querySelectorAll('.compare-at-price');
      compPriceItems.forEach(item => {
        if (product.compare_at_price > 0) {
          item.innerText = `${product.compare_at_price.toFixed(2)} лв.`;
          item.parentElement.classList.remove('hidden');
        } else {
          item.parentElement.classList.add('hidden');
        }
      });
      
      // 3. Replace Description
      // The characteristics details tag has text like "Характеристики на продукта"
      const descContents = document.querySelectorAll('details');
      descContents.forEach(det => {
        const sum = det.querySelector('summary');
        if (sum && sum.innerText.includes('Характеристики')) {
          const contentDiv = det.querySelector('div, p');
          if (contentDiv) {
            contentDiv.innerHTML = product.description || 'Характеристиките не са заредени.';
          }
        }
      });
      
      // 4. Replace Images
      const mediaGallery = document.querySelector('media-gallery');
      if (mediaGallery) {
        // Swap all image srcs
        const imgs = mediaGallery.querySelectorAll('img');
        imgs.forEach((img, idx) => {
          if (product.images[idx]) {
            img.src = product.images[idx];
            img.srcset = product.images[idx];
          } else if (product.images[0]) {
            img.src = product.images[0];
            img.srcset = product.images[0];
          }
        });
      }
      
      // 5. Replace Sizes
      const variantPicker = document.querySelector('variant-picker');
      if (variantPicker) {
        // Find fieldsets or size options
        const fieldset = variantPicker.querySelector('fieldset');
        if (fieldset) {
          const legend = fieldset.querySelector('legend');
          const legendText = legend ? legend.innerHTML : 'Размер';
          
          fieldset.innerHTML = `
            <legend>${legendText}</legend>
            <div style="display:grid; grid-template-columns: repeat(6, 1fr); gap:8px; margin-top:10px;">
              ${product.sizes.map(size => `
                <label style="border:1px solid #ccc; padding:10px; text-align:center; cursor:pointer; font-family:var(--font-heading); font-weight:700;">
                  <input type="radio" name="Size" value="${size}" style="display:none;" onchange="selectSize(this)">
                  <span>${size}</span>
                </label>
              `).join('')}
            </div>
          `;
        }
      }
    }
  }, 50);
}

window.selectSize = (radio) => {
  // Clear other active labels
  const labels = radio.parentElement.parentElement.querySelectorAll('label');
  labels.forEach(l => {
    l.style.backgroundColor = 'white';
    l.style.color = 'black';
  });
  
  // Set active
  const activeLabel = radio.parentElement;
  activeLabel.style.backgroundColor = 'black';
  activeLabel.style.color = 'white';
};

// Helper to populate cloned product card template from the theme
function renderProductCardFromTemplate(templateLi, product) {
  const clone = templateLi.cloneNode(true);
  
  // 1. Update links
  const links = clone.querySelectorAll('a');
  links.forEach(link => {
    // Keep target variant parameter if present or simplify
    link.href = `/product.html?handle=${product.handle}`;
  });
  
  // 2. Update titles
  // Update all instances of title text inside the card
  const titleBlocks = clone.querySelectorAll('.text-block p, .product-grid-view-zoom-out--details h3, h3, h4');
  titleBlocks.forEach(tag => {
    // Replace text inside the paragraph or tag
    tag.innerText = product.title;
  });
  
  // 3. Update images
  const imgs = clone.querySelectorAll('img');
  imgs.forEach((img, idx) => {
    const imgUrl = product.images[idx] || product.images[0];
    if (imgUrl) {
      img.src = imgUrl;
      img.srcset = `${imgUrl} 1x, ${imgUrl} 2x`;
    }
  });
  
  // 4. Update prices
  const prices = clone.querySelectorAll('.price');
  prices.forEach(priceSpan => {
    priceSpan.innerText = `${product.price.toFixed(2)} лв.`;
  });
  
  // 5. Update compare-at-price if exists, or hide it
  const comparePrices = clone.querySelectorAll('.compare-at-price');
  comparePrices.forEach(compSpan => {
    if (product.compare_at_price > product.price) {
      compSpan.innerText = `${product.compare_at_price.toFixed(2)} лв.`;
      compSpan.parentElement.classList.remove('hidden');
    } else {
      compSpan.parentElement.classList.add('hidden');
    }
  });

  // 6. Update product form fields if quick add is present
  const prodIdInputs = clone.querySelectorAll('input[name="product-id"]');
  prodIdInputs.forEach(input => {
    input.value = product.handle; // mock id
  });
  
  return clone;
}

// DYNAMIC COLLECTION LISTING
function initCollectionPage(category) {
  const titleMap = {
    'men': 'Мъжки Обувки',
    'women': 'Дамски Обувки',
    'sale': 'Разпродажба',
    'all': 'Всички Продукти'
  };

  // Replace Title in Collection Header
  const titleTag = document.querySelector('.collection-hero__title, h1');
  if (titleTag) {
    titleTag.innerText = titleMap[category] || 'Колекция';
  }

  const interval = setInterval(() => {
    if (productsData.length > 0) {
      clearInterval(interval);
      
      let filtered = productsData.filter(p => p.categories.includes(category));
      if (category === 'sale') {
        filtered = productsData.filter(p => p.compare_at_price > p.price);
      }
      if (category === 'all') {
        filtered = productsData;
      }
      
      // Update count span
      const countSpans = document.querySelectorAll('.collection-product-count, #ProductCount, .count');
      countSpans.forEach(s => {
        s.innerText = `${filtered.length} продукта`;
      });
      
      // Replace Grid Items
      const gridUl = document.querySelector('.product-grid, ul[ref="grid"]');
      if (gridUl) {
        const templateLi = gridUl.querySelector('li');
        
        if (filtered.length === 0) {
          gridUl.innerHTML = '<li style="grid-column: 1/-1; text-align:center; padding:50px 0;">Няма налични продукти.</li>';
          return;
        }
        
        if (templateLi) {
          const templateClone = templateLi.cloneNode(true);
          gridUl.innerHTML = '';
          filtered.forEach(p => {
            const cardLi = renderProductCardFromTemplate(templateClone, p);
            gridUl.appendChild(cardLi);
          });
        } else {
          // Fallback to simplified structure if list is empty
          gridUl.innerHTML = filtered.map(p => `
            <li class="product-grid__item" style="list-style:none;">
              <div style="border: 1px solid #eee; padding:10px; display:flex; flex-direction:column; position:relative; background-color:#fff;">
                <a href="/product.html?handle=${p.handle}" style="display:block; aspect-ratio:1; overflow:hidden; position:relative;">
                  ${p.compare_at_price > p.price ? `<span style="position:absolute; top:10px; left:10px; background-color:var(--color-primary); color:white; padding:4px 8px; font-family:var(--font-heading); font-size:10px; font-weight:700; z-index:2;">НАМАЛЕНИЕ</span>` : ''}
                  <img src="${p.images[0]}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.4s ease;" onmouseover="this.src='${p.images[1] || p.images[0]}'" onmouseout="this.src='${p.images[0]}'">
                </a>
                <div style="padding:10px 0 0 0; display:flex; flex-direction:column; gap:4px;">
                  <h4 style="font-family:var(--font-heading); font-size:15px; text-transform:uppercase; margin:0; line-height:1.2; height:36px; overflow:hidden;">
                    <a href="/product.html?handle=${p.handle}" style="text-decoration:none; color:inherit;">${p.title}</a>
                  </h4>
                  <div style="display:flex; align-items:center; gap:10px; font-family:var(--font-heading); font-size:16px;">
                    <span style="font-weight:700; color:var(--color-foreground);">${p.price.toFixed(2)} лв.</span>
                    ${p.compare_at_price > p.price ? `<span style="text-decoration:line-through; color:#999; font-size:13px;">${p.compare_at_price.toFixed(2)} лв.</span>` : ''}
                  </div>
                </div>
              </div>
            </li>
          `).join('');
        }
      }
    }
  }, 50);
}

// DYNAMIC POLICY PAGES
function initPolicyPage(policyKey) {
  const titleMap = {
    'privacy-policy': 'Правила за повелителност',
    'refund-policy': 'Правила за възстановяване на суми',
    'terms-of-service': 'Условия за използване на услугата',
    'contact-information': 'Информация за контакт'
  };

  const titleTag = document.querySelector('.shopify-policy__title h1, h1');
  if (titleTag) {
    titleTag.innerText = titleMap[policyKey] || 'Политика';
  }

  const container = document.querySelector('.shopify-policy__body, .policy-content');
  if (!container) return;

  fetch('/policies.json')
    .then(res => res.json())
    .then(data => {
      const policy = data[policyKey];
      if (policy && policy.paragraphs) {
        container.innerHTML = policy.paragraphs.map(p => `<p style="margin-bottom:15px; line-height:1.6; font-size:14px; color:#555;">${p}</p>`).join('');
      }
    });
}

// Helper to populate cloned slide template from the theme on the homepage
function renderHomepageSlideFromTemplate(templateSlide, product) {
  const clone = templateSlide.cloneNode(true);
  
  // 1. Update links
  const links = clone.querySelectorAll('a');
  links.forEach(link => {
    link.href = `/product.html?handle=${product.handle}`;
  });
  
  // 2. Update title
  const title = clone.querySelector('.featured-title-template--25186112897409__ss_featured_collection_22_hxe88A, h3');
  if (title) {
    title.innerText = product.title;
  }
  
  // 3. Update price
  const priceWrapper = clone.querySelector('.featured-price-template--25186112897409__ss_featured_collection_22_hxe88A');
  if (priceWrapper) {
    if (product.compare_at_price > product.price) {
      priceWrapper.innerHTML = `
        <p class="featured-regular-price-template--25186112897409__ss_featured_collection_22_hxe88A" style="color:var(--color-primary); font-weight:700;">${product.price.toFixed(2)} лв.</p>
        <p class="featured-compare-price-template--25186112897409__ss_featured_collection_22_hxe88A" style="text-decoration:line-through; color:#999; font-size:13px; margin-left:8px; display:inline-block;">${product.compare_at_price.toFixed(2)} лв.</p>
      `;
    } else {
      priceWrapper.innerHTML = `
        <p class="featured-regular-price-template--25186112897409__ss_featured_collection_22_hxe88A">${product.price.toFixed(2)} лв.</p>
      `;
    }
  }
  
  // 4. Update image gallery
  const galleryWrapper = clone.querySelector('.product-gallery-swiper .swiper-wrapper');
  if (galleryWrapper && product.images && product.images.length > 0) {
    galleryWrapper.innerHTML = product.images.map(imgUrl => `
      <div class="swiper-slide">
        <img src="${imgUrl}" alt="${product.title}" srcset="${imgUrl} 400w, ${imgUrl} 600w, ${imgUrl} 800w" width="1000" height="1250" loading="lazy">
      </div>
    `).join('');
  }
  
  return clone;
}

// DYNAMIC HOMEPAGE PRODUCTS SLIDER
function initHomepageProducts() {
  const interval = setInterval(() => {
    if (productsData.length > 0) {
      clearInterval(interval);
      
      const sliderWrapper = document.querySelector('.featured-slider-template--25186112897409__ss_featured_collection_22_hxe88A .swiper-wrapper');
      if (sliderWrapper) {
        const templateSlide = sliderWrapper.querySelector('.swiper-slide');
        if (templateSlide) {
          const templateClone = templateSlide.cloneNode(true);
          sliderWrapper.innerHTML = '';
          
          // Render first 15 products from productsData on the homepage
          const limitProducts = productsData.slice(0, 15);
          limitProducts.forEach(p => {
            const slide = renderHomepageSlideFromTemplate(templateClone, p);
            sliderWrapper.appendChild(slide);
          });
          
          // Reinitialize or update swiper if available
          const swiperEl = document.querySelector('.featured-slider-template--25186112897409__ss_featured_collection_22_hxe88A');
          if (swiperEl && swiperEl.swiper) {
            swiperEl.swiper.update();
          }
        }
      }
    }
  }, 50);
}
