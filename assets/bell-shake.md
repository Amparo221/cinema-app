Here's a working CSS Shake Animation from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: CSS Notification Bell Shake Animation
Source: https://codefronts.com/motion/css-shake-animation/css-notification-bell-shake-animation/

A bell that actually rings, not a div that rotates: the swing pivots from the mount point (transform-origin at the top), decays like real physics, and repeats politely every few seconds while the badge pings — plus a hover variant where the clapper counter-swings against the shell for a two-part mechanical ring.
## HTML
```html
<div class="shk-15-group">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500..800&display=swap" rel="stylesheet">
<section class="shk-15a" aria-label="Notification bell that rings periodically">
  <div class="shk-15a__bar">
    <span class="shk-15a__brand">north<b>beam</b></span>
    <span class="shk-15a__spacer" aria-hidden="true"></span>
    <button class="shk-15a__bellbtn" type="button" aria-label="Notifications: 3 unread">
      <svg class="shk-15a__bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.7 21a2 2 0 0 1-3.4 0"></path></svg>
      <span class="shk-15a__badge" aria-hidden="true">3</span>
      <span class="shk-15a__ping" aria-hidden="true"></span>
    </button>
    <span class="shk-15a__avatar" aria-hidden="true">NB</span>
  </div>
  <p class="shk-15a__hint" aria-hidden="true">rings every 4s from its mount point — amplitude halves each swing, like a real pendulum</p>
</section>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" rel="stylesheet">
<section class="shk-15b" aria-label="Bell with counter-swinging clapper on hover">
  <div class="shk-15b__stage">
    <button class="shk-15b__wrap" type="button" aria-label="Ring the bell">
      <svg class="shk-15b__svg" viewBox="0 0 48 48" aria-hidden="true">
        <g class="shk-15b__shell"><path d="M24 6c-7 0-11 5-11 12 0 9-3.5 13-3.5 13h29S35 27 35 18c0-7-4-12-11-12z" fill="oklch(0.82 0.14 85)" stroke="#3a2c14" stroke-width="2.4" stroke-linejoin="round"></path><circle cx="24" cy="5.4" r="2.3" fill="#3a2c14"></circle></g>
        <g class="shk-15b__clap"><line x1="24" y1="22" x2="24" y2="33" stroke="#3a2c14" stroke-width="2.4" stroke-linecap="round"></line><circle cx="24" cy="35.5" r="3.4" fill="#3a2c14"></circle></g>
        <path d="M18.5 41.5a5.5 5.5 0 0 0 11 0z" fill="oklch(0.82 0.14 85)" stroke="#3a2c14" stroke-width="2.4" stroke-linejoin="round"></path>
      </svg>
    </button>
    <p class="shk-15b__cap">Hover to ring</p>
    <p class="shk-15b__hint" aria-hidden="true">shell and clapper run the same decay keyframes — the clapper's are negated and 40ms late</p>
  </div>
</section>
</div>
```
## CSS
```css
.shk-15-group {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  width: 100%;
}

.shk-15-group > section {
  flex: 1 1 480px;
  min-width: min(100%,360px);
}

.shk-15a,
.shk-15a *,
.shk-15a *::before,
.shk-15a *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.shk-15a {
  width: 100%;
  min-height: 100vh;
  display: grid;
  place-content: center;
  gap: 22px;
  padding: 48px 24px;
  background: radial-gradient(120% 100% at 50% 0%,#151a24,#0c0f16);
  font-family: 'Manrope','Segoe UI',system-ui,sans-serif;
}

.shk-15a__bar {
  display: flex;
  align-items: center;
  gap: 16px;
  width: min(520px,90vw);
  padding: 13px 18px;
  border-radius: 16px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(160,185,225,.14);
  box-shadow: 0 30px 70px -40px rgba(0,0,0,.9);
}

.shk-15a__brand {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -.01em;
  color: rgba(230,238,252,.75);
}

.shk-15a__brand b {
  font-weight: 800;
  color: #fff;
}

.shk-15a__spacer {
  flex: 1;
}

.shk-15a__bellbtn {
  position: relative;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 12px;
  background: rgba(255,255,255,.06);
  color: #dfe8f8;
  cursor: pointer;
  transition: background .2s;
}

.shk-15a__bellbtn:hover {
  background: rgba(255,255,255,.12);
}

.shk-15a__bell {
  width: 22px;
  height: 22px;
  transform-origin: 50% 4%;
  transform-box: fill-box;
  animation: shk-15a-ring 4s ease-in-out infinite;
}

.shk-15a__badge {
  position: absolute;
  top: 6px;
  right: 5px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  font-size: 10.5px;
  font-weight: 800;
  color: #fff;
  background: oklch(0.62 0.22 25);
  border-radius: 999px;
  animation: shk-15a-pop 4s cubic-bezier(.34,1.56,.64,1) infinite;
}

.shk-15a__ping {
  position: absolute;
  top: 6px;
  right: 5px;
  width: 17px;
  height: 17px;
  border-radius: 999px;
  border: 2px solid oklch(0.62 0.22 25);
  opacity: 0;
  animation: shk-15a-ping 4s ease-out infinite;
}

.shk-15a__avatar {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  color: #0c0f16;
  background: linear-gradient(140deg,oklch(0.8 0.12 200),oklch(0.7 0.14 260));
  border-radius: 50%;
}

.shk-15a__hint {
  text-align: center;
  font-size: 12px;
  color: rgba(223,232,248,.4);
}

@keyframes shk-15a-ring {
  0%,
    3% {
    rotate: 0deg;
  }

  5% {
    rotate: 14deg;
  }

  9% {
    rotate: -12deg;
  }

  13% {
    rotate: 9deg;
  }

  17% {
    rotate: -6deg;
  }

  21% {
    rotate: 3deg;
  }

  25% {
    rotate: -1.5deg;
  }

  28%,
    100% {
    rotate: 0deg;
  }
}

@keyframes shk-15a-pop {
  0%,
    4% {
    scale: 1;
  }

  6% {
    scale: 1.35;
  }

  9% {
    scale: 1;
  }

  100% {
    scale: 1;
  }
}

@keyframes shk-15a-ping {
  0%,
    4% {
    opacity: .8;
    scale: 1;
  }

  20% {
    opacity: 0;
    scale: 2.2;
  }

  100% {
    opacity: 0;
    scale: 2.2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shk-15a__bell,
    .shk-15a__badge,
    .shk-15a__ping {
    animation: none;
  }

  .shk-15a__ping {
    opacity: 0;
  }
}

.shk-15b,
.shk-15b *,
.shk-15b *::before,
.shk-15b *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.shk-15b {
  width: 100%;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 48px 24px;
  background: linear-gradient(170deg,#fdf8ee,#f6ecd8);
  font-family: 'Bricolage Grotesque','Segoe UI',system-ui,sans-serif;
}

.shk-15b__stage {
  text-align: center;
}

.shk-15b__wrap {
  border: 0;
  background: #fff;
  cursor: pointer;
  width: 150px;
  height: 150px;
  display: grid;
  place-items: center;
  border-radius: 36px;
  border: 2.5px solid #3a2c14;
  box-shadow: 7px 7px 0 #3a2c14;
  transition: translate .15s,box-shadow .15s;
}

.shk-15b__wrap:active {
  translate: 3px 3px;
  box-shadow: 3px 3px 0 #3a2c14;
}

.shk-15b__wrap:focus-visible {
  outline: 3px solid oklch(0.7 0.14 85);
  outline-offset: 4px;
}

.shk-15b__svg {
  width: 84px;
  height: 84px;
  overflow: visible;
}

.shk-15b__shell,
.shk-15b__clap {
  transform-origin: 24px 5px;
  transform-box: view-box;
}

.shk-15b__wrap:hover .shk-15b__shell {
  animation: shk-15b-shell 1.1s ease-in-out infinite;
}

.shk-15b__wrap:hover .shk-15b__clap {
  animation: shk-15b-clap 1.1s ease-in-out .04s infinite;
}

.shk-15b__cap {
  margin-top: 20px;
  font-size: 16px;
  font-weight: 700;
  color: #3a2c14;
}

.shk-15b__hint {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(58,44,20,.5);
  max-width: 340px;
}

@keyframes shk-15b-shell {
  0%,
    100% {
    rotate: 0deg;
  }

  12% {
    rotate: 13deg;
  }

  30% {
    rotate: -11deg;
  }

  48% {
    rotate: 8deg;
  }

  64% {
    rotate: -5deg;
  }

  80% {
    rotate: 2deg;
  }
}

@keyframes shk-15b-clap {
  0%,
    100% {
    rotate: 0deg;
  }

  12% {
    rotate: -16deg;
  }

  30% {
    rotate: 14deg;
  }

  48% {
    rotate: -10deg;
  }

  64% {
    rotate: 6deg;
  }

  80% {
    rotate: -3deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shk-15b__wrap:hover .shk-15b__shell,
    .shk-15b__wrap:hover .shk-15b__clap {
    animation: none;
  }
}
```

## JavaScript
```js
/* No JavaScript — bell, badge pop and ping ring share one 4s timeline (burst in the first 28%), so count and motion always arrive together. transform-box:fill-box makes the 50% 4% origin resolve against the bell path, not the whole SVG canvas. */

/* No JavaScript — two SVG groups pivot on the same mount point; the clapper mirrors the shell's frames with opposite signs, slightly larger angles and a 40ms delay, which is exactly how a physical bell moves. */
```