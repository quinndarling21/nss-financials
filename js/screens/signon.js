import { Screen, K, err } from './screen.js';
import { ensureBusinessDate, checkEpoch } from '../state.js';
import { user } from '../ledger.js';
import { todayISO } from '../dates.js';

export class SignOn extends Screen {
  constructor(app) {
    super(app);
    this.f = { user: '', password: '' };
  }

  legend() {
    return [K.ENTER];
  }

  view(v) {
    v.t(0, 36, 'Sign On', 'w');
    v.t(2, 47, 'System . . . . . :');
    v.t(2, 68, 'NSSPROD', 'w');
    v.t(3, 47, 'Subsystem  . . . :');
    v.t(3, 68, 'QINTER', 'w');
    v.t(4, 47, 'Display  . . . . :');
    v.t(4, 68, 'QPADEV0041', 'w');

    v.t(6, 17, 'User . . . . . . . . . . . . . .');
    v.f('user', 'User', 6, 53, 10, this.f.user, { upper: true });
    v.t(7, 17, 'Password . . . . . . . . . . . .');
    v.f('password', 'Password', 7, 53, 10, this.f.password, { type: 'password' });

    v.t(11, 15, 'N O R T H S T A R   S T U D I O   S E R V I C E S', 'c');
    v.t(13, 33, 'NSS Financials', 'w');
    v.t(14, 20, 'Burbank   -   Atlanta   -   Albuquerque');

    v.t(20, 37, `(C) NORTHSTAR STUDIO SERVICES 1998, ${todayISO().slice(0, 4)}.`);
  }

  key(k) {
    if (k === 'Enter') return this.submit();
    return undefined;
  }

  async submit() {
    this.app.busy = true;
    try {
      ensureBusinessDate();
      await checkEpoch();
    } finally {
      this.app.busy = false;
    }
    const id = this.f.user.trim().toUpperCase();
    const u = id ? user(id) : null;
    if (!id) {
      this.msg = err('NSF0100 User profile must be entered.');
      this.focusReq = 'user';
    } else if (!u) {
      this.msg = err(`NSF0101 User profile ${id} not found.`);
      this.focusReq = 'user';
    } else if (!u.signOn) {
      this.msg = err(`NSF0103 User profile ${id} not authorized to sign on.`);
      this.focusReq = 'user';
    } else if (!this.f.password) {
      this.msg = err('NSF0102 Password not correct for user profile.');
      this.focusReq = 'password';
    } else {
      this.app.signOn(id);
    }
  }
}
