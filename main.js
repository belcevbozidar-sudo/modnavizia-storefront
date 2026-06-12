// Global State
let cart = JSON.parse(localStorage.getItem('prestore_cart')) || [];
let productsData = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load products data
  try {
    const res = await fetch('/products.json');
    productsData = await res.json();
  } catch (err) {
    console.error('Error loading products data:', err);
  }

  // Setup Global Listeners & UI
  setupHeaderScroll();
  setupDrawersAndModals();
  setupSearch();
  updateCartUI();

  // Run Page-Specific Code
  if (document.getElementById('homepage-marker')) {
    initHomepage();
  } else if (document.getElementById('product-detail-marker')) {
    initProductDetail();
  } else if (document.getElementById('collection-marker')) {
    initCollection();
  } else if (document.getElementById('policy-marker')) {
    initPolicy();
  }
});

// Toast / Notification System
function showToast(message) {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✔</span> <span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// Header Scroll Effect
function setupHeaderScroll() {
  const header = document.querySelector('header');
  let lastScroll = 0;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 50) {
      header.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.08)';
      header.style.padding = '4px 0';
    } else {
      header.style.boxShadow = 'none';
      header.style.padding = '0';
    }
    lastScroll = currentScroll;
  });
}

// Drawers and Modals
function setupDrawersAndModals() {
  const cartBtn = document.getElementById('cart-btn');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartBackdrop = document.getElementById('cart-backdrop');
  const cartClose = document.getElementById('cart-close');
  
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenuDrawer = document.getElementById('mobile-menu-drawer');
  const mobileMenuBackdrop = document.getElementById('mobile-menu-backdrop');
  const mobileMenuClose = document.getElementById('mobile-menu-close');

  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutModal = document.getElementById('checkout-modal');
  const checkoutClose = document.getElementById('checkout-close');
  const checkoutForm = document.getElementById('checkout-form');
  
  // Cart Drawer
  if (cartBtn && cartDrawer) {
    cartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      cartDrawer.classList.add('active');
      cartBackdrop.classList.add('active');
    });
  }
  
  const closeCart = () => {
    cartDrawer.classList.remove('active');
    cartBackdrop.classList.remove('active');
  };
  
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener('click', closeCart);

  // Mobile Menu Drawer
  if (mobileMenuBtn && mobileMenuDrawer) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      mobileMenuDrawer.classList.add('active');
      mobileMenuBackdrop.classList.add('active');
    });
  }
  
  const closeMobileMenu = () => {
    mobileMenuDrawer.classList.remove('active');
    mobileMenuBackdrop.classList.remove('active');
  };
  
  if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMobileMenu);
  if (mobileMenuBackdrop) mobileMenuBackdrop.addEventListener('click', closeMobileMenu);

  // Checkout Modal
  if (checkoutBtn && checkoutModal) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) return;
      closeCart();
      checkoutModal.classList.add('active');
    });
  }
  
  const closeCheckout = () => {
    checkoutModal.classList.remove('active');
  };
  
  if (checkoutClose) checkoutClose.addEventListener('click', closeCheckout);
  
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      processCheckout();
    });
  }
}

// Search Functionality
function setupSearch() {
  const searchBtn = document.getElementById('search-btn');
  const searchBtnMobile = document.getElementById('search-btn-mobile');
  const searchOverlay = document.getElementById('search-overlay');
  const searchClose = document.getElementById('search-close');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  const openSearch = (e) => {
    e.preventDefault();
    searchOverlay.classList.add('active');
    setTimeout(() => searchInput.focus(), 100);
  };

  if (searchBtn) searchBtn.addEventListener('click', openSearch);
  if (searchBtnMobile) searchBtnMobile.addEventListener('click', openSearch);
  
  if (searchClose) {
    searchClose.addEventListener('click', () => {
      searchOverlay.classList.remove('active');
      searchInput.value = '';
      searchResults.innerHTML = '';
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
      }

      // Filter products
      const matches = productsData.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.handle.toLowerCase().includes(query)
      ).slice(0, 6);

      if (matches.length === 0) {
        searchResults.innerHTML = '<div class="cart-empty">Няма намерени продукти</div>';
        return;
      }

      searchResults.innerHTML = `
        <div class="search-results-list">
          ${matches.map(p => `
            <a href="/product.html?handle=${p.handle}" class="search-result-item">
              <img src="${p.images[0]}" class="search-result-img" alt="${p.title}">
              <div class="search-result-title">${p.title}</div>
              <div class="search-result-price">${p.price.toFixed(2)} лв.</div>
            </a>
          `).join('')}
        </div>
      `;
    });
  }
}

