// ==UserScript==
// @name         Power BI：面板控制（刷新网页，稳态 点击View → 点击Full screen，带防抖与更稳的全屏判断）
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  若非全屏则点击 View→Full screen；增强全屏判断，避免二次触发把全屏切回；带简洁面板+隐藏/显示开关
// @match        https://app.powerbi.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const LSKEY = (k) => `pbi_auto_fs_${k}`;
  const cfg = {
    intervalSec: +(localStorage.getItem(LSKEY("intervalSec")) || 3600),
    panelVisible:
      (localStorage.getItem(LSKEY("panelVisible")) ?? "true") === "true",
  };

  const SEL = {
    viewBtn: 'button[data-testid="app-bar-view-menu-btn"]',
    fullOpenBtn: 'button[data-testid="open-in-full-screen-btn"]',
    fullExitBtn: 'button[data-testid="exit-full-screen-btn"]',
  };

  const LOCK_MS = 15000; // 成功入全屏后的冻结时间，避免下一轮误触发
  let lockUntil = 0;
  let timer = null;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const visible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect(),
      cs = getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      cs.display !== "none" &&
      cs.visibility !== "hidden"
    );
  };
  const findVisible = (sel, root = document) =>
    Array.from(root.querySelectorAll(sel)).find(visible) || null;
  const clickEl = (el) =>
    ["pointerdown", "mousedown", "mouseup", "click"].forEach((e) =>
      el.dispatchEvent(
        new MouseEvent(e, { bubbles: true, cancelable: true, view: window })
      )
    );
  async function waitVisible(sel, t = 4000, root = document) {
    const start = Date.now();
    while (Date.now() - start < t) {
      const el = findVisible(sel, root);
      if (el) return el;
      await sleep(120);
    }
    return null;
  }

  // ——更稳的全屏判断——
  function isFullScreenNow() {
    if (document.fullscreenElement) return true; // HTML Fullscreen API
    // UI 迹象：存在“退出全屏”按钮/文案
    if (findVisible(SEL.fullExitBtn)) return true;
    const exitByText = Array.from(
      document.querySelectorAll('button,[role="menuitem"]')
    ).some(
      (el) =>
        /exit\s*full\s*screen/i.test((el.innerText || "").trim()) ||
        /退出全屏/.test((el.innerText || "").trim())
    );
    if (exitByText) return true;
    return false;
  }

  async function runOnce() {
    // 防抖：刚进入全屏的一段时间内不再尝试
    if (Date.now() < lockUntil) {
      log("锁定中，跳过");
      return;
    }

    if (isFullScreenNow()) {
      log("检测到已全屏，跳过");
      return;
    }

    const view = await waitVisible(SEL.viewBtn, 5000);
    if (!view) {
      log("找不到 View 按钮");
      return;
    }
    clickEl(view);
    log("已点 View");

    // 菜单弹出后，优先找“打开全屏”；若只出现“退出全屏”，说明此刻其实已是全屏（再保险）
    const openBtn = await waitVisible(SEL.fullOpenBtn, 4000);
    if (!openBtn) {
      if (findVisible(SEL.fullExitBtn)) {
        log("菜单中出现 Exit full screen，判定已全屏，跳过点击");
        return;
      }
      // 文案兜底（本地化）
      const menuItem = Array.from(
        document.querySelectorAll('button,[role="menuitem"]')
      ).find(
        (el) =>
          /full\s*screen/i.test((el.innerText || "").trim()) ||
          /全屏/.test((el.innerText || "").trim())
      );
      if (!menuItem) {
        log("未找到 Full screen 菜单项");
        return;
      }
      clickEl(menuItem);
      log("已点 Full screen(文本匹配)");
    } else {
      await sleep(150);
      clickEl(openBtn);
      log("已点 Full screen(data-testid)");
    }

    // 进入全屏后加锁；同时监听 fullscreenchange，一旦退出全屏解除锁
    lockUntil = Date.now() + LOCK_MS;
  }

  // 监听全屏变化：退出全屏后立即解除锁
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      lockUntil = 0;
      log("检测到退出全屏，解除锁定");
    }
  });

  /*** 面板与隐藏按钮 ***/
  function log(msg) {
    const area = document.getElementById("pbi-auto-log");
    if (area)
      area.textContent =
        `[${new Date().toLocaleTimeString()}] ${msg}\n` + area.textContent;
  }

  function createPanel() {
    const panel = document.createElement("div");
    panel.id = "pbi-auto-panel";
    panel.style.cssText = `
      position:fixed; bottom:60px; right:20px; z-index:999999;
      background:#2f3136; color:#fff; padding:10px; border-radius:10px; width:220px;
      box-shadow:0 8px 20px rgba(0,0,0,.35); ${
        cfg.panelVisible ? "" : "display:none;"
      }
      font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto;
    `;
    panel.innerHTML = `
      <div style="font-weight:600;margin-bottom:6px;">Auto Full Screen</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <label style="white-space:nowrap;">间隔(秒)</label>
        <input id="pbi-intv" type="number" min="1" value="${cfg.intervalSec}"
          style="flex:1;padding:4px;border:1px solid #555;border-radius:8px;background:#1f2227;color:#fff;">
      </div>
      <div style="display:flex;gap:8px;margin-bottom:6px;">
        <button id="pbi-start" style="flex:1;padding:6px;border:0;border-radius:8px;background:#3b82f6;color:#fff;">开始</button>
        <button id="pbi-stop"  style="flex:1;padding:6px;border:0;border-radius:8px;background:#6b7280;color:#fff;" disabled>停止</button>
      </div>
      <div style="margin-bottom:6px;">
        <button id="pbi-run" style="width:100%;padding:6px;border:0;border-radius:8px;background:#10b981;color:#0b1324;">立即执行</button>
      </div>
      <pre id="pbi-auto-log" style="height:110px;overflow:auto;background:#1b1e24;color:#aeb4be;padding:6px;border-radius:6px;"></pre>
    `;
    document.body.appendChild(panel);

    document.getElementById("pbi-intv").addEventListener("change", (e) => {
      cfg.intervalSec = Math.max(1, +e.target.value || 1);
      localStorage.setItem(LSKEY("intervalSec"), cfg.intervalSec);
      if (timer) {
        stop();
        start();
      }
    });
    document.getElementById("pbi-start").addEventListener("click", start);
    document.getElementById("pbi-stop").addEventListener("click", stop);
    document.getElementById("pbi-run").addEventListener("click", runOnce);
  }

  function createToggleBtn() {
    const btn = document.createElement("div");
    btn.title = "显示/隐藏面板 (Alt+Shift+H)";
    btn.textContent = "◉";
    btn.style.cssText = `
      position:fixed; bottom:20px; right:20px; z-index:999999;
      width:32px;height:32px;border-radius:50%;background:#3b3f45;color:#fff;
      display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;
      box-shadow:0 6px 16px rgba(0,0,0,.35); font-size:18px;
    `;
    btn.addEventListener("click", togglePanel);
    document.body.appendChild(btn);
    window.addEventListener("keydown", (e) => {
      if (e.altKey && e.shiftKey && e.code === "KeyH") togglePanel();
    });
  }
  function togglePanel() {
    const p = document.getElementById("pbi-auto-panel");
    if (!p) return;
    cfg.panelVisible = p.style.display === "none";
    p.style.display = cfg.panelVisible ? "" : "none";
    localStorage.setItem(LSKEY("panelVisible"), cfg.panelVisible);
  }

  function start() {
    if (timer) return;
    timer = setInterval(runOnce, cfg.intervalSec * 1000);
    log(`已启动，每 ${cfg.intervalSec}s 执行一次`);
    document.getElementById("pbi-start").disabled = true;
    document.getElementById("pbi-stop").disabled = false;
  }
  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    log("已停止");
    document.getElementById("pbi-start").disabled = false;
    document.getElementById("pbi-stop").disabled = true;
  }

  // 初始化
  createPanel();
  createToggleBtn();
  log("脚本加载完成");
})();
