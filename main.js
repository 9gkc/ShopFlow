const productList = document.querySelector("#product-list");
const navbar = document.querySelector("#navbar");
const cartItems = document.querySelector("#cart-items");
const cartTotal = document.querySelector("#cart-total");
const shopStatus = document.querySelector("#shop-status");

const storageKey = "shopflow.cart.v1";
const maxQuantity = 99;
let allProducts = [];
let cart = readCart();
let activeCategory = "all";

function setStatus(message, tone = "info") {
  if (!shopStatus) return;
  shopStatus.textContent = message;
  shopStatus.dataset.tone = tone;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function isValidProduct(product) {
  return Boolean(
    product &&
    (Number.isInteger(product.id) || typeof product.id === "string") &&
    typeof product.title === "string" && product.title.trim() &&
    typeof product.description === "string" &&
    typeof product.category === "string" && product.category.trim() &&
    typeof product.image === "string" && /^[\w.-]+\.(?:png|jpe?g|webp|gif|svg)$/i.test(product.image) &&
    Number.isFinite(Number(product.price)) && Number(product.price) >= 0,
  );
}

function readCart() {
  try {
    const raw = localStorage.getItem(storageKey) ?? localStorage.getItem("cart") ?? "[]";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => (
        item &&
        (typeof item.id === "string" || typeof item.id === "number") &&
        typeof item.title === "string" &&
        Number.isFinite(Number(item.price)) && Number(item.price) >= 0 &&
        Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0
      ))
      .map((item) => ({
        id: String(item.id),
        title: item.title.trim(),
        price: Number(item.price),
        quantity: Math.min(maxQuantity, Number(item.quantity)),
      }));
  } catch (error) {
    console.error("Unable to read cart", error);
    setStatus("Your saved cart could not be read from this browser.", "error");
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(cart));
    return true;
  } catch (error) {
    console.error("Unable to save cart", error);
    setStatus("The cart changed, but it could not be saved in this browser.", "error");
    return false;
  }
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function renderCategories(products) {
  if (!navbar) return;
  navbar.replaceChildren();
  const categories = [...new Set(products.map((product) => product.category))].sort();
  const categoryItems = [["all", "All products"], ...categories.map((category) => [category, category])];

  categoryItems.forEach(([category, label]) => {
    const listItem = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-item";
    button.dataset.category = category;
    button.textContent = label;
    button.setAttribute("aria-pressed", String(category === activeCategory));
    if (category === activeCategory) button.classList.add("active");
    button.addEventListener("click", () => {
      activeCategory = category;
      navbar.querySelectorAll(".nav-item").forEach((item) => {
        const isActive = item.dataset.category === activeCategory;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });
      const visibleProducts = activeCategory === "all"
        ? allProducts
        : allProducts.filter((product) => product.category === activeCategory);
      renderProducts(visibleProducts);
    });
    listItem.appendChild(button);
    navbar.appendChild(listItem);
  });
}

function renderProducts(products) {
  if (!productList) return;
  productList.replaceChildren();
  productList.setAttribute("aria-busy", "false");

  if (products.length === 0) {
    productList.appendChild(createTextElement("p", "empty-state", "No products found in this category."));
    return;
  }

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = String(product.id);

    const id = createTextElement("span", "id", `#${product.id}`);
    const image = document.createElement("img");
    image.src = `imgs/${encodeURIComponent(product.image)}`;
    image.alt = product.title;
    image.loading = "lazy";
    const title = createTextElement("h2", "", product.title);
    const description = createTextElement("p", "description", product.description);
    const info = document.createElement("div");
    info.className = "info-container";
    info.appendChild(createTextElement("p", "price", formatMoney(Number(product.price))));
    const inCart = createTextElement("p", "in-cart-amount", "");
    info.appendChild(inCart);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.id = String(product.id);
    button.textContent = "Add to cart";
    button.setAttribute("aria-label", `Add ${product.title} to cart`);
    card.append(id, image, title, description, info, button);
    productList.appendChild(card);
  });
  updateProductCards();
}

function updateProductCards() {
  productList?.querySelectorAll(".product-card").forEach((card) => {
    const id = card.dataset.id;
    const inCart = card.querySelector(".in-cart-amount");
    const item = cart.find((cartItem) => cartItem.id === id);
    if (inCart) inCart.textContent = item ? `${item.quantity} in cart` : "";
  });
}

