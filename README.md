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
- `output 1.mp4`, `output 2.mp4` (1920x1080 desktop masters)
- `output 1-mobile.mp4`, `output 2-mobile.mp4` (960x540 renditions for phones and tablets)

Custom-domain configuration is intentionally not included yet.

## Scroll-driven video: rules for the media files

The hero and the property journey scrub a video with the scroll position, so
these clips are seek-bound, not playback-bound. Two properties of the files
matter more than anything in the JavaScript.

**1. The files must be faststart.** A browser cannot decode a frame or answer a
seek until it holds the `moov` atom, which carries the sample tables. If `moov`
sits after `mdat`, the visitor waits for the whole file before seeing anything.
Always encode with `-movflags +faststart`. `npm run build` fails the build if any
MP4 in `dist/` has `moov` after `mdat`, so this cannot ship by accident.

If a file has already lost faststart, fix it without re-encoding:

```powershell
npm run media:check      # report atom order for all four clips
npm run media:faststart  # move moov ahead of mdat, losslessly
```

That remux rewrites only the container and keeps a copy of the original in
`.media-backup/`. The compressed video data is untouched.

**2. Every frame should be a keyframe.** These clips are encoded all-intra, which
is why scrubbing lands instantly instead of decoding forward from a distant
keyframe. Keep it that way when re-encoding, and pay for it by dropping frame
rate and resolution rather than by lengthening the GOP.

To inspect resolution, frame rate, keyframe interval, bitrate and atom order:

```powershell
npm run media:probe
```

### Re-encoding

Requires ffmpeg. Note `-g 1` (all-intra), `-an` (the clips are muted, so the
audio track is dead weight), and `+faststart`:

```powershell
# Desktop master: 1080p, 30 fps is ample for a scrub
ffmpeg -i "source.mp4" -an -vf "fps=30,scale=1920:1080:flags=lanczos" `
  -c:v libx264 -preset slow -crf 20 -g 1 -pix_fmt yuv420p `
  -movflags +faststart "output 1.mp4"

# Mobile rendition
ffmpeg -i "source.mp4" -an -vf "fps=30,scale=960:540:flags=lanczos" `
  -c:v libx264 -preset slow -crf 23 -g 1 -pix_fmt yuv420p `
  -movflags +faststart "output 1-mobile.mp4"
```

Keep every file under Cloudflare Pages' 25 MiB per-file limit; the build rejects
anything larger.

## Local preview

`file://` is not good enough for testing these videos, because Safari and iOS
fetch media with HTTP range requests. Use the preview server, which supports
them:

```powershell
npm run serve        # repository root at http://localhost:4173
npm run serve:dist   # the built output instead
```
