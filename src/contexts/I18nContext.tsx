/**
 * Internationalization — Arabic / English support.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type Lang = 'en' | 'ar';

interface I18nContextType {
  lang: Lang;
  t: (key: string) => string;
  toggleLang: () => void;
  isRTL: boolean;
}

const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Navigation
    'nav.2fa': '2FA Code',
    'nav.mail': 'Service Mail',
    'nav.inbox': 'Inbox',
    'nav.subs': 'Subscriptions',

    // 2FA Page
    '2fa.title': '2FA Code',
    '2fa.subtitle': 'Generate secure TOTP codes',
    '2fa.enterSecret': 'Enter your Base32 secret key',
    '2fa.copyCode': 'Copy Code',
    '2fa.copied': 'Copied!',
    '2fa.clearSecret': 'Clear Secret',
    '2fa.showSecret': 'Show Secret',
    '2fa.hideSecret': 'Hide Secret',

    // Service Mail
    'mail.title': 'Service Mail',
    'mail.subtitle': 'Create temporary email addresses',
    'mail.loginTitle': 'Service Mail Login',
    'mail.loginSubtitle': 'Sign in to access mail services',
    'mail.email': 'Email',
    'mail.password': 'Password',
    'mail.signIn': 'Sign In',
    'mail.logout': 'Logout',
    'mail.createRandom': 'Random Email',
    'mail.createCustom': 'Custom Email',
    'mail.customPrefix': 'Email prefix',
    'mail.create': 'Create',
    'mail.inbox': 'Inbox',
    'mail.message': 'Message',
    'mail.messages': 'Messages',
    'mail.noMessages': 'Waiting for emails…',
    'mail.autoRefresh': 'Messages will appear here automatically',
    'mail.delete': 'Delete',
    'mail.clear': 'Clear All',

    // Receive Code
    'receive.title': 'Receive Code',
    'receive.subtitle': 'Enter your email to view verification codes',
    'receive.placeholder': 'your-email@domain',
    'receive.check': 'Check',
    'receive.new': 'new',
    'receive.invalidDomain': 'Invalid domain',
    'receive.enterFull': 'Please enter the full email address',

    // Admin
    'admin.title': 'Admin Panel',
    'admin.signIn': 'Sign in to continue',
    'admin.credentials': 'Admin Credentials',
    'admin.mailCredentials': 'Service Mail Credentials',
    'admin.domains': 'Domains',
    'admin.maintenance': 'Maintenance',
    'admin.subscriptions': 'Subscriptions',
    'admin.save': 'Save',
    'admin.add': 'Add',

    // General
    'general.back': 'Back',
    'general.copy': 'Copy',
    'general.copied': '✓ Copied',
    'general.refresh': 'Refresh',
    'general.loading': 'Loading...',
    'general.error': 'Error',
    'general.noContent': 'This email has no viewable content',
    'general.noContentSub': 'The message may contain only images or attachments',

    // Categories
    'cat.otp': 'OTP',
    'cat.social': 'Social',
    'cat.shopping': 'Shopping',
    'cat.finance': 'Finance',
    'cat.dev': 'Developer',
    'cat.other': 'Other',
  },
  ar: {
    // Navigation
    'nav.2fa': 'رمز 2FA',
    'nav.mail': 'بريد الخدمة',
    'nav.inbox': 'الوارد',
    'nav.subs': 'الاشتراكات',

    // 2FA Page
    '2fa.title': 'رمز التحقق',
    '2fa.subtitle': 'توليد أكواد TOTP آمنة',
    '2fa.enterSecret': 'أدخل المفتاح السري Base32',
    '2fa.copyCode': 'نسخ الكود',
    '2fa.copied': 'تم النسخ!',
    '2fa.clearSecret': 'مسح المفتاح',
    '2fa.showSecret': 'إظهار المفتاح',
    '2fa.hideSecret': 'إخفاء المفتاح',

    // Service Mail
    'mail.title': 'بريد الخدمة',
    'mail.subtitle': 'إنشاء عناوين بريد مؤقتة',
    'mail.loginTitle': 'تسجيل دخول البريد',
    'mail.loginSubtitle': 'سجل دخولك للوصول لخدمات البريد',
    'mail.email': 'البريد الإلكتروني',
    'mail.password': 'كلمة المرور',
    'mail.signIn': 'تسجيل الدخول',
    'mail.logout': 'تسجيل الخروج',
    'mail.createRandom': 'بريد عشوائي',
    'mail.createCustom': 'بريد مخصص',
    'mail.customPrefix': 'بداية البريد',
    'mail.create': 'إنشاء',
    'mail.inbox': 'الوارد',
    'mail.message': 'رسالة',
    'mail.messages': 'رسائل',
    'mail.noMessages': 'في انتظار الرسائل…',
    'mail.autoRefresh': 'ستظهر الرسائل هنا تلقائياً',
    'mail.delete': 'حذف',
    'mail.clear': 'مسح الكل',

    // Receive Code
    'receive.title': 'استقبال الرمز',
    'receive.subtitle': 'أدخل بريدك لعرض رموز التحقق',
    'receive.placeholder': 'بريدك@domain',
    'receive.check': 'فحص',
    'receive.new': 'جديد',
    'receive.invalidDomain': 'نطاق غير صحيح',
    'receive.enterFull': 'يرجى إدخال عنوان البريد كاملاً',

    // Admin
    'admin.title': 'لوحة الإدارة',
    'admin.signIn': 'سجل دخولك للمتابعة',
    'admin.credentials': 'بيانات المسؤول',
    'admin.mailCredentials': 'بيانات بريد الخدمة',
    'admin.domains': 'النطاقات',
    'admin.maintenance': 'الصيانة',
    'admin.subscriptions': 'الاشتراكات',
    'admin.save': 'حفظ',
    'admin.add': 'إضافة',

    // General
    'general.back': 'رجوع',
    'general.copy': 'نسخ',
    'general.copied': '✓ تم النسخ',
    'general.refresh': 'تحديث',
    'general.loading': 'جاري التحميل...',
    'general.error': 'خطأ',
    'general.noContent': 'هذا البريد لا يحتوي على محتوى قابل للعرض',
    'general.noContentSub': 'قد تحتوي الرسالة على صور أو مرفقات فقط',

    // Categories
    'cat.otp': 'رمز تحقق',
    'cat.social': 'اجتماعي',
    'cat.shopping': 'تسوق',
    'cat.finance': 'مالي',
    'cat.dev': 'مطور',
    'cat.other': 'أخرى',
  },
};

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  t: (key: string) => key,
  toggleLang: () => {},
  isRTL: false,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return (localStorage.getItem('servicehub_lang') as Lang) || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('servicehub_lang', lang);
  }, [lang]);

  const t = useCallback((key: string) => {
    return translations[lang][key] || translations.en[key] || key;
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang(prev => (prev === 'en' ? 'ar' : 'en'));
  }, []);

  return (
    <I18nContext.Provider value={{ lang, t, toggleLang, isRTL: lang === 'ar' }}>
      {children}
    </I18nContext.Provider>
  );
}