function updateCart() {
  if (!cartItems || !cartTotal) return;
  cartItems.replaceChildren();

  if (cart.length === 0) {
    cartItems.appendChild(createTextElement("li", "empty-cart", "Your cart is empty."));
  } else {
    cart.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.dataset.id = item.id;
      const details = document.createElement("div");
      details.appendChild(createTextElement("h3", "", item.title));
      details.appendChild(createTextElement("span", "item-price", `${formatMoney(item.price)} each`));
      const controls = document.createElement("div");
      controls.className = "quantity-controls";
      const decrease = document.createElement("button");
      decrease.type = "button";
      decrease.className = "quantity-btn";
      decrease.dataset.action = "decrease";
      decrease.dataset.id = item.id;
      decrease.textContent = "−";
      decrease.setAttribute("aria-label", `Decrease quantity of ${item.title}`);
      const quantity = createTextElement("span", "quantity", String(item.quantity));
      quantity.setAttribute("aria-label", `Quantity ${item.quantity}`);
      const increase = document.createElement("button");
      increase.type = "button";
      increase.className = "quantity-btn";
      increase.dataset.action = "increase";
      increase.dataset.id = item.id;
      increase.textContent = "+";
      increase.setAttribute("aria-label", `Increase quantity of ${item.title}`);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-btn";
      remove.dataset.action = "remove";
      remove.dataset.id = item.id;
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", `Remove ${item.title} from cart`);
      controls.append(decrease, quantity, increase, remove);
      listItem.append(details, controls);
      cartItems.appendChild(listItem);
    });
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotal.textContent = formatMoney(total);
  updateProductCards();
}

function addToCart(id) {
  const product = allProducts.find((item) => String(item.id) === id);
  if (!product) return;
  const existingItem = cart.find((item) => item.id === id);
  if (existingItem) {
    if (existingItem.quantity >= maxQuantity) {
      setStatus(`You can add up to ${maxQuantity} of one item.`, "error");
      return;
    }
    existingItem.quantity += 1;
  } else {
    cart.push({ id, title: product.title, price: Number(product.price), quantity: 1 });
  }
  if (saveCart()) {
    updateCart();
    setStatus(`${product.title} added to your cart.`, "success");
  }
}

function changeQuantity(id, amount) {
  const item = cart.find((cartItem) => cartItem.id === id);
  if (!item) return;
  item.quantity = Math.max(0, Math.min(maxQuantity, item.quantity + amount));
  if (item.quantity === 0) cart = cart.filter((cartItem) => cartItem.id !== id);
  if (saveCart()) updateCart();
}

function removeFromCart(id) {
  const item = cart.find((cartItem) => cartItem.id === id);
  cart = cart.filter((cartItem) => cartItem.id !== id);
  if (saveCart()) {
    updateCart();
    setStatus(item ? `${item.title} removed from your cart.` : "Item removed.", "success");
  }
}

async function initializeApp() {
  if (productList) {
    productList.setAttribute("aria-busy", "true");
    productList.appendChild(createTextElement("p", "loading-state", "Loading products…"));
  }
  updateCart();
  try {
    const response = await fetch("./products.json", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Product data returned ${response.status}.`);
    const products = await response.json();
    allProducts = Array.isArray(products) ? products.filter(isValidProduct) : [];
    if (allProducts.length === 0) throw new Error("No valid products were found.");
    renderCategories(allProducts);
    renderProducts(allProducts);
    setStatus(`${allProducts.length} products ready.`, "success");
  } catch (error) {
    console.error("Unable to load products", error);
    if (productList) {
      productList.replaceChildren(createTextElement("p", "error-state", "Products are unavailable right now. Please try again later."));
    }
    setStatus("The catalog could not be loaded.", "error");
  }
}

productList?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (button) addToCart(button.dataset.id);
});

cartItems?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "increase") changeQuantity(id, 1);
  if (action === "decrease") changeQuantity(id, -1);
  if (action === "remove") removeFromCart(id);
});

document.addEventListener("DOMContentLoaded", initializeApp);
