# Service Hub – 2 FA

> Secure, client-side TOTP (Time-based One-Time Password) generator.  
> Your secrets **never leave your browser**.

## Features

- **RFC 6238** compliant TOTP code generation
- **6-digit and 8-digit** code support
- **30-second auto-refresh** with circular countdown timer
- **Base32 secret key** validation
- **Multiple input methods**: text field, URL path (`/SECRET`), query parameter (`?secret=XXX`)
- **otpauth:// URI** parsing with issuer and account label
- **SHA-1 / SHA-256 / SHA-512** algorithm support
- **Copy to clipboard** with toast notifications
- **Show/Hide secret** toggle
- **URL auto-cleaning** via `history.replaceState` after secret extraction
- **Zero server communication** — fully client-side SPA
- **Responsive** — works on mobile, tablet, and desktop

## Security

- Secrets are **never sent to any server**
- Secrets are **never stored** in localStorage, sessionStorage, or cookies
- Secrets are **never logged** or sent through analytics
- URL is **cleaned immediately** after reading the secret
- Secret can be **cleared from memory** via the "Clear Secret" button

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

### 1. Manual Entry
Paste your Base32 secret key into the input field.

### 2. URL Path
Navigate to: `http://localhost:5173/YOUR_BASE32_SECRET`

### 3. Query Parameter
Navigate to: `http://localhost:5173/?secret=YOUR_BASE32_SECRET`

### 4. otpauth:// URI
Use the Advanced Settings panel to parse an `otpauth://totp/...` URI.

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory. Deploy to any static hosting (Vercel, Netlify, GitHub Pages, etc.).

## Preview Production Build

```bash
npm run preview
```

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
│   ├── Header.tsx            # Title and subtitle
│   ├── SecretInput.tsx       # Secret input with show/hide/paste
│   ├── CodeDisplay.tsx       # Large TOTP code display + copy
│   ├── TimerBar.tsx          # Circular countdown timer
│   ├── AdvancedSettings.tsx  # Config panel (digits, period, algorithm)
│   ├── SecurityNotice.tsx    # Security assurance message
│   ├── Footer.tsx            # Footer
│   └── Toast.tsx             # Toast notification system
├── utils/
│   └── totp.ts               # TOTP generation, validation, URL parsing
├── App.tsx                    # Main application component
├── main.tsx                   # Entry point
└── index.css                  # Global styles + TailwindCSS
```

## Deployment

This is a fully static SPA. After building, deploy the `dist/` folder to any static hosting provider:

- **Vercel**: `npx vercel --prod`
- **Netlify**: Drag & drop `dist/` folder
- **GitHub Pages**: Use `gh-pages` npm package
- **Any web server**: Serve `dist/index.html` for all routes

## License

Private — for personal use.
