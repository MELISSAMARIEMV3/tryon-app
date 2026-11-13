# Try On

Minimal front-end starter for a clothing virtual try-on app. It is plain static HTML, CSS, and JavaScript: no build step, no framework, and no backend. GitHub Pages can serve it from the repository root on the `main` branch.

The site does not use AI, scraping, analytics, or external APIs. A full-body photo and a product link stay in `sessionStorage` for the current tab. Body measurements stay in `localStorage` on the device. Nothing is uploaded.

## Pages

- `index.html` — Short welcome, the three steps, and a Start button.
- `photo.html` — Step 1. Choose a full-body photo and preview it locally.
- `ad-link.html` — Step 2. Paste a clothing ad or product link, with basic URL validation.
- `try-on.html` — Step 3. Coming-soon placeholder that shows the saved photo and link.
- `measurements.html` — Optional height, weight, chest/bust, waist, hips, and inseam, with a metric/imperial toggle. Saved in this browser only.
- `size.html` — Placeholder for a suggested size. It will compare an ad size chart to the avatar and measurements. Shows `Size: --`.

Shared files: `styles.css` and `app.js`. `.nojekyll` tells GitHub Pages to serve the files as they are.

The same nav and a Photo → Ad link → Try it on progress indicator appear on every page.

## Publish on GitHub Pages

In the repository settings, deploy Pages from the `main` branch and the root folder (`/`).

## Preview locally

From this folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`. Opening the HTML files directly from disk can block browser storage, so a local server or GitHub Pages is the reliable way to walk through the steps.