// Cart Actions
function addToCart(handle, size) {
  const product = productsData.find(p => p.handle === handle);
  if (!product) return;

  const existingItemIndex = cart.findIndex(item => item.handle === handle && item.size === size);
  
  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += 1;
  } else {
    cart.push({
      handle: product.handle,
      title: product.title,
      image: product.images[0],
      price: product.price,
      size: size,
      quantity: 1
    });
  }

  saveCart();
  updateCartUI();
  showToast(`Добавено в количката: ${product.title} (Размер ${size})`);
  
  // Open cart drawer automatically
  document.getElementById('cart-drawer').classList.add('active');
  document.getElementById('cart-backdrop').classList.add('active');
}

function updateQuantity(handle, size, delta) {
  const itemIndex = cart.findIndex(item => item.handle === handle && item.size === size);
  if (itemIndex === -1) return;

  cart[itemIndex].quantity += delta;
  
  if (cart[itemIndex].quantity <= 0) {
    cart.splice(itemIndex, 1);
  }

  saveCart();
  updateCartUI();
}

function removeFromCart(handle, size) {
  const itemIndex = cart.findIndex(item => item.handle === handle && item.size === size);
  if (itemIndex === -1) return;

  cart.splice(itemIndex, 1);
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('prestore_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const cartBadge = document.getElementById('cart-badge');
  const cartBadgeMobile = document.getElementById('cart-badge-mobile');
  const cartDrawerItems = document.getElementById('cart-drawer-items');
  const cartSubtotal = document.getElementById('cart-subtotal');
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Update badges
  if (cartBadge) cartBadge.innerText = totalItems;
  if (cartBadgeMobile) cartBadgeMobile.innerText = totalItems;

  // Update drawer contents
  if (cart.length === 0) {
    cartDrawerItems.innerHTML = `
      <div class="cart-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <p style="margin-top: 10px;">Количката ви е празна</p>
      </div>
    `;
    cartSubtotal.innerText = '0.00 лв.';
    return;
  }

  cartDrawerItems.innerHTML = `
    <div class="cart-items-list">
      ${cart.map(item => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.title}" class="cart-item-img">
          <div class="cart-item-details">
            <div>
              <a href="/product.html?handle=${item.handle}" class="cart-item-title">${item.title}</a>
              <div class="cart-item-size">Размер: ${item.size}</div>
            </div>
            <div class="cart-item-actions">
              <div class="quantity-selector">
                <button class="quantity-btn" onclick="globalUpdateQuantity('${item.handle}', '${item.size}', -1)">-</button>
                <input type="text" class="quantity-input" value="${item.quantity}" readonly>
                <button class="quantity-btn" onclick="globalUpdateQuantity('${item.handle}', '${item.size}', 1)">+</button>
              </div>
              <span class="cart-item-remove-btn" onclick="globalRemoveFromCart('${item.handle}', '${item.size}')">Премахни</span>
            </div>
            <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)} лв.</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  cartSubtotal.innerText = `${totalCost.toFixed(2)} лв.`;
}

// Global hooks for onclick handlers in dynamically generated HTML
window.globalUpdateQuantity = (handle, size, delta) => {
  updateQuantity(handle, size, delta);
};

window.globalRemoveFromCart = (handle, size) => {
  removeFromCart(handle, size);
};

// Checkout Processing
function processCheckout() {
  const name = document.getElementById('checkout-name').value;
  const phone = document.getElementById('checkout-phone').value;
  const delivery = document.getElementById('checkout-delivery').value;
  const city = document.getElementById('checkout-city').value;
  const office = document.getElementById('checkout-office').value;
  
  const orderNum = Math.floor(100000 + Math.random() * 900000);
  const totalCost = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Render Success content in modal
  const modalContainer = document.querySelector('#checkout-modal .modal-container');
  modalContainer.innerHTML = `
    <div class="modal-header">
      <h2>Благодарим ви за поръчката!</h2>
    </div>
    <div class="modal-body" style="text-align: center; padding: var(--spacing-xl) var(--spacing-lg);">
      <div style="font-size: 48px; color: var(--color-success); margin-bottom: var(--spacing-md);">✔</div>
      <h3 style="font-family: var(--font-heading); margin-bottom: var(--spacing-sm);">Поръчка #${orderNum} е приета успешно!</h3>
      <p style="margin-bottom: var(--spacing-md); color: var(--color-foreground-muted);">
        Избрахте плащане с <strong>Наложен платеж</strong>. Наш оператор ще се свърже с вас на телефон <strong>${phone}</strong> за потвърждение на доставката до <strong>${city} (${delivery} ${office})</strong>.
      </p>
      <div style="border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); padding: var(--spacing-md) 0; margin-bottom: var(--spacing-lg);">
        <strong style="text-transform: uppercase;">Обща сума: ${totalCost.toFixed(2)} лв.</strong>
      </div>
      <button class="btn btn-primary" onclick="window.location.href='/'">Към началната страница</button>
    </div>
  `;
  
  // Clear cart
  cart = [];
  saveCart();
  updateCartUI();
}

// ================= PAGE INITIALIZERS =================

// HOMEPAGE INITIALIZER
function initHomepage() {
  // Hero Slider
  const slides = document.querySelectorAll('.hero-slide');
  const dotsContainer = document.getElementById('hero-slider-nav');
  let currentSlide = 0;
  let sliderInterval;

  if (slides.length > 0) {
    // Generate dots
    slides.forEach((_, idx) => {
      const dot = document.createElement('div');
      dot.className = `hero-slider-dot ${idx === 0 ? 'active' : ''}`;
      dot.addEventListener('click', () => goToSlide(idx));
      dotsContainer.appendChild(dot);
    });

    const dots = document.querySelectorAll('.hero-slider-dot');

    const goToSlide = (idx) => {
      slides[currentSlide].classList.remove('active');
      dots[currentSlide].classList.remove('active');
      currentSlide = idx;
      slides[currentSlide].classList.add('active');
      dots[currentSlide].classList.add('active');
      resetSliderTimer();
    };

    const nextSlide = () => {
      let next = (currentSlide + 1) % slides.length;
      goToSlide(next);
    };

    const resetSliderTimer = () => {
      clearInterval(sliderInterval);
      sliderInterval = setInterval(nextSlide, 5000);
    };

    resetSliderTimer();
  }

  // Load Featured Collection Grid
  const gridContainer = document.getElementById('featured-products-grid');
  if (gridContainer) {
    // Wait until products load and fetch the 4 featured ones
    const interval = setInterval(() => {
      if (productsData.length > 0) {
        clearInterval(interval);
        
        // Handles to display
        const targetHandles = [
          "nike-air-liquid-max-triple-black-iq7634-003",
          "nike-shox-tl-red-ib1087-600",
          "nike-p-6000-white-elemental-pink-metallic-silver-bv1021-108",
          "nike-shox-tl-pumice-night-maroon-ar3566-200"
        ];
        
        const featured = productsData.filter(p => targetHandles.includes(p.handle));
        
        gridContainer.innerHTML = featured.map(p => `
          <div class="product-card">
            <a href="/product.html?handle=${p.handle}">
              <div class="product-card-image-wrapper">
                ${p.compare_at_price > p.price ? `<span class="product-card-badge">Разпродажба</span>` : ''}
                <img src="${p.images[0]}" alt="${p.title}" class="product-card-image" id="img-${p.handle}">
              </div>
            </a>
            <div class="product-card-info">
              <a href="/product.html?handle=${p.handle}" class="product-card-title">${p.title}</a>
              <div class="product-card-price-container">
                <span class="product-card-price">${p.price.toFixed(2)} лв.</span>
                ${p.compare_at_price > p.price ? `<span class="product-card-compare-price">${p.compare_at_price.toFixed(2)} лв.</span>` : ''}
              </div>
            </div>
          </div>
        `).join('');
        
        // Setup image swapping hover effects
        featured.forEach(p => {
          const card = document.getElementById(`img-${p.handle}`);
          if (card && p.images[1]) {
            card.parentElement.addEventListener('mouseover', () => {
              card.src = p.images[1];
            });
            card.parentElement.addEventListener('mouseout', () => {
              card.src = p.images[0];
            });
          }
        });
      }
    }, 100);
  }
}

// COLLECTION INITIALIZER
function initCollection() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('c') || 'men'; // Default to men
  
  const titleMap = {
    'men': 'Мъжки Обувки',
    'women': 'Дамски Обувки',
    'sale': 'Разпродажба'
  };

  document.getElementById('collection-title').innerText = titleMap[category] || 'Колекция';
  
  const gridContainer = document.getElementById('collection-products-grid');
  const countSpan = document.getElementById('collection-count');
  const sortSelect = document.getElementById('sort-select');

  let filteredProducts = [];

  const interval = setInterval(() => {
    if (productsData.length > 0) {
      clearInterval(interval);
      
      // Filter products based on category
      filteredProducts = productsData.filter(p => p.categories.includes(category));
      
      // If sale, filter compare_at_price
      if (category === 'sale') {
        filteredProducts = productsData.filter(p => p.compare_at_price > p.price);
      }
      
      // Limit collection size for cleaner view if not all products requested
      // The user wants homepage products + a few in men & women
      // So our processed products.json has 30 items total, which is perfect to show fully.
      
      renderGrid();
      
      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          sortProducts(e.target.value);
        });
      }
    }
  }, 100);

  function sortProducts(val) {
    if (val === 'price-low') {
      filteredProducts.sort((a, b) => a.price - b.price);
    } else if (val === 'price-high') {
      filteredProducts.sort((a, b) => b.price - a.price);
    } else {
      // default alphabetical
      filteredProducts.sort((a, b) => a.title.localeCompare(b.title));
    }
    renderGrid();
  }

  function renderGrid() {
    countSpan.innerText = `${filteredProducts.length} продукта`;
    
    if (filteredProducts.length === 0) {
      gridContainer.innerHTML = '<div class="cart-empty" style="grid-column: 1/-1;">Няма налични продукти в тази категория.</div>';
      return;
    }

    gridContainer.innerHTML = filteredProducts.map(p => `
      <div class="product-card">
        <a href="/product.html?handle=${p.handle}">
          <div class="product-card-image-wrapper">
            ${p.compare_at_price > p.price ? `<span class="product-card-badge">Намаление</span>` : ''}
            <img src="${p.images[0]}" alt="${p.title}" class="product-card-image" id="img-${p.handle}">
          </div>
        </a>
        <div class="product-card-info">
          <a href="/product.html?handle=${p.handle}" class="product-card-title">${p.title}</a>
          <div class="product-card-price-container">
            <span class="product-card-price">${p.price.toFixed(2)} лв.</span>
            ${p.compare_at_price > p.price ? `<span class="product-card-compare-price">${p.compare_at_price.toFixed(2)} лв.</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
    
    // Hover effects
    filteredProducts.forEach(p => {
      const card = document.getElementById(`img-${p.handle}`);
      if (card && p.images[1]) {
        card.parentElement.addEventListener('mouseover', () => {
          card.src = p.images[1];
        });
        card.parentElement.addEventListener('mouseout', () => {
          card.src = p.images[0];
        });
      }
    });
  }
}

// PRODUCT DETAIL INITIALIZER
function initProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const handle = params.get('handle') || 'nike-air-max-tuned-1-manchester';
  
  let activeSize = null;
  let selectedProduct = null;

  const interval = setInterval(() => {
    if (productsData.length > 0) {
      clearInterval(interval);
      
      selectedProduct = productsData.find(p => p.handle === handle);
      if (!selectedProduct) {
        document.getElementById('product-detail-container').innerHTML = '<div class="cart-empty">Продуктът не е намерен. <a href="/">Обратно в магазина</a></div>';
        return;
      }

      // Title & Headings
      document.title = `${selectedProduct.title} - Prestorebg`;
      document.getElementById('p-title').innerText = selectedProduct.title;
      
      // Price
      const priceHtml = `
        <span style="color: var(--color-foreground);">${selectedProduct.price.toFixed(2)} лв.</span>
        ${selectedProduct.compare_at_price > selectedProduct.price ? `<span class="product-card-compare-price" style="font-size: 20px; margin-left: 10px;">${selectedProduct.compare_at_price.toFixed(2)} лв.</span>` : ''}
      `;
      document.getElementById('p-price-row').innerHTML = priceHtml;
      
      // Gallery images
      const mainImg = document.getElementById('p-main-img');
      mainImg.src = selectedProduct.images[0];
      mainImg.alt = selectedProduct.title;
      
      const thumbsContainer = document.getElementById('p-thumbnails');
      thumbsContainer.innerHTML = selectedProduct.images.map((img, idx) => `
        <img src="${img}" class="product-gallery-thumb ${idx === 0 ? 'active' : ''}" data-idx="${idx}" alt="${selectedProduct.title} thumbnail">
      `).join('');

      // Click Thumbnails
      document.querySelectorAll('.product-gallery-thumb').forEach(thumb => {
        thumb.addEventListener('click', (e) => {
          document.querySelectorAll('.product-gallery-thumb').forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
          const idx = parseInt(thumb.getAttribute('data-idx'));
          mainImg.src = selectedProduct.images[idx];
        });
      });

      // Sizes Picker
      const sizeGrid = document.getElementById('p-sizes-grid');
      // Available EU sizes list for sneaker styles: standard range if not defined
      const availableSizes = selectedProduct.sizes.length > 0 ? selectedProduct.sizes : ['38', '39', '40', '41', '42', '43', '44', '45', '46'];
      
      sizeGrid.innerHTML = availableSizes.map(size => `
        <div class="size-btn" data-size="${size}">${size}</div>
      `).join('');

      document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeSize = btn.getAttribute('data-size');
          document.getElementById('add-to-cart-btn').disabled = false;
        });
      });

      // Add to Cart Action
      const addToCartBtn = document.getElementById('add-to-cart-btn');
      addToCartBtn.addEventListener('click', () => {
        if (!activeSize) {
          showToast("Моля, изберете размер!");
          return;
        }
        addToCart(selectedProduct.handle, activeSize);
      });

      // Product Description / Characteristics
      document.getElementById('desc-content').innerHTML = selectedProduct.description || 'Няма допълнително описание за този продукт.';

      // Setup Accordion toggles
      document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
          header.parentElement.classList.toggle('active');
        });
      });

      // Load related products
      loadRelatedProducts();
    }
  }, 100);

  function loadRelatedProducts() {
    const relatedGrid = document.getElementById('related-products-grid');
    if (!relatedGrid) return;
    
    // Choose 4 random products of the same type/tag or just other items
    const related = productsData.filter(p => p.handle !== handle).slice(0, 4);
    
    relatedGrid.innerHTML = related.map(p => `
      <div class="product-card">
        <a href="/product.html?handle=${p.handle}">
          <div class="product-card-image-wrapper">
            ${p.compare_at_price > p.price ? `<span class="product-card-badge">Намаление</span>` : ''}
            <img src="${p.images[0]}" alt="${p.title}" class="product-card-image" id="img-rel-${p.handle}">
          </div>
        </a>
        <div class="product-card-info">
          <a href="/product.html?handle=${p.handle}" class="product-card-title">${p.title}</a>
          <div class="product-card-price-container">
            <span class="product-card-price">${p.price.toFixed(2)} лв.</span>
            ${p.compare_at_price > p.price ? `<span class="product-card-compare-price">${p.compare_at_price.toFixed(2)} лв.</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
    
    // Related hover swap
    related.forEach(p => {
      const card = document.getElementById(`img-rel-${p.handle}`);
      if (card && p.images[1]) {
        card.parentElement.addEventListener('mouseover', () => {
          card.src = p.images[1];
        });
        card.parentElement.addEventListener('mouseout', () => {
          card.src = p.images[0];
        });
      }
    });
  }
}

// POLICY INITIALIZER
function initPolicy() {
  const params = new URLSearchParams(window.location.search);
  const policyKey = params.get('p') || 'privacy-policy';

  const titleMap = {
    'privacy-policy': 'Правила за повелителност',
    'refund-policy': 'Правила за възстановяване на суми',
    'terms-of-service': 'Условия за използване на услугата',
    'contact-information': 'Информация за контакт'
  };

  const container = document.getElementById('policy-content-area');
  
  // Set title
  document.getElementById('policy-page-title').innerText = titleMap[policyKey] || 'Правила';

  fetch('/policies.json')
    .then(res => res.json())
    .then(data => {
      const policy = data[policyKey];
      if (policy && policy.paragraphs) {
        container.innerHTML = policy.paragraphs.map(p => `<p>${p}</p>`).join('');
      } else {
        container.innerHTML = '<p>Информацията не е налична.</p>';
      }
    })
    .catch(err => {
      console.error('Error fetching policies content:', err);
      container.innerHTML = '<p>Грешка при зареждане на съдържанието.</p>';
    });
}
