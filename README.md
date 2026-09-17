# ICS Real Estate Website

Static HTML, CSS, and JavaScript website prepared for deployment with Cloudflare Pages.

## Build locally

Requirements: Node.js 18 or newer.

```powershell
npm run build
```

The build script creates `dist/` from an explicit allowlist of public website files. Repository metadata such as `.git` and `.vscode` is not copied. The script also rejects any output asset larger than Cloudflare Pages' 25 MiB per-file limit.

Do not commit `dist/`; Cloudflare Pages generates it during deployment.

## Deploy with Cloudflare Pages

1. Push this repository to GitHub or GitLab.
2. In the Cloudflare dashboard, open **Workers & Pages**.
3. Select **Create application**, choose the **Pages** tab, and select **Connect to Git**.
4. Select this repository and configure:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Production branch | `main` (or the repository's default branch) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Leave blank |

5. Select **Save and Deploy**.

Cloudflare will publish the site at `https://<project-name>.pages.dev` and rebuild it when changes are pushed to the production branch.

## Public build contents

The build includes only:

- `index.html`
- `css/`
- `js/`
- `fonts/`
- `images/`
- `output 1.mp4`
- `output 2.mp4`

Custom-domain configuration is intentionally not included yet.
