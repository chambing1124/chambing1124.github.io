/* ============================================================
   NAIWA — 交互层
   · 摸奶蛙：单击 / 长按抱抱 / 连点鼓腮，台词随机 + 时段 + 回访
   · 今日心情：专属插图、整页氛围、心情日历
   · 放空计时器：呼吸奶蛙、沉浸模式、环境声、本周累计
   · 心情卡：信封开场、翻面换句、状态汇总、Web Share
   · 跟随滚动的小奶蛙
   ============================================================ */
(() => {
  'use strict';

  /* ---------------- 0. 基础工具 ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimate = () => !mqReduce.matches;
  const pad2 = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const mdLabel = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const store = {
    get(k, f) { try { const v = localStorage.getItem('naiwa-' + k); return v === null ? f : v; } catch { return f; } },
    set(k, v) { try { localStorage.setItem('naiwa-' + k, String(v)); } catch {} },
    json(k, f) { try { const v = localStorage.getItem('naiwa-' + k); return v ? JSON.parse(v) : f; } catch { return f; } },
    save(k, v) { try { localStorage.setItem('naiwa-' + k, JSON.stringify(v)); } catch {} }
  };

  const root = document.documentElement;
  let toastTimer = 0;
  function toast(text) {
    const host = document.querySelector('dialog[open]') || document.body;
    const el = $('#toast');
    host.appendChild(el);
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  /* ---------------- 1. 心情数据 ---------------- */
  const MOODS = {
    chill: {
      name: '松弛蛙', label: 'SLOW MODE: ON',
      variants: [
        { title: '允许自己，\n偶尔无所事事。', description: '把烦恼调成静音，把快乐调大一点。\n今天的任务：好好晒太阳。' },
        { title: '今天不赶路，\n只晒太阳。', description: '慢一点没关系，方向对就好。\n奶蛙把垫子铺好了。' },
        { title: '什么都不做，\n也是一种进度。', description: '世界不会因为你歇了一会儿就跑掉。\n先把肩膀放下来。' }
      ],
      color: '#e8eddd', stamp: '≈  LESS RUSH, MORE HUSH.',
      response: '松弛蛙就位。今天，慢慢来也可以。',
      img: 'assets/frogs/chill.webp', alt: '奶蛙盘腿坐着，冲你竖起大拇指',
      note: '电量刚刚好。', noteIcon: '≈', hint: '想躺着，什么都不做'
    },
    brave: {
      name: '勇敢蛙', label: 'A LITTLE BRAVER',
      variants: [
        { title: '小小的一步，\n也算了不起。', description: '不用等到准备完美，才开始出发。\n你往前一点，奶蛙就陪你一点。' },
        { title: '害怕，\n也可以往前走。', description: '勇气不是不怕，是怕着也把脚抬起来。\n今天先迈半步就好。' },
        { title: '先出发，\n路会自己长出来。', description: '没有谁一开始就知道怎么走。\n走着走着，天就亮了。' }
      ],
      color: '#f3e6c8', stamp: '✧  SMALL STEPS, BIG HEART.',
      response: '勇敢蛙就位。你的每一小步，都算数。',
      img: 'assets/frogs/brave.webp', alt: '奶蛙托着下巴思考，另一只手往前指',
      note: '正在攒一点勇气。', noteIcon: '✧', hint: '有点怕，但想试试'
    },
    tired: {
      name: '没电蛙', label: 'RECHARGING, GENTLY',
      variants: [
        { title: '电量不足，\n就先抱抱自己。', description: '暂停一下，不会错过整个世界。\n不用急着满格，慢慢充电就好。' },
        { title: '今天只做一件事：\n把自己接住。', description: '待办可以等，你也可以等自己。\n先躺平五分钟。' },
        { title: '撑不住的时候，\n就靠着。', description: '不用解释，也不用报备。\n休息不需要理由。' }
      ],
      color: '#dfe4ee', stamp: '☾  REST IS PART OF THE WAY.',
      response: '没电蛙就位。歇一会儿，没有关系。',
      img: 'assets/frogs/tired.webp', alt: '奶蛙在雨夜撑着伞，眼里含着一点泪',
      note: '电量低，先充会儿电。', noteIcon: '☾', hint: '没力气了，只想安静'
    },
    happy: {
      name: '开心蛙', label: 'LITTLE JOYS, BIG SMILES',
      variants: [
        { title: '今天的快乐，\n不需要理由。', description: '一口甜的，一阵风，一个没来由的笑。\n把这些小事，装进口袋里。' },
        { title: '好事很小，\n但要收好。', description: '阳光刚好落在桌角那种。\n也算今天赚到了。' },
        { title: '心情不错，\n就多笑一会儿。', description: '不用怕它跑掉，快乐会自己续杯。\n今天的蛙，很想蹦两下。' }
      ],
      color: '#f7e8b0', stamp: '☀  COLLECT THE LITTLE JOYS.',
      response: '开心蛙就位。今天的好心情，已接住。',
      img: 'assets/frogs/happy.webp', alt: '奶蛙双手比着剪刀手，吐着舌头笑',
      note: '今天的好心情已到账。', noteIcon: '☀', hint: '心情不错，想笑一下'
    }
  };
  const MOOD_KEYS = Object.keys(MOODS);

  let currentMood = store.get('mood', 'chill');
  if (!MOODS[currentMood]) currentMood = 'chill';

  function dayOfYear(d) {
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86400000);
  }
  // 同一种心情，按当天是这一年的第几天轮换文案
  function moodVariant(key, date) {
    const m = MOODS[key];
    if (!m || !m.variants || !m.variants.length) return { title: '', description: '' };
    return m.variants[dayOfYear(date || new Date()) % m.variants.length];
  }

  /* ---------------- 2. 记录 ---------------- */
  let pets = Math.max(0, Number(store.get('pets', '0')) || 0);
  let daily = store.json('daily', null);
  if (!daily || daily.day !== dayKey()) daily = { day: dayKey(), pets: 0, focus: 0 };
  function saveDaily() { store.save('daily', daily); }

  function mondayKey() {
    const d = new Date();
    const off = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - off);
    d.setHours(0, 0, 0, 0);
    return dayKey(d);
  }
  let week = store.json('week', null);
  if (!week || week.start !== mondayKey()) week = { start: mondayKey(), focus: 0 };
  function weekMinutes() { return Math.round((week.focus || 0) / 60); }

  /* ---------------- 3. 声音（Web Audio，无外部文件） ---------------- */
  const Sound = {
    ctx: null, master: null, bus: null, nodes: [], ambType: 'off', croakTimer: 0, muted: true,

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      this.bus = this.ctx.createGain();
      this.bus.gain.value = 1;
      this.bus.connect(this.master);
      return this.ctx;
    },
    setMuted(muted) {
      this.muted = muted;
      const ctx = this.ensure();
      if (!ctx) return;
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
      if (muted) this.stopAmbient();
    },
    noise() {
      if (this._noise) return this._noise;
      const ctx = this.ctx;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this._noise = buf;
      return buf;
    },
    pop() {
      const ctx = this.ensure(); if (!ctx || this.muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(560, t);
      o.frequency.exponentialRampToValueAtTime(170, t + 0.13);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
      o.connect(g).connect(this.master);
      o.start(t); o.stop(t + 0.21);
    },
    bell() {
      const ctx = this.ensure(); if (!ctx || this.muted) return;
      const t = ctx.currentTime;
      [880, 1320, 1760].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.16 / (i + 1), t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4 - i * 0.4);
        o.connect(g).connect(this.master);
        o.start(t); o.stop(t + 2.5);
      });
    },
    croak() {
      const ctx = this.ctx; if (!ctx || this.muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(300 + Math.random() * 90, t);
      o.frequency.exponentialRampToValueAtTime(178, t + 0.18);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      lfo.frequency.value = 32; lg.gain.value = 0.025;
      lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(this.bus);
      o.start(t); o.stop(t + 0.3); lfo.start(t); lfo.stop(t + 0.3);
    },
    stopAmbient() {
      clearInterval(this.croakTimer);
      this.croakTimer = 0;
      const ctx = this.ctx;
      if (!ctx) { this.nodes = []; this.ambType = 'off'; return; }
      const t = ctx.currentTime;
      this.bus.gain.cancelScheduledValues(t);
      this.bus.gain.setTargetAtTime(0, t, 0.22);
      const dying = this.nodes;
      this.nodes = [];
      this.bus = ctx.createGain();
      this.bus.gain.value = 1;
      this.bus.connect(this.master);
      setTimeout(() => dying.forEach((n) => { try { n.stop ? n.stop() : n.disconnect(); } catch {} }), 900);
      this.ambType = 'off';
    },
    setAmbient(type) {
      if (this.ambType === type && type !== 'off') return;
      this.stopAmbient();
      if (type === 'off') return;
      const ctx = this.ensure(); if (!ctx) return;
      this.ambType = type;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = this.noise(); src.loop = true;
      this.nodes.push(src);

      if (type === 'rain') {
        const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
        hp.type = 'highpass'; hp.frequency.value = 760;
        lp.type = 'lowpass'; lp.frequency.value = 5600;
        g.gain.value = 0.0001;
        src.connect(hp).connect(lp).connect(g).connect(this.bus);
        g.gain.setTargetAtTime(0.085, t, 0.6);
        this.nodes.push(g);
      } else if (type === 'pond') {
        const lp = ctx.createBiquadFilter(), g = ctx.createGain();
        lp.type = 'lowpass'; lp.frequency.value = 420;
        g.gain.value = 0.0001;
        src.connect(lp).connect(g).connect(this.bus);
        g.gain.setTargetAtTime(0.05, t, 0.6);
        this.nodes.push(g);
        this.croakTimer = setInterval(() => { if (Math.random() < 0.72) this.croak(); }, 2400);
      } else if (type === 'wind') {
        const bp = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.8;
        g.gain.value = 0.0001;
        lfo.frequency.value = 0.07; lg.gain.value = 0.035;
        lfo.connect(lg).connect(g.gain);
        src.connect(bp).connect(g).connect(this.bus);
        g.gain.setTargetAtTime(0.06, t, 0.8);
        lfo.start(t);
        this.nodes.push(g, lfo);
      }
      src.start(t);
    }
  };

  // 夜间模式：22:00–05:00 首次进入自动开启，用户手动切换后以选择为准
  const nightBtn = $('#night-toggle');
  const isNightHour = () => { const h = new Date().getHours(); return h >= 22 || h < 5; };
  let nightOn = store.get('night', '') === '' ? isNightHour() : store.get('night') === '1';
  function applyNight(on) {
    root.dataset.night = on ? 'on' : 'off';
    if (!nightBtn) return;
    nightBtn.setAttribute('aria-pressed', String(on));
    nightBtn.setAttribute('aria-label', on ? '关闭夜间模式' : '打开夜间模式');
    nightBtn.title = on ? '夜间模式：开' : '夜间模式：关';
  }
  nightBtn?.addEventListener('click', () => {
    nightOn = !nightOn;
    store.set('night', nightOn ? '1' : '0');
    applyNight(nightOn);
  });

  let soundOn = store.get('sound', '0') === '1';
  const soundBtn = $('#sound-toggle');
  function syncSoundUi() {
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.setAttribute('aria-label', soundOn ? '关闭声音' : '打开声音');
    soundBtn.title = soundOn ? '声音：开' : '声音：关';
    $('#ambient').dataset.disabled = String(!soundOn);
  }
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    store.set('sound', soundOn ? '1' : '0');
    Sound.setMuted(!soundOn);
    syncSoundUi();
    if (soundOn) {
      Sound.ensure();
      Sound.pop();
      if (currentAmbient !== 'off') Sound.setAmbient(currentAmbient);
      toast('声音打开了，会有轻轻的回应。');
    } else {
      toast('已静音。');
    }
  });

  /* ---------------- 4. 心情切换 ---------------- */
  const panel = $('#mood-panel');
  let swapTimer = 0, popTimer = 0;

  function applyMood(key, options = {}) {
    const m = MOODS[key];
    if (!m) return;
    const { animate = false, announce = true, silent = false } = options;
    const changed = currentMood !== key;
    currentMood = key;

    $$('.mood-tab').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mood === key)));
    panel.style.setProperty('--mood-color', m.color);
    root.dataset.mood = key;
    $('#mood-label').textContent = m.label;
    const copy = moodVariant(key);
    $('#mood-title').textContent = copy.title;
    $('#mood-description').textContent = copy.description;
    $('#mood-stamp').textContent = m.stamp;
    $('#note-icon').textContent = m.noteIcon;
    $('#note-bottom').textContent = m.note;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', m.color);
    if (announce) $('#mood-live').textContent = m.response;
    store.set('mood', key);

    const img = $('#mood-image');
    clearTimeout(swapTimer); clearTimeout(popTimer);
    if (animate && changed && canAnimate()) {
      panel.classList.remove('is-popping');
      panel.classList.add('is-swapping');
      swapTimer = setTimeout(() => {
        // 换图的同时才切换姿态，否则旧图会被新心情的 object-fit 撑变形
        panel.dataset.mood = key;
        img.src = m.img; img.alt = m.alt;
        panel.classList.remove('is-swapping');
        panel.classList.add('is-popping');
        popTimer = setTimeout(() => panel.classList.remove('is-popping'), 800);
      }, 330);
    } else {
      panel.dataset.mood = key;
      img.src = m.img; img.alt = m.alt;
    }

    const buddyImg = $('#buddy-img');
    if (buddyImg) {
      buddyImg.src = m.img;
      buddyImg.alt = '';
    }
    const cardImg = $('#postcard-image');
    if (cardImg) { cardImg.src = m.img; cardImg.alt = '今天的' + m.name; }
    const dlg = $('#card-dialog');
    if (dlg) dlg.dataset.mood = key;

    if (!silent) syncSaveLabel();
  }

  $$('.mood-tab').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.mood === currentMood) return;
    applyMood(b.dataset.mood, { animate: true });
  }));

  // 切换后的一次性小反应
  function moodReaction() {
    if (!canAnimate()) return;
    const b = $('.mood-tab[aria-pressed="true"]');
    if (!b) return;
    b.animate?.(
      [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-4px) scale(1.03)' }, { transform: 'translateY(0) scale(1)' }],
      { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' }
    );
  }

  /* ---- 心情日历 ---- */
  function syncSaveLabel() {
    const log = store.json('moodlog', {});
    const saved = log[dayKey()] === currentMood;
    const label = $('#mood-save-label');
    if (label) label.textContent = saved ? '已经收好了 ✓' : '收藏这份心情';
  }

  let activeDay = '';

  function streakDays(log) {
    let n = 0;
    const d = new Date();
    if (!log[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (log[dayKey(d)]) {
      n++;
      d.setDate(d.getDate() - 1);
      if (n > 3650) break;
    }
    return n;
  }

  function clearDayNote() {
    activeDay = '';
    const note = $('#mood-cal-note');
    if (note) note.classList.remove('show');
    $$('.mood-cal__day').forEach((el) => el.classList.remove('is-active'));
  }

  function showDayNote(key, d, mood) {
    const note = $('#mood-cal-note');
    if (!note) return;
    const m = MOODS[mood];
    note.textContent = `${mdLabel(d)} · ${m.name} —— ${moodVariant(mood, d).title.replace(/\n/g, '')}`;
    note.classList.add('show');
    activeDay = key;
    $$('.mood-cal__day').forEach((el) => el.classList.toggle('is-active', el.dataset.day === key));
  }

  function renderCal() {
    const host = $('#mood-cal');
    if (!host) return;
    clearDayNote();
    const log = store.json('moodlog', {});
    host.innerHTML = '';
    const today = new Date();
    const counts = {};
    let days = 0;
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = dayKey(d);
      const mood = log[k] && MOODS[log[k]] ? log[k] : '';
      const chip = document.createElement(mood ? 'button' : 'span');
      if (mood) {
        chip.type = 'button';
        chip.dataset.day = k;
        chip.dataset.mood = mood;
      }
      chip.className = 'mood-cal__day' + (mood ? ' has-mood' : '') + (i === 0 ? ' is-today' : '');
      chip.innerHTML = '<i></i><em>' + d.getDate() + '</em>';
      if (mood) {
        chip.style.background = MOODS[mood].color;
        chip.querySelector('i').style.background = 'rgba(255,255,255,.72)';
        chip.title = mdLabel(d) + ' · ' + MOODS[mood].name;
        chip.setAttribute('aria-label', mdLabel(d) + '，' + MOODS[mood].name + '，点一下看看那天');
        counts[mood] = (counts[mood] || 0) + 1;
        days++;
        chip.addEventListener('click', () => {
          if (activeDay === k) { clearDayNote(); return; }
          showDayNote(k, d, mood);
        });
      } else {
        chip.setAttribute('aria-label', mdLabel(d) + '，没有记录');
      }
      host.appendChild(chip);
    }
    // 窄屏是可横向滑动的，默认停在最右端，让"今天"在视野里
    if (host.scrollWidth > host.clientWidth + 2) {
      requestAnimationFrame(() => { host.scrollLeft = host.scrollWidth; });
    }
    const text = $('#mood-cal-text');
    if (!text) return;
    const streak = streakDays(log);
    const streakEl = $('#mood-cal-streak');
    if (streakEl) {
      streakEl.hidden = streak < 2;
      streakEl.textContent = '连续 ' + streak + ' 天';
    }
    if (!days) {
      text.textContent = '还没有记录，从今天开始吧。';
    } else {
      const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      text.textContent = `最近两周记了 ${days} 天 · 最多的是${MOODS[top].name}`;
    }
  }

  $('#mood-save').addEventListener('click', () => {
    const log = store.json('moodlog', {});
    const k = dayKey();
    if (log[k] === currentMood) {
      toast('今天这份心情已经收好啦，明天再来收一次。');
      return;
    }
    log[k] = currentMood;
    store.save('moodlog', log);
    renderCal();
    syncSaveLabel();
    const chip = $('.mood-cal__day.is-today');
    if (chip && canAnimate()) {
      chip.animate?.(
        [{ transform: 'translateY(-3px) scale(1.12)' }, { transform: 'translateY(0) scale(1)' }],
        { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' }
      );
    }
    toast(`已收进心情日历 · ${mdLabel(new Date())} · ${MOODS[currentMood].name}`);
  });

  /* ---------------- 5. 首屏摸奶蛙 ---------------- */
  const frog = $('#frog-touch');
  const scene = $('#hero-scene');
  const bubble = $('#pet-bubble');
  let bubbleTimer = 0;

  const petLines = [
    '收到，你的快乐搭子上线啦。',
    '抱一下。今天也辛苦了。',
    '摸摸肚子，烦恼少一点。',
    '别急，我一直在这里。',
    '你看，快乐其实很小一只。',
    '再摸一下？蛙不介意。',
    '圆滚滚的，也是有力量的。',
    '今天的你，已经被记下来了。'
  ];
  // 同一个动作，不同心情下说法不一样
  const moodPetLines = {
    chill: ['躺着也可以是一种认真。', '别急着起来，再靠一会儿。', '今天没有必须完成的事。'],
    brave: ['你刚才那一步，我看见了。', '怕也没关系，往前走就是了。', '不用准备好，路上再长。'],
    tired: ['先别闹，让我靠一会儿。', '没电就先充，别硬撑。', '今天唯一的任务，是不做任何事。'],
    happy: ['嘿嘿，被你摸到了。', '今天的好事，记得存起来。', '你笑的时候，我也跟着轻一点。']
  };
  const hugLines = {
    soft: ['抱到了，这样就好。', '嗯，我在。', '先抱一会儿，不用说话。'],
    deep: ['抱久一点也没关系。', '你已经很努力了，真的。', '这一下，替你挡住一点点风。']
  };
  const angryLines = ['好啦好啦，腮帮子要炸了。', '别戳啦，蛙要鼓起来了。', '再戳就变成气球了。'];

  // 摸到这些数字时，奶蛙会说点不一样的
  const MILESTONES = {
    10: '第十下。你好像很会摸蛙。',
    50: '第五十下。我们算认识了吧。',
    100: '第一百下。你把我当朋友了，对不对。',
    200: '第两百下。这只蛙有点舍不得你了。',
    365: '第三百六十五下。一年份的温柔，都收到了。'
  };
  const MILESTONE_KEYS = Object.keys(MILESTONES).map(Number).sort((a, b) => a - b);

  function pickPetLine() {
    const pool = moodPetLines[currentMood] || [];
    if (pool.length && Math.random() < 0.55) return pick(pool);
    return pick(petLines);
  }

  function milestoneFor(before, after) {
    return MILESTONE_KEYS.find((n) => before < n && after >= n) || 0;
  }

  function celebrate() {
    scene.classList.remove('is-milestone');
    void scene.offsetWidth;
    scene.classList.add('is-milestone');
    setTimeout(() => scene.classList.remove('is-milestone'), 1800);
    navigator.vibrate?.([8, 40, 12, 40, 18]);
    if (soundOn) Sound.bell();
  }

  function squish() {
    frog.classList.remove('is-petting');
    void frog.offsetWidth;
    frog.classList.add('is-petting');
    setTimeout(() => frog.classList.remove('is-petting'), 700);
  }

  function timeGreeting() {
    const h = new Date().getHours();
    if (h < 5) return '这么晚还没睡？奶蛙陪你一小会儿。';
    if (h < 9) return '早安。今天也慢慢来。';
    if (h < 12) return '上午好，先喝口水吧。';
    if (h < 14) return '中午了，记得吃饭。';
    if (h < 18) return '下午好。要不要放空五分钟？';
    if (h < 22) return '晚上好。今天辛苦了。';
    return '夜深了，早点休息。';
  }

  function say(text, ms = 3300) {
    bubble.textContent = text;
    bubble.classList.add('visible');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('visible'), ms);
  }

  function updatePetHint() {
    const hint = $('#pet-hint-text');
    if (!hint) return;
    hint.textContent = pets > 0
      ? `已收到 ${pets} 份温柔 · 长按可以抱久一点`
      : '轻轻点一下；长按，可以抱抱';
  }

  function burst(count) {
    if (!canAnimate()) return;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'heart-particle';
      p.textContent = i % 3 === 0 ? '✦' : '♡';
      p.setAttribute('aria-hidden', 'true');
      p.style.cssText = `left:${38 + Math.random() * 30}%;top:${32 + Math.random() * 20}%;--dx:${(Math.random() - 0.5) * 190}px;--rot:${(Math.random() - 0.5) * 80}deg;animation-delay:${i * 55}ms;font-size:${13 + Math.random() * 15}px`;
      scene.appendChild(p);
      setTimeout(() => p.remove(), 2000);
    }
  }

  function countPet() {
    pets++;
    daily.pets++;
    store.set('pets', pets);
    saveDaily();
    updatePetHint();
  }

  function pet() {
    const before = pets;
    countPet();
    const hit = milestoneFor(before, pets);
    squish();
    if (hit) {
      say(MILESTONES[hit], 4600);
      burst(16);
      celebrate();
      return;
    }
    say(pickPetLine());
    Sound.pop();
    navigator.vibrate?.(12);
    burst(5);
  }

  function angry() {
    frog.classList.remove('is-petting');
    frog.classList.add('is-angry');
    say(pick(angryLines));
    setTimeout(() => frog.classList.remove('is-angry'), 900);
    navigator.vibrate?.([10, 40, 14]);
    burst(2);
  }

  /* 长按抱抱 */
  let hugDelay = 0, hugRaf = 0, hugLevel = 0, hugging = false, pressAt = 0;

  function startHug() {
    hugging = true;
    hugLevel = 0;
    frog.classList.add('is-hugging');
    frog.style.setProperty('--hug', '0');
    const t0 = performance.now();
    const step = () => {
      if (!hugging) return;
      const p = Math.min(1, (performance.now() - t0) / 1700);
      hugLevel = p;
      frog.style.setProperty('--hug', p.toFixed(3));
      if (p < 1) hugRaf = requestAnimationFrame(step);
    };
    step();
    navigator.vibrate?.(18);
    Sound.pop();
  }

  function endHug() {
    hugging = false;
    cancelAnimationFrame(hugRaf);
    const level = hugLevel;
    frog.classList.remove('is-hugging');
    frog.style.setProperty('--hug', '0');
    const before = pets;
    countPet();
    const hit = milestoneFor(before, pets);
    if (hit) {
      say(MILESTONES[hit], 4700);
      celebrate();
    } else {
      say(pick(level > 0.62 ? hugLines.deep : hugLines.soft), 3600);
      navigator.vibrate?.(16);
      if (level > 0.62) Sound.bell();
    }
    burst(5 + Math.round(level * 9) + (hit ? 8 : 0));
  }

  frog.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pressAt = performance.now();
    hugging = false;
    clearTimeout(hugDelay);
    hugDelay = setTimeout(startHug, 340);
  });

  const release = (e) => {
    clearTimeout(hugDelay);
    if (!pressAt) return;
    if (hugging) { endHug(); pressAt = 0; return; }
    const held = performance.now() - pressAt;
    pressAt = 0;
    if (held < 0) return;
    tapTimes = tapTimes.filter((t) => performance.now() - t < 900);
    tapTimes.push(performance.now());
    if (tapTimes.length >= 3) { tapTimes = []; angry(); return; }
    pet();
  };
  let tapTimes = [];
  frog.addEventListener('pointerup', release);
  frog.addEventListener('pointercancel', () => {
    clearTimeout(hugDelay);
    if (hugging) {
      hugging = false;
      cancelAnimationFrame(hugRaf);
      frog.classList.remove('is-hugging');
      frog.style.setProperty('--hug', '0');
    }
    pressAt = 0;
  });
  frog.addEventListener('contextmenu', (e) => e.preventDefault());
  frog.addEventListener('click', (e) => { if (e.detail === 0) pet(); });

  ['pointerleave', 'pointerout'].forEach((ev) => frog.addEventListener(ev, () => {
    if (hugging) return;
    clearTimeout(hugDelay);
  }));

  $('#hero-pet').addEventListener('click', () => { pet(); });
  $$('[data-pet]').forEach((b) => b.addEventListener('click', () => {
    $('#home').scrollIntoView({ behavior: canAnimate() ? 'smooth' : 'auto' });
    setTimeout(pet, 260);
  }));

  /* 视差 */
  let rafId = 0, nx = 0, ny = 0;
  scene.addEventListener('pointermove', (e) => {
    if (!canAnimate() || e.pointerType !== 'mouse') return;
    const r = scene.getBoundingClientRect();
    nx = (e.clientX - r.left) / r.width - 0.5;
    ny = (e.clientY - r.top) / r.height - 0.5;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      scene.style.setProperty('--mx', (nx * 28).toFixed(2) + 'px');
      scene.style.setProperty('--my', (ny * 20).toFixed(2) + 'px');
      scene.style.setProperty('--tilt', (nx * 3.4).toFixed(2) + 'deg');
    });
  });
  scene.addEventListener('pointerleave', () => {
    scene.style.setProperty('--mx', '0px');
    scene.style.setProperty('--my', '0px');
    scene.style.setProperty('--tilt', '0deg');
  });

  /* ---------------- 6. 放空计时器 ---------------- */
  let duration = 300, remaining = 300, running = false, deadline = 0, ticker = 0, hasStarted = false;
  const circumference = 2 * Math.PI * 102;
  const ringBar = $('#buddy-ring-bar');
  const BUDDY_C = 2 * Math.PI * 41;
  if (ringBar) ringBar.style.strokeDasharray = String(BUDDY_C);
  const baseTitle = document.title;
  const card = $('#timer-card');

  function fmt(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60);
  }

  function renderTimer() {
    const text = fmt(remaining);
    const el = $('#timer-time');
    el.textContent = text;
    el.setAttribute('aria-label', `剩余 ${Math.floor(remaining / 60)} 分 ${Math.ceil(remaining % 60)} 秒`);
    $('#timer-progress').style.strokeDashoffset = String(circumference * (1 - remaining / duration));
    if (ringBar) ringBar.style.strokeDashoffset = String(BUDDY_C * (1 - Math.max(0, Math.min(1, remaining / duration))));
    if (running) {
      const phase = (duration - remaining) % 8;
      document.title = `${text} · ${phase < 4 ? '吸气' : '呼气'} — 奶蛙陪你放空`;
    }
  }

  function lockDurations(locked) { $$('.duration-button').forEach((b) => { b.disabled = locked; }); }

  let scrollLock = 0;
  function enterImmersive() {
    if (document.body.classList.contains('immersive')) return;
    scrollLock = window.scrollY;
    document.body.style.top = `-${scrollLock}px`;
    document.body.classList.add('immersive');
  }
  function exitImmersive() {
    if (!document.body.classList.contains('immersive')) return;
    document.body.classList.remove('immersive');
    document.body.style.top = '';
    window.scrollTo(0, scrollLock);
  }

  let finishPending = false;

  function finish() {
    clearInterval(ticker); ticker = 0;
    remaining = 0; running = false; hasStarted = false;
    const away = document.hidden;
    renderTimer();
    document.title = away ? '✓ 放空结束 · 回来看奶蛙一眼' : baseTitle;
    card.classList.remove('running', 'paused');
    card.classList.add('finished');
    $('#buddy').classList.remove('is-timing');
    setTimeout(() => card.classList.remove('finished'), 1600);
    $('#timer-state').textContent = '充电完成';
    $('#timer-prompt').textContent = '谢谢你，照顾了自己';
    $('#timer-action').textContent = '再陪我一会';
    $('#timer-icon').textContent = '▷';
    daily.focus += duration;
    saveDaily();
    week.focus += duration;
    store.save('week', week);
    const mins = Math.round(duration / 60);
    $('#timer-bottom').textContent = `这 ${mins} 分钟，是送给自己的温柔。本周陪你放空了 ${weekMinutes()} 分钟。`;
    lockDurations(false);
    exitImmersive();
    Sound.stopAmbient();
    currentAmbient = 'off';
    syncAmbientUi();
    if (away) {
      // 人在别的标签页：别让提示音和 toast 白响，留到回来再说
      finishPending = true;
    } else {
      Sound.bell();
      toast('放空结束。现在，带着一点轻盈回去吧。');
    }
  }

  function tick() {
    remaining = Math.max(0, (deadline - Date.now()) / 1000);
    renderTimer();
    if (remaining <= 0) { finish(); return; }
    const phase = (duration - remaining) % 8;
    $('#timer-prompt').textContent = phase < 4 ? '慢慢吸气，轻轻放松' : '慢慢呼气，放下紧绷';
  }

  function startTimer() {
    if (remaining <= 0) remaining = duration;
    deadline = Date.now() + remaining * 1000;
    running = true; hasStarted = true;
    card.classList.add('running');
    card.classList.remove('paused', 'finished');
    $('#buddy').classList.add('is-timing');
    $('#timer-state').textContent = '奶蛙正在陪你';
    $('#timer-action').textContent = '暂停一下';
    $('#timer-icon').textContent = 'Ⅱ';
    $('#timer-bottom').textContent = '不必看时间，按自己的节奏呼吸。';
    lockDurations(true);
    clearInterval(ticker);
    tick();
    ticker = setInterval(tick, 250);
    enterImmersive();
  }

  function pauseTimer() {
    remaining = Math.max(0, (deadline - Date.now()) / 1000);
    if (remaining <= 0) { finish(); return; }
    running = false;
    clearInterval(ticker); ticker = 0;
    card.classList.add('paused');
    document.title = baseTitle;
    $('#timer-state').textContent = '暂停也没关系';
    $('#timer-prompt').textContent = '准备好时，再继续';
    $('#timer-action').textContent = '继续放空';
    $('#timer-icon').textContent = '▷';
    renderTimer();
  }

  function resetTimer() {
    clearInterval(ticker); ticker = 0;
    running = false; hasStarted = false; remaining = duration;
    card.classList.remove('running', 'paused', 'finished');
    $('#buddy').classList.remove('is-timing');
    renderTimer();
    document.title = baseTitle;
    $('#timer-state').textContent = '随时为你留白';
    $('#timer-prompt').textContent = '留一点空白给自己';
    $('#timer-action').textContent = '开始放空';
    $('#timer-icon').textContent = '▷';
    $('#timer-bottom').textContent = '这一刻，你不用成为任何人。';
    lockDurations(false);
    exitImmersive();
  }

  $('#timer-start').addEventListener('click', () => (running ? pauseTimer() : startTimer()));
  $('#timer-reset').addEventListener('click', () => { resetTimer(); toast('已经归零，随时可以重新开始。'); });
  $('#exit-focus').addEventListener('click', () => { if (running) pauseTimer(); exitImmersive(); });

  $$('.duration-button').forEach((b) => b.addEventListener('click', () => {
    if (hasStarted) return;
    duration = Number(b.dataset.minutes) * 60;
    resetTimer();
    $$('.duration-button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (running) tick();
    if (finishPending) {
      finishPending = false;
      document.title = baseTitle;
      if (soundOn) Sound.bell();
      const mins = Math.round(duration / 60);
      toast(`你不在的时候，放空结束了。刚才那 ${mins} 分钟，奶蛙一直陪着。`);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.body.classList.contains('immersive')
        && !e.target.closest('button, input, textarea, select, a[href]')) {
      e.preventDefault();
      if (running) pauseTimer(); else startTimer();
      return;
    }
    if (e.key === 'Escape' && document.body.classList.contains('immersive')) {
      if (running) pauseTimer();
      exitImmersive();
    }
  });

  /* 环境声选择 */
  let currentAmbient = 'off';
  function syncAmbientUi() {
    $$('#ambient button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ambient === currentAmbient)));
  }
  $$('#ambient button').forEach((b) => b.addEventListener('click', () => {
    const type = b.dataset.ambient;
    if (!soundOn) {
      soundOn = true;
      store.set('sound', '1');
      Sound.setMuted(false);
      syncSoundUi();
    }
    if (type === 'off') {
      Sound.stopAmbient();
      currentAmbient = 'off';
    } else {
      Sound.setAmbient(type);
      currentAmbient = type;
      if (running) Sound.croak && type === 'pond' && Sound.croak();
    }
    syncAmbientUi();
  }));

  /* ---------------- 7. 心情卡 ---------------- */
  const HELLO_IMG = 'assets/frogs/hello.webp';
  const extraQuotes = [
    { title: '今天的你，\n也值得一个拥抱。', color: '#eee6d2', img: HELLO_IMG },
    { title: '日子慢慢过，\n快乐一点点攒。', color: '#f7e8b0', img: HELLO_IMG },
    { title: '不必很厉害，\n也值得被喜欢。', color: '#e8eddd', img: HELLO_IMG },
    { title: '允许一切发生，\n也允许自己休息。', color: '#e5e7f0', img: HELLO_IMG }
  ];
  function cardImage() { return cardQuote.img || MOODS[currentMood].img; }
  function isPhoto(src) { return src.indexOf('tired') > -1; }
  const quotes = [...MOOD_KEYS.map((k) => ({ title: moodVariant(k).title, color: MOODS[k].color })), ...extraQuotes];
  let cardQuote = quotes[0];
  let lastFocus = null;
  const dialog = $('#card-dialog');

  function cardSummary() {
    const parts = [`今天是${MOODS[currentMood].name}`];
    if (daily.pets > 0) parts.push(`摸了奶蛙 ${daily.pets} 下`);
    if (daily.focus > 0) parts.push(`放空了 ${Math.round(daily.focus / 60)} 分钟`);
    const wk = weekMinutes();
    if (wk > 0) return parts.join('，') + `。\n本周一共陪自己放空 ${wk} 分钟。`;
    return parts.join('，') + '。';
  }

  function renderCard() {
    $('#postcard-title').textContent = cardQuote.title;
    $('#dialog-preview').style.background = cardQuote.color;
    $('#postcard-to').textContent = 'TO: ' + ($('#card-name').value.trim() || '可爱的你');
    const img = $('#postcard-image');
    const src = cardImage();
    img.src = src;
    img.alt = cardQuote.img ? '奶蛙朝你挥手' : '今天的' + MOODS[currentMood].name;
    img.classList.toggle('is-photo', isPhoto(src));
    dialog.dataset.mood = currentMood;
    const stats = $('#card-stats');
    if (stats) stats.textContent = cardSummary();
  }

  function randomQuote() {
    const pool = quotes.filter((q) => q.title !== cardQuote.title);
    cardQuote = pick(pool);
    renderCard();
  }

  function openCard(fromMood) {
    lastFocus = document.activeElement;
    if (fromMood) {
      const m = MOODS[currentMood];
      cardQuote = { title: moodVariant(currentMood).title, color: m.color };
    } else {
      randomQuote();
    }
    renderCard();
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    $('#buddy').classList.remove('show');
    setTimeout(() => dialog.focus({ preventScroll: true }), 40);
  }
  function closeCard() { if (dialog.open) dialog.close(); }

  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    lastFocus?.focus({ preventScroll: true });
    updateBuddyVisibility();
  });
  $('#mood-card').addEventListener('click', () => openCard(true));
  $('#surprise-button').addEventListener('click', () => openCard(false));
  $('#dialog-close').addEventListener('click', closeCard);
  $('#card-name').addEventListener('input', renderCard);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeCard();
    }
  });

  $('#shuffle-card').addEventListener('click', () => {
    const stage = $('#dialog-preview');
    if (!canAnimate()) { randomQuote(); return; }
    stage.classList.add('is-flipping');
    setTimeout(randomQuote, 195);
    setTimeout(() => stage.classList.remove('is-flipping'), 430);
  });

  /* --- 导出 --- */
  function fitText(ctx, text, maxWidth, startSize, minSize, weight = 500) {
    let size = startSize;
    do {
      ctx.font = `${weight} ${size}px "PingFang SC","Microsoft YaHei",sans-serif`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    } while (size > minSize);
    return size;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  async function buildCardBlob() {
    const src = cardImage();
    const img = new Image();
    img.src = src;
    if (img.decode) { try { await img.decode(); } catch {} }

    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1440;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = cardQuote.color;
    ctx.fillRect(0, 0, 1080, 1440);

    ctx.fillStyle = 'rgba(41,50,33,.62)';
    ctx.font = '500 22px Arial, "PingFang SC", sans-serif';
    ctx.fillText('A NOTE FROM NAIWA', 86, 106);

    ctx.fillStyle = '#293221';
    cardQuote.title.split('\n').forEach((line, i) => {
      fitText(ctx, line, 900, 76, 42, 600);
      ctx.fillText(line, 84, 246 + i * 108);
    });

    const top = 430, areaH = 700;
    if (isPhoto(src)) {
      const w = 720, x = (1080 - w) / 2;
      ctx.save();
      roundRect(ctx, x, top, w, areaH, 36);
      ctx.clip();
      const scale = Math.max(w / img.naturalWidth, areaH / img.naturalHeight);
      const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      ctx.drawImage(img, x + (w - dw) / 2, top + (areaH - dh) / 2, dw, dh);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      let h = areaH, w = h * img.naturalWidth / img.naturalHeight;
      if (w > 880) { w = 880; h = w * img.naturalHeight / img.naturalWidth; }
      ctx.drawImage(img, (1080 - w) / 2, top + (areaH - h) / 2, w, h);
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(125,136,108,.28)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(86, 1210); ctx.lineTo(994, 1210); ctx.stroke();

    ctx.fillStyle = 'rgba(60,72,48,.7)';
    ctx.font = '400 24px "PingFang SC","Microsoft YaHei",sans-serif';
    cardSummary().split('\n').forEach((line, i) => {
      ctx.fillText(line, 86, 1258 + i * 38);
    });

    const recipient = $('#card-name').value.trim() || '可爱的你';
    ctx.fillStyle = '#4d5741';
    fitText(ctx, 'TO: ' + recipient, 520, 27, 18, 500);
    ctx.fillText('TO: ' + recipient, 86, 1368);
    ctx.font = '400 24px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(77,87,65,.85)';
    ctx.fillText('WITH LOVE, 奶蛙', 994, 1368);
    ctx.textAlign = 'left';

    return await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('export failed'))), 'image/png');
    });
  }

  const downloadButton = $('#download-card');
  downloadButton.addEventListener('click', async () => {
    downloadButton.disabled = true;
    try {
      const blob = await buildCardBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `奶蛙-${MOODS[currentMood].name}-好心情.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast('心情卡片已生成，愿今天对你温柔一点。');
    } catch (err) {
      console.error(err);
      toast('图片暂时没准备好，请稍后再试一次。');
    } finally {
      downloadButton.disabled = false;
    }
  });

  const shareButton = $('#share-card');
  if (shareButton && navigator.canShare) {
    try {
      const probe = new File([new Blob(['x'], { type: 'image/png' })], 'a.png', { type: 'image/png' });
      if (navigator.canShare({ files: [probe] })) shareButton.hidden = false;
    } catch {}
  }
  shareButton?.addEventListener('click', async () => {
    try {
      const blob = await buildCardBlob();
      const file = new File([blob], `naiwa-${currentMood}.png`, { type: 'image/png' });
      await navigator.share({
        files: [file],
        title: '奶蛙送给你的一点好心情',
        text: cardQuote.title.replace(/\n/g, '')
      });
    } catch (err) {
      if (err && err.name !== 'AbortError') toast('这台设备暂时没法直接分享，试试保存图片吧。');
    }
  });

  /* ---------------- 8. 跟随滚动的小奶蛙 ---------------- */
  const buddy = $('#buddy');
  let buddyVisible = false;
  const sceneEls = ['moods', 'focus', 'souvenir'].map((id) => document.getElementById(id)).filter(Boolean);
  function updateBuddyScene() {
    const mid = window.scrollY + window.innerHeight / 2;
    let best = null, bestD = Infinity;
    sceneEls.forEach((el) => {
      const c = el.offsetTop + el.offsetHeight / 2;
      const d = Math.abs(c - mid);
      if (d < bestD) { bestD = d; best = el; }
    });
    const scene = best && bestD < best.offsetHeight ? best.id : '';
    if (scene !== buddy.dataset.scene) buddy.dataset.scene = scene;
  }
  function updateBuddyVisibility() {
    const show = window.scrollY > window.innerHeight * 0.62 && !dialog.open;
    if (show !== buddyVisible) {
      buddyVisible = show;
      buddy.classList.toggle('show', show);
    }
    updateBuddyScene();
  }
  window.addEventListener('scroll', updateBuddyVisibility, { passive: true });
  window.addEventListener('resize', updateBuddyVisibility);
  buddy.addEventListener('click', () => {
    $('#home').scrollIntoView({ behavior: canAnimate() ? 'smooth' : 'auto' });
    buddy.classList.add('wave');
    setTimeout(() => buddy.classList.remove('wave'), 1000);
    setTimeout(() => pet(), 520);
  });

  /* ---------------- 9. 首次进入的仪式 ---------------- */
  const welcome = $('#welcome');
  function closeWelcome() {
    if (welcome.open) welcome.close();
    store.set('visited', '1');
  }
  $$('#welcome [data-pick]').forEach((b) => b.addEventListener('click', () => {
    applyMood(b.dataset.pick, { animate: true });
    closeWelcome();
    setTimeout(() => {
      say(MOODS[b.dataset.pick].response, 3800);
      burst(6);
    }, 420);
  }));
  $('#welcome-skip').addEventListener('click', closeWelcome);
  welcome.addEventListener('close', () => store.set('visited', '1'));
  welcome.addEventListener('click', (e) => {
    if (e.target === welcome) {
      const r = welcome.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeWelcome();
    }
  });

  /* ---------------- 10. 滚动叙事：逐字浮现 ---------------- */
  function splitChars(el) {
    if (!el || el.dataset.split) return;
    el.dataset.split = '1';
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', label);
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          Array.from(n.textContent.replace(/\s+/g, '')).forEach((ch) => {
            const s = document.createElement('span');
            s.className = 'ch';
            s.style.setProperty('--i', i++);
            s.setAttribute('aria-hidden', 'true');
            s.textContent = ch;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    };
    walk(el);
  }
  ['#intro-title', '#moods-title', '#focus-title', '#souvenir-title'].forEach((sel) => splitChars($(sel)));

  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js');
    const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        reveal.unobserve(entry.target);
      }
    }), { threshold: 0.08 });
    $$('.reveal').forEach((el) => reveal.observe(el));

    const navObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      $$('.desktop-nav a').forEach((a) => a.classList.toggle('active', a.hash === '#' + entry.target.id));
    }), { rootMargin: '-15% 0px -50% 0px', threshold: 0 });
    ['home', 'moods', 'focus'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) navObserver.observe(el);
    });
  } else {
    $$('.reveal').forEach((el) => el.classList.add('in-view'));
  }

  /* ---------------- 11. 导航 ---------------- */
  const toggle = $('.menu-toggle');
  const mobileNav = $('#mobile-nav');
  function closeMenu() {
    mobileNav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '展开导航');
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    mobileNav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '收起导航' : '展开导航');
  });
  $$('#mobile-nav a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('click', (e) => { if (!e.target.closest('.site-header')) closeMenu(); });

  /* ---------------- 12. 初始化 ---------------- */
  // 预载四种心情图，切换时不闪
  MOOD_KEYS.forEach((k) => { const i = new Image(); i.src = MOODS[k].img; });

  applyMood(currentMood, { silent: true });
  syncSaveLabel();
  renderCal();
  updatePetHint();
  syncSoundUi();
  syncAmbientUi();
  applyNight(nightOn);
  Sound.muted = !soundOn;
  if (soundOn) Sound.ensure();

  const lastVisit = store.get('lastVisit', '');
  store.set('lastVisit', dayKey());
  const returning = lastVisit && lastVisit !== dayKey() && pets > 0;

  // 安静太久时，奶蛙会主动说一句
  const idleLines = [
    '你还在呀。',
    '要不要一起发会儿呆？',
    '不用做什么，待着就好。',
    '我在这儿，你忙你的。',
    '刚才那阵风，你感觉到了吗？'
  ];
  let idleTimer = 0, lastIdle = 0, lastReset = 0;
  function maybeIdle() {
    if (document.hidden) return;
    if (window.scrollY > window.innerHeight * 0.8) return;
    if (document.querySelector('dialog[open]')) return;
    if (Date.now() - lastIdle < 150000) return;
    lastIdle = Date.now();
    say(pick(idleLines), 4400);
    resetIdle();
  }
  function resetIdle() {
    const now = Date.now();
    if (now - lastReset < 2000) return;
    lastReset = now;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(maybeIdle, 46000);
  }
  ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart']
    .forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }));
  resetIdle();

  setTimeout(() => {
    if (returning) {
      say(`你回来啦。上次到现在，一共摸了 ${pets} 下。`, 4200);
    } else if (pets === 0) {
      say(timeGreeting(), 4200);
    } else {
      say('又见面了。' + timeGreeting(), 3600);
    }
  }, 1500);

  if (!store.get('visited') && !/[?&]nowelcome/.test(location.search)) {
    setTimeout(() => {
      if (document.querySelector('dialog[open]')) return;
      welcome.showModal();
      const first = $('#welcome [data-pick="' + currentMood + '"]');
      first?.focus({ preventScroll: true });
    }, 900);
  }

  renderTimer();
  updateBuddyVisibility();
})();
