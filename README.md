# Heart Particle Photo Reveal

A static, dependency-free romantic photo reveal built with HTML, CSS, Canvas 2D, and vanilla JavaScript. It is ready for GitHub and Vercel static deployment.

## Project structure

```text
heart-particle-photo-reveal/
├── index.html
├── style.css
├── script.js
├── README.md
└── public/
    └── assets/
        └── photo.jpg
```

## Personalize

Open `script.js` and edit the `CONFIG` object near the top:

```js
const CONFIG = {
  recipientName: 'someone special',
  messages: [
    "you're my favorite part of every universe.",
    "if the world gave me another chance, i'd still be glad to know you.",
    "you are someone i'll always be grateful to have met."
  ],
  photoPath: './public/assets/photo.jpg',
  musicPath: ''
};
```

You can also use the settings button in the website to change the name, messages, photo, and optional music during the current browser session. To make a replacement photo permanent on the deployed website, replace `public/assets/photo.jpg` in the repository and commit it. Optional background music can be bundled at `public/assets/music.mp3` and enabled by setting `musicPath` to `./public/assets/music.mp3`; it will still only play after the user presses the sound button.

## Run locally

Because this is a static site, no build step or package installation is required. Open `index.html` in a browser, or serve the project folder with any static web server.

## Deploy to Vercel

1. Push the whole project folder to a GitHub repository, including `public/assets/photo.jpg`.
2. Import that repository in Vercel.
3. Use the **Other** framework preset (or leave framework detection as static).
4. Use the included `vercel.json` configuration (it sets the output directory to `.`) and leave the Build Command empty; there is no build process.
5. Deploy.

The HTML uses relative paths and does not depend on local machine paths or external image hosting. The included `vercel.json` makes Vercel serve the repository root, so the committed `public/assets/photo.jpg` is available at `/public/assets/photo.jpg`. Google Fonts are optional; the page includes local system-font fallbacks.

## Notes

- The main photo reveal samples the actual image pixels and animates colored heart particles toward their source positions. The source photo is not displayed directly during the reveal.
- The ending scene displays the same source photo after the particle formation has completed.
- The in-page photo/music upload controls create temporary browser object URLs. They are not automatically written into your GitHub repository; replace the relevant files in the project folder to publish those changes.
- For best photo detail on phones, keep the source image reasonably sharp and avoid very small images. The particle count is capped to keep animation responsive.
