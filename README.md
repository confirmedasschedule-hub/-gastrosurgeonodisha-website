# gastrosurgeonodisha.com

Website of Dr. Premananda Patnaik, GI, laparoscopic & cancer surgeon, Bhubaneswar.

- `docs/` — the website (published by GitHub Pages at https://www.gastrosurgeonodisha.com)
- `docs/gallery.json` — gallery photos and their order; new photos go in `docs/gallery/`
- `docs/photo-desk/` — hidden photo desk at https://www.gastrosurgeonodisha.com/photo-desk/ . It saves gallery changes straight into this repository with a GitHub fine-grained token (Contents: read and write, this repository only). The token is stored in `docs/photo-desk/key.json` only in encrypted form (AES-GCM, key from the desk password via PBKDF2). Delete the token on GitHub to cut off access.
- `netlify/`, `netlify.toml`, `package.json` — not used on GitHub Pages

Note for rebuilds: `docs/gallery.json`, `docs/gallery/` and `docs/photo-desk/key.json` are edited by the photo desk on the live site. Never overwrite them from a local build; pull first.
