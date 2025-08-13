// ==UserScript==
// @name         Auto Click Refresh > Refresh now
// @namespace    https://your.namespace/auto-refresh-now
// @version      1.1.0
// @description  定时执行：点击“Refresh”按钮后，再点击菜单项“Refresh now”
// @author       you
// @match        https://*.fabric.microsoft.com/*
// @match        https://app.powerbi.com/* //
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // 主按钮 & 菜单项的选择器 / 文本
  const MAIN_BTN_SELECTOR = '#model-actionbar-refresh';
  const MENU_ITEM_SELECTOR = 'span.dropDown-displayName.trimmedTextWithEllipsis.ng-star-inserted';
  const MENU_ITEM_TEXT = 'Refresh now';

  // 默认间隔秒数
  const DEFAULT_INTERVAL_SEC = load('arn.intervalSec', 300);

  let timer = null;

  // ====== UI 面板 ======
  const css = `
  .arn-panel{position:fixed;right:18px;bottom:18px;z-index:999999;
    background:rgba(30,30,30,.92);color:#fff;border-radius:12px;padding:10px;
    font:12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;
    box-shadow:0 8px 24px rgba(0,0,0,.25);}
  .arn-row{display:flex;align-items:center;gap:8px;margin-top:6px}
  .arn-input{width:88px;padding:6px 8px;border:1px solid rgba(255,255,255,.15);
    background:rgba(255,255,255,.08);color:#fff;border-radius:8px;outline:none;}
  .arn-btn{padding:6px 10px;border:none;border-radius:8px;cursor:pointer;
    background:rgba(255,255,255,.15);color:#fff;}
  .arn-btn:hover{background:rgba(255,255,255,.22);}
  .arn-chip{opacity:.7}
  `;
  injectStyle(css);

  const panel = document.createElement('div');
  panel.className = 'arn-panel';
  panel.innerHTML = `
    <div style="font-weight:600">Auto Refresh now</div>
    <div class="arn-row">
      <span>间隔(秒)</span>
      <input class="arn-input" id="arn-interval" type="number" min="5" step="1" value="${DEFAULT_INTERVAL_SEC}">
      <button class="arn-btn" id="arn-start">开始</button>
      <button class="arn-btn" id="arn-stop" disabled>停止</button>
    </div>
    <div class="arn-row"><span class="arn-chip" id="arn-status">未运行</span></div>
  `;
  document.body.appendChild(panel);

  const $interval = panel.querySelector('#arn-interval');
  const $start = panel.querySelector('#arn-start');
  const $stop = panel.querySelector('#arn-stop');
  const $status = panel.querySelector('#arn-status');

  $interval.addEventListener('change', () => {
    const v = Math.max(5, parseInt($interval.value || '0', 10));
    $interval.value = v;
    save('arn.intervalSec', v);
  });

  $start.addEventListener('click', () => {
    const sec = Math.max(5, parseInt($interval.value || '0', 10));
    save('arn.intervalSec', sec);
    start(sec);
  });

  $stop.addEventListener('click', stop);

  // 自动恢复运行（可改成注释掉）
  if (load('arn.autorun', '0') === '1') {
    start(load('arn.intervalSec', DEFAULT_INTERVAL_SEC));
  }

  // ====== 定时逻辑 ======
  function start(sec) {
    if (timer) clearInterval(timer);
    timer = setInterval(runRefresh, sec * 1000);
    runRefresh(); // 立即执行一次
    $start.disabled = true;
    $stop.disabled = false;
    $status.textContent = `运行中：每 ${sec}s`;
    save('arn.autorun', '1');
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    $start.disabled = false;
    $stop.disabled = true;
    $status.textContent = '未运行';
    save('arn.autorun', '0');
  }

  async function runRefresh() {
    try {
      const mainBtn = await waitFor(() => document.querySelector(MAIN_BTN_SELECTOR), 20, 300);
      if (!mainBtn) return log('主按钮未找到');

      simulateClick(mainBtn);
      log('点击主按钮');

      const menuItem = await waitFor(() => {
        const el = Array.from(document.querySelectorAll(MENU_ITEM_SELECTOR))
          .find(n => (n.textContent || '').trim() === MENU_ITEM_TEXT);
        return el || null;
      }, 20, 300);

      if (!menuItem) return log('"Refresh now" 未找到');

      simulateClick(menuItem);
      log('点击 Refresh now');
      pulse(panel);

    } catch (err) {
      console.error(err);
    }
  }

  // ====== 工具函数 ======
  function waitFor(fn, attempts = 10, intervalMs = 300) {
    return new Promise(resolve => {
      let count = 0;
      const tick = () => {
        try {
          const r = fn();
          if (r) return resolve(r);
        } catch {}
        if (++count >= attempts) return resolve(null);
        setTimeout(tick, intervalMs);
      };
      tick();
    });
  }

  function simulateClick(el) {
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    el.click();
  }

  function pulse(node) {
    node.animate([{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], { duration: 500 });
  }

  function injectStyle(css) {
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

function log(...args) { console.log('[AutoRefreshNow]', ...args); }
  function save(k, v) { try { localStorage.setItem