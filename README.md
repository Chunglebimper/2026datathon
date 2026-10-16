# 2026datathon
Raw data: https://drive.google.com/drive/folders/1vdxXsQpGEyNhjCeXMStn8fUEJG6XWafo?usp=share_link
hello welcome to the 2026 datathon readme

i hope you like it 

yay

## Dashboard

The site is a static React app in `web/`. It reads the cleaned block-group table and a simplified copy of the block-group boundaries. It does not need a backend.

From the repository root, refresh the map files after the cleaned table changes:

```bash
python3 scripts/export_block_group_geometries.py
```

Then start the site:

```bash
cd web
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` writes a static site to `web/dist`, and `npm run preview` serves that build. Asset paths are relative so the same build can be published on GitHub Pages later.
