/**
 * Subscriptions Page — Premium Software Subscriptions Storefront
 *
 * Displays subscription products as elegant cards with:
 *   - Category filtering
 *   - Professional product cards with gradients
 *   - WhatsApp order integration
 *   - Full AR/EN support
 */

import { useState, useMemo } from 'react';
import { useI18n } from '../contexts/I18nContext';
import {
  getActiveProducts,
  getSubscriptionConfig,
  generateWhatsAppLink,
} from '../services/subscriptions-service';
import type { SubscriptionProduct } from '../services/subscriptions-service';

// ─── Color Schemes ────────────────────────────────────────────────

const colorSchemes: Record<string, {
  gradient: string;
  glow: string;
  badge: string;
  border: string;
  iconBg: string;
  text: string;
  featureDot: string;
  btnGradient: string;
  btnShadow: string;
}> = {
  blue: {
    gradient: 'from-blue-500/10 via-indigo-500/5 to-transparent',
    glow: 'rgba(59, 130, 246, 0.12)',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    border: 'border-blue-500/10 hover:border-blue-500/25',
    iconBg: 'bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600',
    text: 'text-blue-300',
    featureDot: 'bg-blue-400',
    btnGradient: 'from-blue-600 via-indigo-600 to-blue-700',
    btnShadow: 'shadow-blue-500/25',
  },
  emerald: {
    gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    glow: 'rgba(16, 185, 129, 0.12)',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    border: 'border-emerald-500/10 hover:border-emerald-500/25',
    iconBg: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600',
    text: 'text-emerald-300',
    featureDot: 'bg-emerald-400',
    btnGradient: 'from-emerald-600 via-teal-600 to-emerald-700',
    btnShadow: 'shadow-emerald-500/25',
  },
  violet: {
    gradient: 'from-violet-500/10 via-purple-500/5 to-transparent',
    glow: 'rgba(139, 92, 246, 0.12)',
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/20',
    border: 'border-violet-500/10 hover:border-violet-500/25',
    iconBg: 'bg-gradient-to-br from-violet-500 via-purple-500 to-violet-600',
    text: 'text-violet-300',
    featureDot: 'bg-violet-400',
    btnGradient: 'from-violet-600 via-purple-600 to-violet-700',
    btnShadow: 'shadow-violet-500/25',
  },
  pink: {
    gradient: 'from-pink-500/10 via-rose-500/5 to-transparent',
    glow: 'rgba(236, 72, 153, 0.12)',
    badge: 'bg-pink-500/15 text-pink-300 border-pink-500/20',
    border: 'border-pink-500/10 hover:border-pink-500/25',
    iconBg: 'bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600',
    text: 'text-pink-300',
    featureDot: 'bg-pink-400',
    btnGradient: 'from-pink-600 via-rose-600 to-pink-700',
    btnShadow: 'shadow-pink-500/25',
  },
  amber: {
    gradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    glow: 'rgba(245, 158, 11, 0.12)',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    border: 'border-amber-500/10 hover:border-amber-500/25',
    iconBg: 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600',
    text: 'text-amber-300',
    featureDot: 'bg-amber-400',
    btnGradient: 'from-amber-600 via-orange-600 to-amber-700',
    btnShadow: 'shadow-amber-500/25',
  },
  cyan: {
    gradient: 'from-cyan-500/10 via-sky-500/5 to-transparent',
    glow: 'rgba(6, 182, 212, 0.12)',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
    border: 'border-cyan-500/10 hover:border-cyan-500/25',
    iconBg: 'bg-gradient-to-br from-cyan-500 via-sky-500 to-cyan-600',
    text: 'text-cyan-300',
    featureDot: 'bg-cyan-400',
    btnGradient: 'from-cyan-600 via-sky-600 to-cyan-700',
    btnShadow: 'shadow-cyan-500/25',
  },
};

const getColorScheme = (color: string) => colorSchemes[color] || colorSchemes.blue;

// ─── Category Config ──────────────────────────────────────────────

const categories = [
  { key: 'all', en: 'All', ar: 'الكل', icon: '⬡' },
  { key: 'ai', en: 'AI Tools', ar: 'أدوات الذكاء', icon: '✦' },
  { key: 'design', en: 'Design', ar: 'التصميم', icon: '◈' },
  { key: 'video', en: 'Video', ar: 'الفيديو', icon: '▶' },
  { key: 'productivity', en: 'Productivity', ar: 'الإنتاجية', icon: '◉' },
  { key: 'other', en: 'Other', ar: 'أخرى', icon: '◆' },
];

// ─── Product Card ─────────────────────────────────────────────────

