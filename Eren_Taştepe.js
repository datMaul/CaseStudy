(() => {
  // Main object to encapsulate all carousel functionality
  const system = {};

  // Entry point: Only run on homepage and initialize logic
  system.init = async () => {
    if (window.location.pathname !== '/') {
      console.log('Yanlış sayfa');
      return;
    }

    try {
      await system.waitForElements();  // Wait until target sections are loaded
      await system.buildHTML();        // Build carousel HTML
      system.buildCSS();               // Inject necessary styles
      system.setEvents();              // Set up interactivity (like button clicks)
    } catch (error) {
      console.error('Hata oluştu:', error);
    }
  };

  // Utility to wait until two specific page sections are available
  system.waitForElements = () => {
    const section1Selector = "body > eb-root > cx-storefront > main > cx-page-layout > cx-page-slot.Section1.has-components";
    const section2Selector = "body > eb-root > cx-storefront > main > cx-page-layout > cx-page-slot.Section2A.has-components";
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkElements = () => {
        const section1 = document.querySelector(section1Selector);
        const section2 = document.querySelector(section2Selector);
        
        if (section1 && section2) {
          resolve({ section1, section2 });  // Elements found
          return;
        }

        // Timeout after 5 seconds
        if (Date.now() - startTime >= 5000) {
          reject('Bölümler yüklenemedi');
          return;
        }

        // Retry check after delay
        setTimeout(checkElements, 100);
      };
      
      checkElements();
    });
  };

  // Build and inject the carousel HTML into the page
  system.buildHTML = async () => {
    const STORAGE_KEY = 'carousel_products';
    const FAVORITES_KEY = 'favorite_products';

    const { section1, section2 } = await system.waitForElements();

    // Create and insert the wrapper for our custom carousel
    const addedSection = document.createElement('div');
    addedSection.className = 'cx-page-slot addedSection has-components';
    section1.parentNode.insertBefore(addedSection, section2);

    // HTML skeleton of the carousel
    const html = `
      <div class="container">
        <div class="header-container">
          <h2>Beğenebileceğinizi Düşündüklerimiz</h2>
        </div>
        <div class="products-container"></div>
      </div>
    `;
    addedSection.innerHTML = html;

    // Load products: use localStorage if cached, else fetch from remote
    const loadProducts = async () => {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
        const response = await fetch('https://gist.githubusercontent.com/sevindi/8bcbde9f02c1d4abe112809c974e1f49/raw/9bf93b58df623a9b16f1db721cd0a7a539296cf0/products.json');
        const products = await response.json();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
        return products;
      } catch (error) {
        console.error('Ürünler yüklenemedi:', error);
        return [];
      }
    };

    // Load saved favorite products
    const favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
    const products = await loadProducts();
    const productsContainer = document.querySelector('.products-container');

    // Render each product card in carousel
    products.forEach(product => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card';
      productCard.innerHTML = `
        <button class="fav-btn ${favorites.has(product.id) ? 'active' : ''}" data-id="${product.id}">♥</button>
        <a href="${product.url}" target="_blank">
          <img src="${product.img}" alt="${product.name}">
          <h3>${product.name}</h3>
          <div class="price-container">
            ${product.original_price && product.original_price !== product.price ? 
              `<span class="original-price">${product.original_price} TL</span>
               <span class="discount-badge">%${Math.round(((product.original_price - product.price) / product.original_price) * 100)}</span>`
              : ''
            }
            <div class="current-price">${product.price} TL</div>
          </div>
        </a>
      `;
      productsContainer.appendChild(productCard);
    });
  };

  // Inject custom styles for carousel appearance
  system.buildCSS = () => {
    const styleElement = document.createElement('style');
    styleElement.className = 'carousel-style';
    styleElement.textContent = `
      .container {
        width: 100%;
      }
      .header-container {
        background-color: #fdf6ed;
        border-top-left-radius: 48px;
        border-top-right-radius: 48px;
        padding: 25px;
        margin-bottom: 0;
      }
      .container h2 {
        text-align: start;
        box-sizing: border-box;
        font-family: Quicksand-Bold;
        font-size: 3rem;
        font-weight: 700;
        line-height: 1.11;
        color: #f28e00;
        margin: 0;
      }
      .products-container {
        display: flex;
        overflow-x: auto;
        gap: 20px;
        padding: 20px;
      }
      .product-card {
        min-width: 200px;
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 10px;
        position: relative;
      }
      .product-card a {
        text-decoration: none;
        color: inherit;
      }
      .product-card img {
        width: 100%;
        height: auto;
        border-radius: 4px;
      }
      .product-card h3 {
        margin: 10px 0;
        font-size: 14px;
      }
      .fav-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        border: none;
        background: none;
        font-size: 24px;
        cursor: pointer;
        color: #ddd;
      }
      .fav-btn.active {
        color: #ff6b00;
      }
      .price-container {
        margin-top: 10px;
      }
      .original-price {
        text-decoration: line-through;
        color: #999;
        margin-right: 8px;
      }
      .discount-badge {
        background: #ff6b00;
        color: white;
        padding: 2px 4px;
        border-radius: 4px;
        font-size: 12px;
      }
      .current-price {
        color: #ff6b00;
        font-weight: bold;
        margin-top: 5px;
      }
    `;
    document.head.appendChild(styleElement);
  };

  // Handle user interactions like "favorite" heart clicks
  system.setEvents = () => {
    const FAVORITES_KEY = 'favorite_products';
    const favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));

    // Event delegation for heart icon clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('fav-btn')) {
        e.preventDefault();
        const productId = e.target.dataset.id;

        if (favorites.has(productId)) {
          favorites.delete(productId);
          e.target.classList.remove('active');
        } else {
          favorites.add(productId);
          e.target.classList.add('active');
        }

        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
      }
    });
  };

  // Start everything
  system.init();
})();