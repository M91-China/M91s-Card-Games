/**
 * @file UserManager.js
 * @description 用户登录、注册、记住我与个人战绩管理
 * @author M91's Card Games Team
 * @date 2026-08
 */

class UserManager {
  constructor(storageInstance) {
    this.storage = storageInstance || (typeof window !== 'undefined' ? window.userStorage : null);
    this.USER_KEY = 'users';
    this.CURRENT_USER_KEY = 'currentUser';
    this.REMEMBER_KEY = 'rememberUser';
    this.REMEMBER_DAYS = 7;
  }

  _encodePassword(password) {
    const text = String(password || '');
    try {
      return btoa(unescape(encodeURIComponent(text + '::m91-card-games')));
    } catch (e) {
      return Buffer ? Buffer.from(text + '::m91-card-games').toString('base64') : text;
    }
  }

  _matchPassword(inputPassword, savedPassword) {
    return this._encodePassword(inputPassword) === savedPassword;
  }

  _emptyGameStats() {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      maxStreak: 0,
      currentStreak: 0,
      history: [],
      bombs: 0,
      rockets: 0,
      landlordWins: 0,
      farmerWins: 0,
      maxMultiplier: 0,
      maxLevel: 2,
      straightFlushes: 0,
      skyBombs: 0
    };
  }

  _defaultUserStats() {
    return {
      doudizhu: this._emptyGameStats(),
      guandan: this._emptyGameStats()
    };
  }

  _getUsers() {
    const users = this.storage ? this.storage.get(this.USER_KEY, {}) : {};
    return users && typeof users === 'object' ? users : {};
  }

  _saveUsers(users) {
    if (!this.storage) return false;
    this.storage.set(this.USER_KEY, users);
    return true;
  }

  _normalizeUser(record) {
    if (!record || typeof record !== 'object') return null;
    const stats = record.stats || {};
    const safeStats = {
      doudizhu: { ...this._emptyGameStats(), ...(stats.doudizhu || {}) },
      guandan: { ...this._emptyGameStats(), ...(stats.guandan || {}) }
    };
    safeStats.doudizhu.history = Array.isArray(safeStats.doudizhu.history) ? safeStats.doudizhu.history : [];
    safeStats.guandan.history = Array.isArray(safeStats.guandan.history) ? safeStats.guandan.history : [];
    return {
      username: record.username || '游客',
      password: record.password || '',
      avatar: record.avatar || '😎',
      createTime: record.createTime || new Date().toISOString(),
      settings: {
        sound: record.settings?.sound !== false,
        difficulty: record.settings?.difficulty || 'normal',
        theme: record.settings?.theme || '',
        volume: record.settings?.volume ?? 0.6,
        animation: record.settings?.animation !== false
      },
      stats: safeStats
    };
  }

  _getCurrentUserNameFromSession() {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(this.CURRENT_USER_KEY) || null;
  }

  _setCurrentUserInSession(username) {
    if (typeof sessionStorage !== 'undefined') {
      if (username) sessionStorage.setItem(this.CURRENT_USER_KEY, username);
      else sessionStorage.removeItem(this.CURRENT_USER_KEY);
    }
  }

  _setRememberUser(username, remember = true) {
    if (!this.storage) return;
    if (!remember || !username) {
      this.storage.remove(this.REMEMBER_KEY);
      return;
    }
    const expiresAt = Date.now() + this.REMEMBER_DAYS * 86400000;
    this.storage.set(this.REMEMBER_KEY, { username, expiresAt });
  }

  _getRememberedUser() {
    if (!this.storage) return null;
    const item = this.storage.get(this.REMEMBER_KEY, null);
    if (!item || !item.username) return null;
    if (Date.now() > (item.expiresAt || 0)) {
      this.storage.remove(this.REMEMBER_KEY);
      return null;
    }
    return item.username;
  }

  register(username, password) {
    const name = String(username || '').trim();
    if (!name) throw new Error('用户名不能为空');
    if (name.length < 2) throw new Error('用户名至少2个字符');
    if (String(password || '').length < 4) throw new Error('密码至少4位');

    const users = this._getUsers();
    if (users[name]) throw new Error('用户名已存在');

    const user = this._normalizeUser({
      username: name,
      password: this._encodePassword(password),
      createTime: new Date().toISOString(),
      avatar: '😎',
      settings: {
        sound: true,
        difficulty: 'normal',
        theme: '',
        volume: 0.6,
        animation: true
      },
      stats: this._defaultUserStats()
    });

    users[name] = user;
    this._saveUsers(users);
    return user;
  }

  login(username, password, rememberMe = true) {
    const name = String(username || '').trim();
    if (!name) throw new Error('用户名不能为空');

    const users = this._getUsers();
    const record = users[name];
    if (!record) throw new Error('账号不存在，请先注册');

    if (!this._matchPassword(password, record.password)) {
      throw new Error('密码错误');
    }

    this._setCurrentUserInSession(name);
    this._setRememberUser(name, !!rememberMe);
    return this._normalizeUser(record);
  }

  autoLogin() {
    const remembered = this._getRememberedUser();
    if (!remembered) return null;
    const users = this._getUsers();
    const record = users[remembered];
    if (!record) {
      this._setRememberUser(null, false);
      return null;
    }
    this._setCurrentUserInSession(remembered);
    return this._normalizeUser(record);
  }

  logout() {
    this._setCurrentUserInSession(null);
    this._setRememberUser(null, false);
    return true;
  }

  isLoggedIn() {
    return !!this.getCurrentUser();
  }

  isGuest() {
    return !this.isLoggedIn();
  }

  getCurrentUser() {
    const name = this._getCurrentUserNameFromSession() || this._getRememberedUser();
    if (!name) return null;
    const users = this._getUsers();
    const record = users[name];
    if (!record) return null;
    return this._normalizeUser(record);
  }

  getCurrentUsername() {
    const user = this.getCurrentUser();
    return user ? user.username : '游客';
  }

  getCurrentStatsSummary() {
    const user = this.getCurrentUser();
    if (!user) {
      return {
        username: '游客',
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: '--',
        maxStreak: 0,
        history: []
      };
    }

    const d = user.stats.doudizhu || this._emptyGameStats();
    const g = user.stats.guandan || this._emptyGameStats();
    const wins = d.wins + g.wins;
    const losses = d.losses + g.losses;
    const total = wins + losses;

    return {
      username: user.username,
      totalGames: total,
      wins,
      losses,
      winRate: total > 0 ? ((wins / total) * 100).toFixed(1) + '%' : '--',
      maxStreak: Math.max(d.maxStreak || 0, g.maxStreak || 0),
      history: (d.history || []).concat((g.history || [])).sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10)
    };
  }

  saveGameResult({ game, isWin, role, bombs = 0, rockets = 0, upLevel = 0, multiplayer = 1, scoreDelta = 0, detail = '', partner = '' }) {
    const user = this.getCurrentUser();
    if (!user) return { saved: false, guest: true };

    const users = this._getUsers();
    const record = this._normalizeUser(users[user.username]);
    if (!record) return { saved: false, guest: false };

    const d = record.stats.doudizhu || this._emptyGameStats();
    const g = record.stats.guandan || this._emptyGameStats();

    if (game === 'doudizhu') {
      d.totalGames += 1;
      if (isWin) {
        d.wins += 1;
        d.currentStreak += 1;
        d.maxStreak = Math.max(d.maxStreak, d.currentStreak);
      } else {
        d.losses += 1;
        d.currentStreak = 0;
      }
      d.bombs += bombs || 0;
      d.rockets += rockets || 0;
      d.maxMultiplier = Math.max(d.maxMultiplier || 0, multiplayer || 1);
      if (role === 'landlord') {
        if (isWin) d.landlordWins += 1; else d.landlordWins = d.landlordWins;
      }
      if (role === 'farmer') {
        if (isWin) d.farmerWins += 1;
      }
      d.history.unshift({
        time: new Date().toISOString(),
        result: isWin ? '胜' : '负',
        detail: detail || `${role === 'landlord' ? '地主' : '农民'} · 倍数 ×${multiplayer || 1}`,
        game: '斗地主',
        score: scoreDelta || 0
      });
      d.history = d.history.slice(0, 50);
      d.winRate = d.totalGames > 0 ? Number(((d.wins / d.totalGames) * 100).toFixed(1)) : 0;
    }

    if (game === 'guandan') {
      g.totalGames += 1;
      if (isWin) {
        g.wins += 1;
        g.currentStreak += 1;
        g.maxStreak = Math.max(g.maxStreak, g.currentStreak);
      } else {
        g.losses += 1;
        g.currentStreak = 0;
      }
      g.bombs += bombs || 0;
      g.straightFlushes += (detail && detail.straightFlushes) || 0;
      g.skyBombs += (detail && detail.skyBombs) || 0;
      g.maxLevel = Math.max(g.maxLevel || 2, upLevel || 2);
      g.history.unshift({
        time: new Date().toISOString(),
        result: isWin ? '胜' : '负',
        detail: detail || `${partner ? '搭档:' + partner + ' · ' : ''}升级${upLevel || 0}级`,
        game: '掼蛋',
        score: scoreDelta || 0
      });
      g.history = g.history.slice(0, 50);
      g.winRate = g.totalGames > 0 ? Number(((g.wins / g.totalGames) * 100).toFixed(1)) : 0;
    }

    record.stats = { doudizhu: d, guandan: g };
    users[user.username] = record;
    this._saveUsers(users);
    return { saved: true, guest: false, user: record };
  }

  getUserList() {
    return Object.keys(this._getUsers()).map((name) => this._normalizeUser(this._getUsers()[name]));
  }

  updateSettings(partialSettings) {
    const user = this.getCurrentUser();
    if (!user) return null;
    const users = this._getUsers();
    const record = this._normalizeUser(users[user.username]);
    record.settings = { ...record.settings, ...partialSettings };
    users[user.username] = record;
    this._saveUsers(users);
    return record;
  }

  changePassword(oldPassword, newPassword) {
    const user = this.getCurrentUser();
    if (!user) throw new Error('请先登录');
    const users = this._getUsers();
    const record = users[user.username];
    if (!record) throw new Error('用户不存在');
    if (!this._matchPassword(oldPassword, record.password)) throw new Error('旧密码错误');
    if (String(newPassword || '').length < 4) throw new Error('新密码至少4位');
    record.password = this._encodePassword(newPassword);
    users[user.username] = this._normalizeUser(record);
    this._saveUsers(users);
    return true;
  }
}

if (typeof window !== 'undefined') {
  const userManager = new UserManager(window.userStorage || new UserStorage());
  window.UserManager = UserManager;
  window.userManager = userManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UserManager };
}
