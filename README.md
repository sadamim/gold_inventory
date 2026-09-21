# Global Inventory

A Next.js / React prototype for general inventory, branch records, transfers, reservations and reporting.

## Run

Use Node.js 20.9 or newer. Run `npm install`, then `npm run dev`. Open http://localhost:3000. For production checks run `npm test` and `npm run build`; run `npm start` to serve the production build.

## Demo access and storage

- `admin@global.demo`, `london@global.demo`, or `singapore@global.demo`
- Password for all test accounts: `Inventory123!`
- This is an explicitly client-side demo login, not production authentication or authorization. Test credentials are public. No real sensitive data should be stored here.
- Branch profiles, transfer handovers, inventory changes and audit demonstrations persist in localStorage in the same browser. Login lasts for the browser tab session. The test users share the same local workspace and are not restricted to branches.
- There is no shared database, real payment processing, reservation expiry or multi-user concurrency. A production release needs a secure identity provider, durable database and server-validated stock transitions.
- Existing static files in `dist/` are the previous prototype; Next.js uses `app/`, `components/`, `lib/` and `public/` instead.

## Branch transfers and reports

Requests preserve source stock. Dispatch requires a matching item scan, sender name and package reference; it blocks retail availability. Receipt requires a matching scan, receiver name and inspection confirmation; it updates custody and availability. Both handover timestamps are captured from the device and shown in IST.

Reports use **previous complete calendar periods in Asia/Kolkata**: yesterday, last Monday–Sunday, previous month and previous year. Dispatch totals use dispatch time; receipt totals use receipt time. Network unique-transfer totals count each transfer once. These are movement reports, not reconstructed historical balances or sales reports. Historical demo transfers are intentionally separate from the 16 current item identities. Export respects the selected period and branch.

## Live INR metal benchmark strip

The Next.js `/api/metals` endpoint requests gold and silver spot quotes from [Gold API](https://gold-api.com/) and the working-day USD/INR reference rate from [Frankfurter](https://frankfurter.dev/v1/). No API key is needed for these public feeds. Successful results are cached for 60 seconds per server instance. Requests time out; malformed responses are rejected. On failure, a previous result up to 24 hours old is explicitly marked stale, or the interface shows unavailable. There are no invented price fallbacks.

Calculation: USD per troy ounce × INR/USD ÷ 31.1034768. Gold is scaled by 24K, 22K, 18K and 14K purity ratios; silver by 999 and 925 fineness. Prices are INR per gram, **indicative spot-based estimates**, not Indian local retail quotes. Taxes, import duties, premiums and making charges are excluded. Source timestamps and FX date are displayed; data older than 15 minutes is marked delayed. FX is a daily reference, not live intraday FX. Public feed availability is outside the app's control.

## Vercel

Import the repository root and select the Next.js framework preset. The included `vercel.json` uses Next.js; remove any previous dashboard override for output directory `dist` or blank install/build commands. Use standard `npm install` and `npm run build` defaults, with no custom output directory. Do not deploy only the old `dist` folder.

Product photography is generated illustrative imagery. See `IMAGE-ASSETS.md` for the prompt. Reduced-motion preferences disable decorative motion.

