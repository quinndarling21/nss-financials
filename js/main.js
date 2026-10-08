import { Terminal } from './terminal.js';
import { db, save, ensureBusinessDate, checkEpoch } from './state.js';
import { fmtDate, nowTime, todayISO } from './dates.js';
import { SignOn } from './screens/signon.js';
import { MainMenu } from './screens/menu.js';

const SCREENS = {
  SIGNON: SignOn,
  APMENU: MainMenu,
};

const FKEY = /^F([1-9]|1[0-2])$/;

const app = {
  screen: null,
  busy: false,

  get user() {
    const s = db().session;
    return s ? s.user : null;
  },

  open(name) {
    let target = SCREENS[name] ? name : 'SIGNON';
    const s = db();
    if (target !== 'SIGNON') {
      if (!s.session) target = 'SIGNON';
      else if (s.session.screen !== target) {
        s.session.screen = target;
        save(s);
      }
    }
    this.screen = new SCREENS[target](this);
    this.render();
  },

  menu() {
    this.open('APMENU');
  },

  signOn(id) {
    const s = db();
    s.session = { user: id, screen: 'APMENU' };
    save(s);
    this.open('APMENU');
  },

  signOff() {
    const s = db();
    s.session = null;
    save(s);
    this.open('SIGNON');
  },

  render() {
    term.render(this.screen.build());
    this.screen.focusReq = null;
  },

  run(fn) {
    if (this.busy) return;
    const scr = this.screen;
    if (scr.id && !db().session) {
      this.open('SIGNON');
      return;
    }
    const done = () => {
      if (this.screen === scr) this.render();
    };
    const r = fn();
    if (r && typeof r.then === 'function') r.then(done, done);
    else done();
  },

  key(k) {
    this.run(() => this.screen.handle(k));
  },

  click(fn) {
    this.run(() => {
      this.screen.msg = null;
      return fn();
    });
  },
};

const term = new Terminal(document.getElementById('screen'), {
  input: (name, value) => app.screen.set(name, value),
  exit: name => {
    if (!app.busy && app.screen.exit(name)) app.render();
  },
  click: fn => app.click(fn),
});

window.addEventListener('keydown', e => {
  if (e.isComposing) return;
  const k = e.key;
  if (FKEY.exec(k)) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.repeat) app.key(k);
    return;
  }
  if (k === 'Escape') {
    e.preventDefault();
    if (!e.repeat) app.key('F12');
    return;
  }
  if (k === 'Enter') {
    e.preventDefault();
    if (!e.repeat) app.key('Enter');
    return;
  }
  if (k === 'PageDown' || k === 'PageUp') {
    e.preventDefault();
    app.key(k);
    return;
  }
  if (k === 'Tab') {
    e.preventDefault();
    term.tab(e.shiftKey ? -1 : 1);
  }
}, true);

window.addEventListener('keyup', e => {
  if (FKEY.exec(e.key)) e.preventDefault();
}, true);

setInterval(() => term.tick(fmtDate(todayISO()), nowTime()), 1000);

ensureBusinessDate();
const session = db().session;
app.open(session && session.user ? session.screen || 'APMENU' : 'SIGNON');
checkEpoch().then(rebuilt => {
  if (rebuilt) app.open('SIGNON');
});
