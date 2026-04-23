/**
 * Subscriptions Service
 * 
 * Manages subscription products (e.g., Gemini Pro, ChatGPT, CANVA, CAPCUT).
 * All data stored in localStorage. Admin can add/edit/delete products.
 * Customers can browse and order via WhatsApp.
 */

export interface SubscriptionProduct {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  price: string;
  priceAr: string;
  duration: string;        // e.g., "1 Month", "1 Year"
  durationAr: string;
  category: string;
  icon: string;            // emoji or icon identifier
  color: string;           // gradient color key
  features: string[];
  featuresAr: string[];
  isActive: boolean;
  badge?: string;          // e.g., "Popular", "New"
  badgeAr?: string;
  createdAt: number;
  order: number;           // display order
}

export interface SubscriptionConfig {
  products: SubscriptionProduct[];
  whatsappNumber: string;  // WhatsApp number for orders
  whatsappMessage: string; // Default message template (en)
  whatsappMessageAr: string;
  pageTitle: string;
  pageTitleAr: string;
  pageSubtitle: string;
  pageSubtitleAr: string;
}

const STORAGE_KEY = 'servicehub_subscriptions';

const DEFAULT_PRODUCTS: SubscriptionProduct[] = [
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    nameAr: 'جيميني برو',
    description: 'Access Google\'s most capable AI model with advanced reasoning, code generation, and multimodal capabilities.',
    descriptionAr: 'الوصول لأقوى نموذج ذكاء اصطناعي من جوجل مع قدرات متقدمة في التفكير وتوليد الأكواد.',
    price: '$20/mo',
    priceAr: '$20/شهر',
    duration: '1 Month',
    durationAr: 'شهر واحد',
    category: 'ai',
    icon: '✦',
    color: 'blue',
    features: ['Advanced AI reasoning', 'Code generation', 'Image analysis', '1M token context'],
    featuresAr: ['تفكير ذكاء اصطناعي متقدم', 'توليد أكواد', 'تحليل الصور', 'سياق مليون توكن'],
    isActive: true,
    badge: 'Popular',
    badgeAr: 'شائع',
    createdAt: Date.now(),
    order: 0,
  },
  {
    id: 'chatgpt-plus',
    name: 'ChatGPT Plus',
    nameAr: 'تشات جي بي تي بلس',
    description: 'Unlock GPT-4o, DALL·E 3, Advanced Data Analysis, and priority access during peak times.',
    descriptionAr: 'احصل على GPT-4o و DALL·E 3 وتحليل البيانات المتقدم وأولوية الوصول.',
    price: '$20/mo',
    priceAr: '$20/شهر',
    duration: '1 Month',
    durationAr: 'شهر واحد',
    category: 'ai',
    icon: '◎',
    color: 'emerald',
    features: ['GPT-4o access', 'DALL·E 3 images', 'Advanced analysis', 'Priority access'],
    featuresAr: ['وصول GPT-4o', 'صور DALL·E 3', 'تحليل متقدم', 'أولوية الوصول'],
    isActive: true,
    badge: 'Best Seller',
    badgeAr: 'الأكثر مبيعاً',
    createdAt: Date.now(),
    order: 1,
  },
  {
    id: 'canva-pro',
    name: 'Canva Pro',
    nameAr: 'كانفا برو',
    description: 'Professional design tools with unlimited premium templates, Brand Kit, Background Remover, and more.',
    descriptionAr: 'أدوات تصميم احترافية مع قوالب غير محدودة وأدوات العلامة التجارية وإزالة الخلفية.',
    price: '$13/mo',
    priceAr: '$13/شهر',
    duration: '1 Month',
    durationAr: 'شهر واحد',
    category: 'design',
    icon: '◈',
    color: 'violet',
    features: ['100M+ templates', 'Brand Kit', 'Background Remover', 'Magic Resize'],
    featuresAr: ['100 مليون+ قالب', 'أدوات العلامة التجارية', 'إزالة الخلفية', 'تغيير الحجم السحري'],
    isActive: true,
    createdAt: Date.now(),
    order: 2,
  },
  {
    id: 'capcut-pro',
    name: 'CapCut Pro',
    nameAr: 'كاب كت برو',
    description: 'Advanced video editing with AI-powered tools, premium effects, transitions, and no watermarks.',
    descriptionAr: 'تحرير فيديو متقدم بأدوات ذكاء اصطناعي وتأثيرات ممتازة بدون علامة مائية.',
    price: '$8/mo',
    priceAr: '$8/شهر',
    duration: '1 Month',
    durationAr: 'شهر واحد',
    category: 'video',
    icon: '▶',
    color: 'pink',
    features: ['AI video editing', 'Premium effects', 'No watermarks', 'Cloud storage'],
    featuresAr: ['تحرير فيديو بالذكاء', 'تأثيرات ممتازة', 'بدون علامة مائية', 'تخزين سحابي'],
    isActive: true,
    badge: 'New',
    badgeAr: 'جديد',
    createdAt: Date.now(),
    order: 3,
  },
];

