// Renders a screen description onto the 80 x 24 character grid.
export const COLS = 80;
export const ROWS = 24;
export const LEGEND_ROW = 22;
export const MESSAGE_ROW = 23;

export class View {
  constructor() {
    this.text = [];
    this.fields = [];
    this.buttons = [];
    this.legend = [];
    this.message = null;
    this.window = null;
    this.focus = null;
  }

  t(r, c, s, cls = '', tag = '') {
    if (s !== '' && s != null) this.text.push({ r, c, s: String(s), cls, tag });
    return this;
  }

  f(name, label, r, c, w, value, opts = {}) {
    this.fields.push({ name, label, r, c, w, value: value ?? '', ...opts });
    return this;
  }

  b(r, c, s, on, aria, cls = '') {
    this.buttons.push({ r, c, s, on, aria: aria || s, cls });
    return this;
  }
}

function place(el, r, c, w) {
  el.style.setProperty('--r', r);
  el.style.setProperty('--c', c);
  if (w != null) el.style.setProperty('--w', w);
}

export class Terminal {
  constructor(root, handlers) {
    this.root = root;
    this.h = handlers;
    this.order = [];
    this.rendering = false;
    this.selectOnUp = null;

    this.blk = document.createElement('div');
    this.blk.className = 'blk';
    this.blk.hidden = true;
    this.blk.setAttribute('aria-hidden', 'true');

    root.addEventListener('mousedown', e => {
      const inp = e.target.closest('input');
      if (!inp) {
        e.preventDefault();
        return;
      }
      if (document.activeElement !== inp) this.selectOnUp = inp;
    });
    root.addEventListener('mouseup', e => {
      const inp = this.selectOnUp;
      this.selectOnUp = null;
      if (inp && e.target === inp) {
        e.preventDefault();
        inp.select();
        this.place();
      }
    });
    root.addEventListener('input', e => {
      const t = e.target;
      if (t.tagName !== 'INPUT') return;
      if (t.dataset.upper === '1') {
        const up = t.value.toUpperCase();
        if (up !== t.value) {
          const a = t.selectionStart;
          const b = t.selectionEnd;
          t.value = up;
          t.setSelectionRange(a, b);
        }
      }
      this.h.input(t.dataset.name, t.value);
      this.place();
    });
    root.addEventListener('focusout', e => {
      if (this.rendering) return;
      const t = e.target;
      if (t.tagName === 'INPUT' && t.dataset.name) {
        const name = t.dataset.name;
        setTimeout(() => this.h.exit(name), 0);
      }
    });
    root.addEventListener('focusin', () => this.place());
    document.addEventListener('selectionchange', () => this.place());
  }

  textEl(t) {
    const el = document.createElement('span');
    el.className = `t ${t.cls || ''}`.trim();
    el.textContent = t.s;
    if (t.tag) el.dataset.tag = t.tag;
    place(el, t.r, t.c);
    return el;
  }

  fieldEl(f) {
    const el = document.createElement('input');
    el.className = 'f';
    el.type = f.type === 'password' ? 'password' : 'text';
    el.value = f.value;
    el.maxLength = f.w;
    el.autocomplete = 'off';
    el.spellcheck = false;
    el.setAttribute('autocapitalize', 'off');
    el.setAttribute('aria-label', f.label);
    el.dataset.name = f.name;
    el.dataset.r = f.r;
    el.dataset.c = f.c;
    el.dataset.w = f.w;
    if (f.upper) el.dataset.upper = '1';
    place(el, f.r, f.c, f.w);
    return el;
  }

