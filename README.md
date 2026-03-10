# Service Hub

> Multi-service platform: **2FA Code Generator**, **Service Mail**, and **Inbox Viewer**.  
> Your secrets **never leave your browser**.

## Features

### 🔐 2FA Code Generator (`/2fa-code`)
- **RFC 6238** compliant TOTP code generation
- **6-digit and 8-digit** code support with **30-second auto-refresh**
- **Base32 secret key** validation
- **otpauth:// URI** parsing with issuer & account label
- **SHA-1 / SHA-256 / SHA-512** algorithm support
- Copy to clipboard with toast notifications

### 📬 Service Mail (`/service-mail`)
- Create random or custom email addresses
- Real-time inbox with auto-refresh (IMAP)
- Full message viewing with HTML support
- Protected by email/password login
- Multiple mailbox management

### 📥 Inbox / Receive Code (`/receive-code`)
- Quick email inbox checker for clients
- Enter any email to view received messages
- Direct link support: `/receive-code/email@domain`
- Auto-refresh every 8 seconds

### ⚙️ Admin Panel (`/admin`)
- Manage admin & service mail credentials
- Domain management with IMAP/SMTP configuration
- Mail server maintenance (cleanup/purge)
- Password show/hide toggles

## Security

- 2FA secrets are **never sent to any server** — fully client-side
- Secrets are **never stored** in localStorage, sessionStorage, or cookies
- URL is **cleaned immediately** after reading the secret
- Admin & Service Mail pages are **password protected**
- All sensitive settings stored in client-side localStorage

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Routes

| Route | Description |
|---|---|
| `/` | Redirects to `/2fa-code` |
| `/2fa-code` | 2FA TOTP Generator |
| `/2fa-code/:secret` | 2FA with pre-filled secret |
| `/service-mail` | Service Mail (login required) |
| `/receive-code` | Inbox viewer for clients |
| `/receive-code/:address` | Direct inbox for specific email |
| `/admin` | Admin panel (login required) |

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## Technology Stack

| Technology | Purpose |
|---|---|
| [Vite](https://vite.dev) | Build tool & dev server |
| [React](https://react.dev) | UI framework |
| [TypeScript](https://typescriptlang.org) | Type safety |
| [TailwindCSS v3](https://v3.tailwindcss.com) | Styling |
| [otplib v13](https://github.com/nicedoc/otplib) | TOTP generation (RFC 6238) |

## Project Structure

```
src/
├── components/
│   ├── Header.tsx              # 2FA page header (emerald theme)
│   ├── SecretInput.tsx         # Secret input with show/hide/paste
│   ├── CodeDisplay.tsx         # Large TOTP code display
│   ├── TimerBar.tsx            # Circular countdown timer
│   ├── SecurityNotice.tsx      # Security message
│   ├── Navigation.tsx          # Top nav bar (themed per page)
│   ├── Footer.tsx              # Dynamic footer per page
│   ├── Toast.tsx               # Toast notifications
│   └── tempmail/               # Mail-specific components
├── pages/
│   ├── TwoFA.tsx               # 2FA page (emerald)
│   ├── TempMail.tsx            # Service Mail page (violet)
│   ├── ReceiveCode.tsx         # Inbox page (cyan)
│   └── Admin.tsx               # Admin panel (amber)
├── services/
│   ├── domain-config.ts        # Domain & admin config management
│   └── tempmail-service.ts     # Mail service (IMAP integration)
├── utils/
│   └── totp.ts                 # TOTP generation & validation
├── App.tsx                     # Router
├── main.tsx                    # Entry point
└── index.css                   # Global styles + themed buttons
```

## Deployment

Static SPA — deploy the `dist/` folder to any hosting:

- **Vercel**: `npx vercel --prod`
- **Netlify**: Drag & drop `dist/` folder
- **GitHub Pages**: Use `gh-pages` npm package

## License

Private — for personal use.