const DEFAULT_CONFIG: SubscriptionConfig = {
  products: DEFAULT_PRODUCTS,
  whatsappNumber: '201000000000',
  whatsappMessage: 'Hi! I\'d like to subscribe to: {product} ({price})',
  whatsappMessageAr: 'مرحباً! أريد الاشتراك في: {product} ({price})',
  pageTitle: 'Premium Subscriptions',
  pageTitleAr: 'الاشتراكات المميزة',
  pageSubtitle: 'Get access to the world\'s best tools and services',
  pageSubtitleAr: 'احصل على أفضل الأدوات والخدمات العالمية',
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// ─── Read / Write ─────────────────────────────────────────────────

export function getSubscriptionConfig(): SubscriptionConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SubscriptionConfig;
      if (!parsed.products) parsed.products = DEFAULT_PRODUCTS;
      return parsed;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_CONFIG, products: [...DEFAULT_PRODUCTS] };
}

export function saveSubscriptionConfig(config: SubscriptionConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// ─── Product CRUD ─────────────────────────────────────────────────

export function getActiveProducts(): SubscriptionProduct[] {
  return getSubscriptionConfig().products
    .filter(p => p.isActive)
    .sort((a, b) => a.order - b.order);
}

export function addProduct(product: Omit<SubscriptionProduct, 'id' | 'createdAt'>): SubscriptionProduct {
  const config = getSubscriptionConfig();
  const newProduct: SubscriptionProduct = {
    ...product,
    id: generateId(),
    createdAt: Date.now(),
  };
  config.products.push(newProduct);
  saveSubscriptionConfig(config);
  return newProduct;
}

export function updateProduct(id: string, updates: Partial<SubscriptionProduct>): boolean {
  const config = getSubscriptionConfig();
  const idx = config.products.findIndex(p => p.id === id);
  if (idx === -1) return false;
  config.products[idx] = { ...config.products[idx], ...updates };
  saveSubscriptionConfig(config);
  return true;
}

export function removeProduct(id: string): boolean {
  const config = getSubscriptionConfig();
  const initial = config.products.length;
  config.products = config.products.filter(p => p.id !== id);
  if (config.products.length === initial) return false;
  saveSubscriptionConfig(config);
  return true;
}

export function toggleProductActive(id: string): boolean {
  const config = getSubscriptionConfig();
  const product = config.products.find(p => p.id === id);
  if (!product) return false;
  product.isActive = !product.isActive;
  saveSubscriptionConfig(config);
  return true;
}

export function updateSubscriptionSettings(
  settings: Partial<Pick<SubscriptionConfig, 'whatsappNumber' | 'whatsappMessage' | 'whatsappMessageAr' | 'pageTitle' | 'pageTitleAr' | 'pageSubtitle' | 'pageSubtitleAr'>>
): void {
  const config = getSubscriptionConfig();
  Object.assign(config, settings);
  saveSubscriptionConfig(config);
}

// ─── WhatsApp Link Generator ──────────────────────────────────────

export function generateWhatsAppLink(product: SubscriptionProduct, lang: 'en' | 'ar'): string {
  const config = getSubscriptionConfig();
  const template = lang === 'ar' ? config.whatsappMessageAr : config.whatsappMessage;
  const name = lang === 'ar' ? product.nameAr : product.name;
  const price = lang === 'ar' ? product.priceAr : product.price;
  const message = template
    .replace('{product}', name)
    .replace('{price}', price);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${config.whatsappNumber}?text=${encoded}`;
}