  buttonEl(b) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `hs ${b.cls || ''}`.trim();
    el.tabIndex = -1;
    el.textContent = b.s;
    el.setAttribute('aria-label', b.aria);
    el.addEventListener('click', e => {
      e.stopPropagation();
      this.h.click(b.on);
    });
    place(el, b.r, b.c);
    return el;
  }

  // Elements go into the DOM in reading order; tab order follows the field list.
  layer(v, cls) {
    const layer = document.createElement('div');
    layer.className = `layer ${cls}`;
    const items = [];
    const order = [];
    for (const t of v.text) items.push({ r: t.r, c: t.c, el: this.textEl(t) });
    for (const f of v.fields) {
      const el = this.fieldEl(f);
      order.push(el);
      items.push({ r: f.r, c: f.c, el });
    }
    for (const b of v.buttons) items.push({ r: b.r, c: b.c, el: this.buttonEl(b) });
    items.sort((a, b) => a.r - b.r || a.c - b.c);
    for (const it of items) layer.append(it.el);
    return { layer, order };
  }

  legendLayer(v) {
    const layer = document.createElement('div');
    layer.className = 'layer chrome';
    let c = 1;
    const parts = v.legend.map(k => ({ ...k, s: k.s || `${k.k}=${k.t}` }));
    const total = parts.reduce((n, p) => n + p.s.length, 0);
    const gap = total + 3 * (parts.length - 1) <= COLS - 2 ? 3 : 2;
    for (const k of parts) {
      layer.append(this.buttonEl({ r: LEGEND_ROW, c, s: k.s, on: k.on, aria: k.aria || `${k.k} ${k.t}` }));
      c += k.s.length + gap;
    }
    const msg = document.createElement('div');
    msg.className = 't msg';
    msg.setAttribute('role', 'status');
    msg.setAttribute('aria-live', 'polite');
    place(msg, MESSAGE_ROW, 0);
    if (v.message && v.message.text) {
      const span = document.createElement('span');
      span.className = v.message.err ? 'rv' : 'w';
      span.textContent = ` ${v.message.text} `;
      msg.append(span);
    }
    layer.append(msg);
    return layer;
  }

  windowLayer(w) {
    const layer = document.createElement('div');
    layer.className = 'layer win';
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    if (w.onBackdrop) backdrop.addEventListener('click', () => this.h.click(w.onBackdrop));
    layer.append(backdrop);

    const bg = document.createElement('div');
    bg.className = 'winbg';
    place(bg, w.r, w.c, w.w);
    bg.style.setProperty('--h', w.h);
    if (w.onClick) bg.addEventListener('click', () => this.h.click(w.onClick));
    layer.append(bg);

    const v = w.view;
    const right = w.c + w.w - 1;
    const bottom = w.r + w.h - 1;
    v.t(w.r, w.c, '.'.repeat(w.w), 'b');
    for (let r = w.r + 1; r < bottom; r += 1) {
      v.t(r, w.c, ':', 'b');
      v.t(r, right, ':', 'b');
    }
    v.t(bottom, w.c, `:${'.'.repeat(w.w - 2)}:`, 'b');
    const { layer: inner, order } = this.layer(v, 'wincontent');
    if (w.onClick) inner.addEventListener('click', e => {
      if (!e.target.closest('button,input')) this.h.click(w.onClick);
    });
    layer.append(inner);
    return { layer, order };
  }

  render(v) {
    this.rendering = true;
    const a = document.activeElement;
    let prev = null;
    if (a && a.tagName === 'INPUT' && this.root.contains(a)) {
      prev = { name: a.dataset.name, s: a.selectionStart, e: a.selectionEnd };
    }
    this.root.replaceChildren();

    const base = this.layer(v, 'base');
    this.root.append(base.layer, this.legendLayer(v));
    let order = base.order;
    if (v.window) {
      base.layer.inert = true;
      const win = this.windowLayer(v.window);
      this.root.append(win.layer);
      order = win.order;
    }
    this.root.append(this.blk);
    this.order = order;

    let target = null;
    let restore = false;
    if (v.focus) target = order.find(i => i.dataset.name === v.focus) || null;
    if (!target && prev) {
      target = order.find(i => i.dataset.name === prev.name) || null;
      restore = !!target;
    }
    if (!target) target = order[0] || null;
    if (target) {
      target.focus({ preventScroll: true });
      if (restore) {
        try { target.setSelectionRange(prev.s, prev.e); } catch { /* not selectable */ }
      } else {
        target.select();
      }
    } else if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
    this.rendering = false;
    this.place();
  }

  tab(dir) {
    const o = this.order;
    if (!o.length) return;
    let i = o.indexOf(document.activeElement);
    i = i < 0 ? (dir > 0 ? 0 : o.length - 1) : (i + dir + o.length) % o.length;
    o[i].focus({ preventScroll: true });
    o[i].select();
  }

  // Block cursor follows the caret of the focused field.
  place() {
    const a = document.activeElement;
    if (!a || a.tagName !== 'INPUT' || !this.root.contains(a)) {
      this.blk.hidden = true;
      return;
    }
    const w = Number(a.dataset.w);
    let p = a.selectionStart ?? 0;
    if (p >= w) p = w - 1;
    place(this.blk, Number(a.dataset.r), Number(a.dataset.c) + p);
    this.blk.hidden = false;
    this.blk.classList.remove('on');
    void this.blk.offsetWidth;
    this.blk.classList.add('on');
  }

  tick(date, time) {
    for (const el of this.root.querySelectorAll('[data-tag="clock"]')) el.textContent = time;
    for (const el of this.root.querySelectorAll('[data-tag="date"]')) el.textContent = date;
  }
}
