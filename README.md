# Rakesh Meshua: portfolio

React + Vite. All text, links and projects live in `src/content.js`; theme colours are at the top of `src/styles.css`.

```
npm install
npm run dev      # http://localhost:5173
npm run build
```

Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Hero character
`source/character.mp4` is the original clip. `python tools/extract_frames.py` turns it into the 128 transparent
frames in `public/frames/` (needs `pip install opencv-python numpy`). `N` in that script must match `N` in
`src/components/CharacterHero.jsx`.