function ProductCard({ product, lang }: { product: SubscriptionProduct; lang: 'en' | 'ar' }) {
  const [isHovered, setIsHovered] = useState(false);
  const scheme = getColorScheme(product.color);

  const name = lang === 'ar' ? product.nameAr : product.name;
  const desc = lang === 'ar' ? product.descriptionAr : product.description;
  const price = lang === 'ar' ? product.priceAr : product.price;
  const duration = lang === 'ar' ? product.durationAr : product.duration;
  const features = lang === 'ar' ? product.featuresAr : product.features;
  const badge = lang === 'ar' ? product.badgeAr : product.badge;
  const orderText = lang === 'ar' ? 'اطلب الآن' : 'Order Now';

  const whatsappLink = generateWhatsAppLink(product, lang);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${scheme.border} transition-all duration-500 bg-gradient-to-b ${scheme.gradient}`}
      style={{
        background: isHovered
          ? `linear-gradient(135deg, ${scheme.glow} 0%, transparent 60%)`
          : undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute -top-24 -right-24 w-48 h-48 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none"
        style={{ background: scheme.glow }}
      />

      <div className="relative p-6 flex flex-col h-full">
        {/* Top row: icon + badge */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl ${scheme.iconBg} flex items-center justify-center text-white text-xl shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
            {product.icon}
          </div>
          {badge && (
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${scheme.badge} animate-fade-in`}>
              {badge}
            </span>
          )}
        </div>

        {/* Name & Description */}
        <h3 className="text-lg font-bold text-white mb-1.5 tracking-tight group-hover:text-white transition-colors">
          {name}
        </h3>
        <p className="text-xs text-white/30 leading-relaxed mb-4 line-clamp-2 flex-shrink-0">
          {desc}
        </p>

        {/* Price */}
        <div className="mb-4">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${scheme.text}`}>{price}</span>
            <span className="text-[10px] text-white/20 font-medium">/ {duration}</span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2 mb-6 flex-1">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className={`w-1 h-1 rounded-full ${scheme.featureDot} flex-shrink-0`} />
              <span className="text-xs text-white/40">{feature}</span>
            </div>
          ))}
        </div>

        {/* Order Button (WhatsApp) */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r ${scheme.btnGradient} text-white font-semibold text-sm shadow-lg ${scheme.btnShadow} transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97]`}
        >
          {/* WhatsApp Icon */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {orderText}
        </a>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { lang } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const config = useMemo(() => getSubscriptionConfig(), []);
  const products = useMemo(() => getActiveProducts(), []);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const title = lang === 'ar' ? config.pageTitleAr : config.pageTitle;
  const subtitle = lang === 'ar' ? config.pageSubtitleAr : config.pageSubtitle;

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    for (const p of products) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [products]);

  return (
    <div className="min-h-screen relative">
      <div className="bg-glow" />
      <div className="grid-pattern fixed inset-0 z-0 pointer-events-none" />

      <main className="relative z-10 flex flex-col items-center min-h-screen px-4 pt-24 pb-12">
        {/* ── Hero Section ────────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ opacity: 0 }}>
          {/* Decorative icon */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute w-20 h-20 rounded-3xl bg-gradient-to-r from-pink-500/20 via-violet-500/20 to-blue-500/20 blur-2xl animate-pulse" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 via-violet-500 to-blue-600 flex items-center justify-center shadow-xl shadow-violet-500/25">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
            {title}
          </h1>
          <p className="text-sm text-white/30 max-w-md mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* ── Category Filter ────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
          {categories.map(cat => {
            const count = categoryCounts[cat.key] || 0;
            if (cat.key !== 'all' && count === 0) return null;
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300 border
                  ${isActive
                    ? 'bg-white/10 text-white border-white/15 shadow-sm'
                    : 'text-white/30 border-transparent hover:text-white/50 hover:bg-white/[0.04]'
                  }`}
              >
                <span className="text-sm">{cat.icon}</span>
                <span>{lang === 'ar' ? cat.ar : cat.en}</span>
                <span className={`text-[10px] ml-0.5 ${isActive ? 'text-white/50' : 'text-white/15'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Products Grid ──────────────────────────── */}
        {filteredProducts.length > 0 ? (
          <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${0.15 + index * 0.08}s`, opacity: 0 }}
              >
                <ProductCard product={product} lang={lang} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 animate-fade-in">
            <p className="text-white/20 text-sm">
              {lang === 'ar' ? 'لا توجد منتجات في هذه الفئة' : 'No products in this category'}
            </p>
          </div>
        )}

        {/* ── WhatsApp Contact CTA ───────────────────── */}
        <div className="mt-16 text-center animate-fade-in-up" style={{ animationDelay: '0.5s', opacity: 0 }}>
          <div className="glass-card inline-flex items-center gap-3 px-6 py-4 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div className="text-left" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              <p className="text-xs font-medium text-white/60">
                {lang === 'ar' ? 'تحتاج مساعدة؟' : 'Need help?'}
              </p>
              <p className="text-[10px] text-white/25">
                {lang === 'ar' ? 'تواصل معنا عبر واتساب' : 'Contact us via WhatsApp'}
              </p>
            </div>
            <a
              href={`https://wa.me/${config.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-green-600/20 text-green-300 text-xs font-semibold border border-green-500/20 hover:bg-green-600/30 hover:border-green-500/30 transition-all"
            >
              {lang === 'ar' ? 'تواصل' : 'Chat'}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
