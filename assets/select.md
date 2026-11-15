Here's a working CSS Dropdown Menu Design from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: Slide-Down Fade Dropdown
Source: https://codefronts.com/navigation/css-dropdown-menus/slide-down-fade-dropdown/

Classic navigation dropdown that slides down and fades in on hover using max-height and opacity transitions on a CSS-only nav.
## HTML
```html
<div class="dd-01">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <nav class="dd-01__nav">
    <div class="dd-01__item">
      <a href="#" class="dd-01__trigger">Products <span class="dd-01__caret">▾</span></a>
      <ul class="dd-01__panel">
        <li><a href="#"><span class="dd-01__icon">&#9670;</span> Design System</a></li>
        <li><a href="#"><span class="dd-01__icon">&#9670;</span> Component Library</a></li>
        <li><a href="#"><span class="dd-01__icon">&#9670;</span> Icon Pack</a></li>
        <li><a href="#"><span class="dd-01__icon">&#9670;</span> Templates</a></li>
      </ul>
    </div>
    <div class="dd-01__item">
      <a href="#" class="dd-01__trigger">Solutions <span class="dd-01__caret">▾</span></a>
      <ul class="dd-01__panel">
        <li><a href="#"><span class="dd-01__icon">&#9670;</span> For Startups</a></li>
        <li><a href="#"><span class="dd-01__icon">&#9670;</span> For Enterprise</a></li>
        <li><a href="#"><span class="dd-01__icon">&#9670;</span> For Agencies</a></li>
      </ul>
    </div>
    <div class="dd-01__item">
      <a href="#" class="dd-01__trigger">Resources <span class="dd-01__caret">▾</span></a>
      <ul class="dd-01__panel">
        <li><a href="#"><span class="dd-01__icon">&#9670;</span> Documentation</a></li>
        <li><a href="#"><span class="dd-01__icon">&#9670;</span> Blog</a></li>
        <li><a href="#"><span class="dd-01__icon">&#9670;</span> Community</a></li>
        <li><a href="#"><span class="dd-01__icon">&#9670;</span> Changelog</a></li>
      </ul>
    </div>
    <a href="#" class="dd-01__cta">Get Started</a>
  </nav>
</div>
```
## CSS
```css
.dd-01,
.dd-01 *,
.dd-01 *::before,
.dd-01 *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.dd-01 ::selection {
  background: #6366f1;
  color: #fff;
}

.dd-01 {
  --brand: #6366f1;
  --brand-dark: #4f46e5;
  --surface: #ffffff;
  --border: #e5e7eb;
  --text: #111827;
  --muted: #6b7280;
  --hover-bg: #f5f3ff;
  --shadow: 0 10px 40px rgba(99,102,241,.15);
  font-family: 'Inter', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 340px;
  background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
  padding: 40px 20px;
}

.dd-01__nav {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 8px 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,.06);
  position: relative;
  z-index: 100;
}

.dd-01__item {
  position: relative;
}

.dd-01__item::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 8px;
  /* hover-bridge: invisible strip below the trigger covering
       the visible gap before the panel. Lives on .__item (not
       the panel, which has overflow:hidden / pointer-events:
       none in its closed state) so the parent :hover stays
       active while the cursor traverses the gap. */
}

.dd-01__trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  color: var(--text);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  transition: background 0.18s, color 0.18s;
  white-space: nowrap;
}

.dd-01__trigger:hover {
  background: var(--hover-bg);
  color: var(--brand);
}

.dd-01__caret {
  font-size: 12px;
  display: inline-block;
  transition: transform 0.25s ease;
  color: var(--muted);
  line-height: 1;
  margin-top: 1px;
}

.dd-01__item:hover .dd-01__caret {
  transform: rotate(180deg);
  color: var(--brand);
}
/* ── dropdown panel ── */

.dd-01__panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(-6px);
  min-width: 200px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  list-style: none;
  padding: 6px;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transition: max-height 0.35s ease, opacity 0.22s ease 0.05s, transform 0.28s ease;
}

.dd-01__item:hover .dd-01__panel {
  max-height: 320px;
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}

.dd-01__panel li a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--text);
  font-size: 13.5px;
  font-weight: 450;
  transition: background 0.15s, color 0.15s;
}

.dd-01__panel li a:hover {
  background: var(--hover-bg);
  color: var(--brand);
}

.dd-01__icon {
  font-size: 7px;
  color: var(--brand);
  opacity: 0.6;
}

.dd-01__cta {
  margin-left: 8px;
  padding: 8px 18px;
  background: var(--brand);
  color: #fff;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.18s, transform 0.15s;
}

.dd-01__cta:hover {
  background: var(--brand-dark);
  transform: translateY(-1px);
}

@media (prefers-reduced-motion: reduce) {
  .dd-01__panel,
    .dd-01__caret,
    .dd-01__trigger,
    .dd-01__cta {
    transition: none;
  }
}
```