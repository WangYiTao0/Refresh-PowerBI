// ==UserScript==
// @name         Power BI Auto Refresh
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  自动刷新Power BI数据模型和报表，支持定时刷新和全屏显示
// @author       You
// @match        https://app.powerbi.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  "use strict";

  // 配置常量
  const CONFIG = {
    SEMANTIC_MODEL_INTERVAL: 60 * 60 * 1000, // 1小时
    REPORT_INTERVAL: 30 * 60 * 1000, // 30分钟
    REFRESH_WAIT_TIME: 60 * 1000, // Semantic Model刷新等待时间 60秒
    REPORT_REFRESH_WAIT_TIME: 10 * 1000, // Report刷新等待时间 10秒
    MENU_EXPAND_WAIT: 1000, // 菜单展开等待时间 1秒
  };

  // 全局变量
  let refreshTimer = null;
  let countdownTimer = null;
  let currentPageType = "";
  let isRefreshing = false;
  let countdownSeconds = 0;
  let isIndicatorVisible = true; // 指示器显示状态
  let indicatorElement = null; // 指示器元素引用
  let isFullscreen = false; // 全屏状态

  // 工具函数：等待指定时间
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 模拟F11按键进入浏览器全屏
  function simulateF11() {
    console.log("🖥️ 模拟F11按键进入浏览器全屏");

    // 创建F11按键事件
    const f11Event = new KeyboardEvent("keydown", {
      key: "F11",
      code: "F11",
      keyCode: 122,
      which: 122,
      bubbles: true,
      cancelable: true,
    });

    // 触发事件
    document.dispatchEvent(f11Event);

    // 也尝试直接请求全屏
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    }
  }

  // 获取当前页面类型的刷新间隔
  function getCurrentRefreshInterval() {
    if (currentPageType === "semantic-model") {
      return GM_getValue("semanticModelInterval", 60);
    } else if (currentPageType === "report") {
      return GM_getValue("reportInterval", 30);
    } else {
      return GM_getValue("refreshInterval", 60); // 兼容旧设置
    }
  }

  // 设置当前页面类型的刷新间隔
  function setCurrentRefreshInterval(interval) {
    if (currentPageType === "semantic-model") {
      GM_setValue("semanticModelInterval", interval);
      console.log(`✅ Semantic Model间隔已设置为: ${interval}分钟`);
    } else if (currentPageType === "report") {
      GM_setValue("reportInterval", interval);
      console.log(`✅ Report间隔已设置为: ${interval}分钟`);
    } else {
      GM_setValue("refreshInterval", interval); // 兼容旧设置
      console.log(`✅ 通用间隔已设置为: ${interval}分钟`);
    }
  }

  // 显示通知消息
  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                font-family: Arial, sans-serif;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                background-color: ${
                  type === "error"
                    ? "#e74c3c"
                    : type === "success"
                    ? "#27ae60"
                    : "#3498db"
                };
                animation: slideIn 0.3s ease-out;
            ">
                ${message}
            </div>
            <style>
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // 显示指示器
  function showIndicator() {
    if (indicatorElement && !isIndicatorVisible) {
      indicatorElement.style.display = "flex";
      isIndicatorVisible = true;
      console.log("显示状态指示器");
      showNotification("Power BI 指示器已显示", "info");
    }
  }

  // 隐藏指示器
  function hideIndicator() {
    if (indicatorElement && isIndicatorVisible) {
      indicatorElement.style.display = "none";
      isIndicatorVisible = false;
      console.log("隐藏状态指示器");
      showNotification("Power BI 指示器已隐藏", "info");
    }
  }

  // 切换指示器显示状态
  function toggleIndicator() {
    if (isIndicatorVisible) {
      hideIndicator();
    } else {
      showIndicator();
    }
  }

  // 检查全屏状态
  function checkFullscreenStatus() {
    // 检查浏览器原生全屏
    const browserFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    // 检查Power BI特有的全屏模式（通过URL或DOM结构判断）
    const powerbiFullscreen =
      window.location.href.includes("fullscreen=true") ||
      document.querySelector('[data-testid="fullscreen-container"]') ||
      document.querySelector(".fullscreen-mode") ||
      document.body.classList.contains("fullscreen");

    const currentFullscreen = browserFullscreen && powerbiFullscreen;

    if (currentFullscreen !== isFullscreen) {
      isFullscreen = currentFullscreen;
      console.log("全屏状态变化:", isFullscreen ? "进入全屏" : "退出全屏");

      if (isFullscreen) {
        // 进入全屏时自动隐藏指示器
        hideIndicator();
        showNotification("已进入全屏模式，指示器自动隐藏", "info");
      } else {
        // 退出全屏时自动显示指示器
        showIndicator();
        showNotification("已退出全屏模式，指示器自动显示", "info");
      }
    }
  }

  // 添加快捷键监听
  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", function (e) {
      // 检测 Shift + Alt + H
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        e.stopPropagation();

        console.log("检测到快捷键 Shift+Alt+H");
        toggleIndicator();
      }
    });

    console.log("快捷键监听已设置: Shift+Alt+H 切换显示/隐藏");
  }

  // 设置全屏状态监听
  function setupFullscreenListener() {
    // 监听全屏变化事件
    const fullscreenEvents = [
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "msfullscreenchange",
    ];

    fullscreenEvents.forEach((eventName) => {
      document.addEventListener(eventName, checkFullscreenStatus);
    });

    // 定期检查全屏状态（备用方案）
    setInterval(checkFullscreenStatus, 1000);

    console.log("全屏状态监听已设置");
  }

  // 工具函数：等待元素出现
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations) => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  // 检测页面类型
  function detectPageType() {
    const url = window.location.href;
    if (url.includes("datasets")) {
      return "semantic-model";
    } else if (url.includes("report")) {
      return "report";
    }
    return "unknown";
  }

  // Semantic Model 刷新功能
  async function refreshSemanticModel() {
    try {
      isRefreshing = true;
      showNotification("开始刷新 Semantic Model...", "info");

      // 1. 找到并点击 Refresh 按钮
      const refreshButton = await waitForElement("#model-actionbar-refresh");
      refreshButton.click();
      console.log("点击了 Refresh 按钮");

      // 2. 等待菜单展开
      await sleep(CONFIG.MENU_EXPAND_WAIT);

      // 3. 找到并点击 Refresh Now 按钮
      let refreshNowButton;
      let clickSuccess = false;
      
      try {
        refreshNowButton = await waitForElement(
          'button[title="Refresh now"]', 3000
        );
        console.log("找到英文 Refresh now 按钮");
        
        // 确保按钮可点击
        if (refreshNowButton && !refreshNowButton.disabled) {
          refreshNowButton.click();
          console.log("✅ 成功点击了 Refresh Now 按钮");
          clickSuccess = true;
        } else {
          throw new Error("Refresh now 按钮不可点击");
        }
      } catch (error) {
        console.log("⚠️ 未找到或无法点击英文 Refresh now 按钮，尝试查找中文 立即刷新 按钮");
        try {
          refreshNowButton = await waitForElement(
            'button[title="立即刷新"]', 5000
          );
          console.log("找到中文 立即刷新 按钮");
          
          // 确保按钮可点击
          if (refreshNowButton && !refreshNowButton.disabled) {
            refreshNowButton.click();
            console.log("✅ 成功点击了 立即刷新 按钮");
            clickSuccess = true;
          } else {
            throw new Error("立即刷新 按钮不可点击");
          }
        } catch (chineseError) {
          console.error("中文按钮也未找到或无法点击:", chineseError);
          throw new Error("无法找到可点击的 Refresh now 或 立即刷新 按钮");
        }
      }

      if (clickSuccess) {
        showNotification("已触发数据刷新，等待完成...", "success");
        // 点击后稍微等待，让UI稳定
        await sleep(500);
      } else {
        throw new Error("刷新按钮点击失败");
      }

      // 4. 等待刷新完成
      await sleep(CONFIG.REFRESH_WAIT_TIME);

      showNotification("Semantic Model 刷新完成", "success");
    } catch (error) {
      console.error("刷新 Semantic Model 失败:", error);
      showNotification("刷新 Semantic Model 失败: " + error.message, "error");
    } finally {
      isRefreshing = false;
    }
  }

  // 检查是否处于全屏模式
  function checkIsFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  // 退出全屏
  async function exitFullscreen() {
    if (checkIsFullscreen()) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
      await sleep(1000); // 等待退出全屏完成
    }
  }

  // Report 刷新和全屏功能
  async function refreshReport() {
    try {
      isRefreshing = true;
      showNotification("开始刷新 Report...", "info");

      // 1. 如果处于全屏状态，先退出全屏
      if (checkIsFullscreen()) {
        await exitFullscreen();
        showNotification("已退出全屏模式", "info");
      }

      // 2. 找到并点击刷新视觉效果按钮
      let refreshVisualsButton;
      try {
        refreshVisualsButton = await waitForElement(
          "#reportAppBarRefreshBtn",
          3000
        );
        refreshVisualsButton.click();
        console.log("点击了刷新视觉效果按钮");
      } catch (error) {
        console.log("⚠️ 未找到refresh visuals按钮，尝试点击More options按钮");

        // 3. 备用方案：点击More options按钮
        try {
          const moreOptionsButton = await waitForElement(
            'button[data-testid="appbar-right-more-options"]'
          );
          moreOptionsButton.click();
          console.log("点击了More options按钮");

          // 等待菜单展开
          await sleep(CONFIG.MENU_EXPAND_WAIT);

          // 再次尝试找到refresh visuals按钮
          refreshVisualsButton = await waitForElement(
            'button[data-testid="appbar-right-refresh-button"]'
          );
          refreshVisualsButton.click();
          console.log("在More options菜单中找到并点击了refresh visuals按钮");
        } catch (moreOptionsError) {
          console.error("More options备用方案也失败:", moreOptionsError);
          throw new Error(
            "无法找到refresh visuals按钮，尝试了More options备用方案"
          );
        }
      }

      // 4. 等待刷新完成
      await sleep(CONFIG.REPORT_REFRESH_WAIT_TIME);

      // 5. 找到并点击菜单按钮
      const menuButton = await waitForElement(
        'button[data-testid="app-bar-view-menu-btn"]'
      );
      menuButton.click();
      console.log("点击了菜单按钮");

      // 6. 等待菜单展开
      await sleep(CONFIG.MENU_EXPAND_WAIT);

      // 7. 找到并点击全屏按钮
      const fullscreenButton = await waitForElement(
        'button[data-testid="open-in-full-screen-btn"]'
      );
      fullscreenButton.click();
      console.log("点击了全屏按钮");

      // 8. 等待一段时间后检查是否真正进入了浏览器全屏
      await sleep(1000); // 等待1秒让全屏效果生效
      simulateF11();
      const isBrowserFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      //   if (!isBrowserFullscreen) {
      //     console.log("⚠️ 检测到未进入浏览器全屏，自动触发F11");
      //     showNotification(
      //       "Power BI网页全屏已打开，正在进入浏览器全屏...",
      //       "info"
      //     );
      //     simulateF11();
      //     await sleep(500); // 等待F11生效
      //   } else {
      //     console.log("✅ 已成功进入浏览器全屏");
      //   }

      showNotification("Report 刷新完成并已切换到全屏模式", "success");
    } catch (error) {
      console.error("刷新 Report 失败:", error);
      showNotification("刷新 Report 失败: " + error.message, "error");
    } finally {
      isRefreshing = false;
    }
  }

  // 使面板可拖动
  function makePanelDraggable(panel) {
    const header = panel.querySelector("#panel-header");
    let isDragging = false;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;

    // 事件处理函数
    let mouseMoveHandler = null;
    let mouseUpHandler = null;

    // 鼠标按下事件
    header.addEventListener("mousedown", function (e) {
      // 防止选中文字
      e.preventDefault();

      // 获取当前面板位置
      const rect = panel.getBoundingClientRect();

      // 计算鼠标相对于面板的偏移
      initialX = e.clientX - rect.left;
      initialY = e.clientY - rect.top;

      if (e.target === header || header.contains(e.target)) {
        isDragging = true;

        // 添加拖动样式
        panel.style.transition = "none";
        panel.style.cursor = "grabbing";
        header.style.cursor = "grabbing";
        panel.style.opacity = "0.9";
        panel.style.transform = "scale(1.02)";

        console.log("开始拖动面板");

        // 动态创建鼠标移动事件处理函数
        mouseMoveHandler = function (e) {
          if (isDragging) {
            e.preventDefault();

            // 计算新位置（鼠标位置减去点击时的相对偏移）
            const currentX = e.clientX - initialX;
            const currentY = e.clientY - initialY;

            // 获取窗口尺寸
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const panelRect = panel.getBoundingClientRect();

            // 限制拖动范围，防止拖出屏幕
            const maxX = windowWidth - panelRect.width;
            const maxY = windowHeight - panelRect.height;

            const constrainedX = Math.max(0, Math.min(currentX, maxX));
            const constrainedY = Math.max(0, Math.min(currentY, maxY));

            // 应用位置
            panel.style.left = constrainedX + "px";
            panel.style.top = constrainedY + "px";
            panel.style.right = "auto"; // 取消right定位

            // 更新偏移量
            xOffset = constrainedX;
            yOffset = constrainedY;
          }
        };

        // 动态创建鼠标释放事件处理函数
        mouseUpHandler = function (e) {
          console.log("面板鼠标释放事件触发，isDragging:", isDragging);

          if (isDragging) {
            isDragging = false;

            // 恢复样式
            panel.style.transition = "all 0.3s ease";
            panel.style.cursor = "default";
            header.style.cursor = "move";
            panel.style.opacity = "1";
            panel.style.transform = "scale(1)";

            console.log("结束拖动面板");

            // 保存面板位置
            const rect = panel.getBoundingClientRect();
            GM_setValue("panelX", rect.left);
            GM_setValue("panelY", rect.top);

            // 清理事件监听器
            if (mouseMoveHandler) {
              document.removeEventListener("mousemove", mouseMoveHandler);
              mouseMoveHandler = null;
            }
            if (mouseUpHandler) {
              document.removeEventListener("mouseup", mouseUpHandler);
              mouseUpHandler = null;
            }

            console.log("面板拖动事件监听器已清理");
          }
        };

        // 添加事件监听器
        document.addEventListener("mousemove", mouseMoveHandler);
        document.addEventListener("mouseup", mouseUpHandler);
      }
    });

    // 双击标题栏重置位置
    header.addEventListener("dblclick", function (e) {
      e.preventDefault();
      panel.style.transition = "all 0.3s ease";
      panel.style.left = "auto";
      panel.style.top = "60px";
      panel.style.right = "20px";

      // 清除保存的位置
      GM_setValue("panelX", null);
      GM_setValue("panelY", null);

      xOffset = 0;
      yOffset = 0;

      showNotification("面板位置已重置", "info");
      console.log("面板位置已重置");
    });

    // 恢复保存的用户自定义位置（如果存在）
    const savedX = GM_getValue("panelX", null);
    const savedY = GM_getValue("panelY", null);

    if (savedX !== null && savedY !== null) {
      // 用户曾经拖动过面板，使用保存的位置
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const panelWidth = 300; // 面板宽度
      const panelHeight = 400; // 预估面板高度

      const constrainedX = Math.max(
        0,
        Math.min(savedX, windowWidth - panelWidth)
      );
      const constrainedY = Math.max(
        0,
        Math.min(savedY, windowHeight - panelHeight)
      );

      panel.style.left = constrainedX + "px";
      panel.style.top = constrainedY + "px";
      panel.style.right = "auto";

      xOffset = constrainedX;
      yOffset = constrainedY;

      console.log("恢复用户自定义面板位置:", constrainedX, constrainedY);
    } else {
      // 没有保存的位置，面板已经通过 calculatePanelPosition() 设置了智能位置
      const rect = panel.getBoundingClientRect();
      xOffset = rect.left;
      yOffset = rect.top;
      console.log("使用智能计算的面板位置:", rect.left, rect.top);
    }
  }

  // 计算设置面板的最佳显示位置
  function calculatePanelPosition() {
    const indicator = document.getElementById("powerbi-refresh-indicator");
    if (!indicator) {
      console.log("⚠️ 指示器未找到，使用默认位置");
      return { top: "60px", left: "calc(100vw - 320px)", right: "auto" };
    }

    console.log("📍 找到指示器，计算智能位置");

    const indicatorRect = indicator.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const panelWidth = 300;
    const panelHeight = 400; // 预估面板高度
    const spacing = 10; // 间距

    let position = {};

    // 优先在指示器右侧显示
    if (indicatorRect.right + spacing + panelWidth <= windowWidth) {
      position.left = indicatorRect.right + spacing + "px";
      position.top = indicatorRect.top + "px";
      position.right = "auto";
    }
    // 如果右侧空间不够，尝试左侧
    else if (indicatorRect.left - spacing - panelWidth >= 0) {
      position.left = indicatorRect.left - spacing - panelWidth + "px";
      position.top = indicatorRect.top + "px";
      position.right = "auto";
    }
    // 如果左右都不够，显示在指示器下方
    else if (indicatorRect.bottom + spacing + panelHeight <= windowHeight) {
      position.left =
        Math.max(0, Math.min(indicatorRect.left, windowWidth - panelWidth)) +
        "px";
      position.top = indicatorRect.bottom + spacing + "px";
      position.right = "auto";
    }
    // 如果下方也不够，显示在指示器上方
    else if (indicatorRect.top - spacing - panelHeight >= 0) {
      position.left =
        Math.max(0, Math.min(indicatorRect.left, windowWidth - panelWidth)) +
        "px";
      position.top = indicatorRect.top - spacing - panelHeight + "px";
      position.right = "auto";
    }
    // 最后兜底：显示在屏幕中央
    else {
      position.left = Math.max(20, (windowWidth - panelWidth) / 2) + "px";
      position.top = Math.max(20, (windowHeight - panelHeight) / 2) + "px";
      position.right = "auto";
    }

    // 确保面板完全在可视区域内
    const leftValue = parseInt(position.left);
    const topValue = parseInt(position.top);

    position.left =
      Math.max(0, Math.min(leftValue, windowWidth - panelWidth)) + "px";
    position.top =
      Math.max(0, Math.min(topValue, windowHeight - panelHeight)) + "px";

    console.log("计算的面板位置:", position);
    return position;
  }

  // 创建设置面板
  function createSettingsPanel() {
    console.log("🎯 createSettingsPanel 函数开始执行");

    try {
      // 检查是否已存在设置面板
      const existingPanel = document.getElementById("powerbi-settings-panel");
      if (existingPanel) {
        console.log("⚠️ 设置面板已存在，移除现有面板");
        existingPanel.remove();
      }

      console.log("📍 开始创建新的设置面板...");

      // 计算面板位置
      const panelPosition = calculatePanelPosition();
      console.log("📍 面板位置计算完成:", panelPosition);

      const panel = document.createElement("div");
      panel.id = "powerbi-settings-panel";
      console.log("📍 面板DOM元素已创建");

      // 直接设置样式而不是通过innerHTML
      panel.style.cssText = `
                position: fixed;
                top: ${panelPosition.top};
                left: ${panelPosition.left};
                width: 300px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
            `;
      console.log("📍 面板样式已设置");

      panel.innerHTML = `
                <div style="
                    background: #f8f9fa;
                    padding: 15px;
                    border-bottom: 1px solid #eee;
                    border-radius: 8px 8px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h3 id="panel-header" style="
                        margin: 0; 
                        color: #333;
                        cursor: move;
                        user-select: none;
                        flex: 1;
                        padding: 5px;
                    ">Power BI 自动刷新设置 📌</h3>
                    <button id="close-settings" style="
                        background: none;
                        border: none;
                        font-size: 18px;
                        cursor: pointer;
                        color: #666;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 15px;">
                        <strong>当前页面类型:</strong> 
                        <span id="current-page-type" style="
                            color: ${
                              currentPageType === "semantic-model"
                                ? "#e67e22"
                                : currentPageType === "report"
                                ? "#3498db"
                                : "#95a5a6"
                            };
                            font-weight: bold;
                        ">${
                          currentPageType === "semantic-model"
                            ? "Semantic Model"
                            : currentPageType === "report"
                            ? "Report"
                            : "未知"
                        }</span>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="margin-bottom: 10px;">
                            <label>
                                <input type="checkbox" id="auto-refresh-enabled" ${
                                  GM_getValue("autoRefreshEnabled", false)
                                    ? "checked"
                                    : ""
                                }> 
                                启用自动刷新
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label>${
                              currentPageType === "semantic-model"
                                ? "📊 Semantic Model 刷新间隔 (分钟):"
                                : currentPageType === "report"
                                ? "📈 Report 刷新间隔 (分钟):"
                                : "刷新间隔 (分钟):"
                            }</label>
                            <div style="display: flex; gap: 5px; margin-top: 5px;">
                                <input type="number" id="refresh-interval" min="1" max="1440" 
                                       value="${getCurrentRefreshInterval()}"
                                       style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                                       placeholder="输入分钟数">
                                <button id="quick-set-1" style="
                                    padding: 8px 12px;
                                    background: #e74c3c;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 11px;
                                ">1分钟</button>
                                <button id="quick-set-5" style="
                                    padding: 8px 12px;
                                    background: #f39c12;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 11px;
                                ">5分钟</button>
                                <button id="quick-set-30" style="
                                    padding: 8px 12px;
                                    background: #27ae60;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 11px;
                                ">30分钟</button>
                            </div>
                            <div style="
                                font-size: 12px;
                                color: #666;
                                margin-top: 5px;
                                font-style: italic;
                            ">
                                ${
                                  currentPageType === "semantic-model"
                                    ? "建议: 60分钟以上，数据模型刷新较耗时"
                                    : currentPageType === "report"
                                    ? "建议: 15-30分钟，报表刷新相对较快"
                                    : "输入1-1440之间的分钟数"
                                }
                            </div>
                        </div>
                        
                        ${currentPageType !== "unknown" ? `
                        <div style="
                            background: #e8f4fd;
                            padding: 8px;
                            border-radius: 5px;
                            font-size: 12px;
                            color: #2c3e50;
                            margin-bottom: 10px;
                        ">
                            <strong>📊 其他页面间隔:</strong><br>
                            Semantic Model: ${GM_getValue("semanticModelInterval", 60)}分钟<br>
                            Report: ${GM_getValue("reportInterval", 30)}分钟
                        </div>
                        ` : ""}
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="
                            background: #f1f2f6;
                            padding: 15px;
                            border-radius: 8px;
                            margin-bottom: 10px;
                        ">
                            <div style="
                                font-weight: bold;
                                margin-bottom: 10px;
                                color: #2c3e50;
                                text-align: center;
                            ">⏰ 刷新倒计时</div>
                            
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                margin-bottom: 8px;
                            ">
                                <div style="
                                    flex: 1;
                                    background: ${currentPageType === "semantic-model" ? "#e8f4fd" : "#f8f9fa"};
                                    padding: 8px;
                                    border-radius: 5px;
                                    text-align: center;
                                    margin-right: 5px;
                                    border: ${currentPageType === "semantic-model" ? "2px solid #3498db" : "1px solid #ddd"};
                                ">
                                    <div style="font-size: 12px; color: #e67e22; font-weight: bold;">📊 Semantic Model</div>
                                    <div style="font-size: 14px; font-weight: bold; color: #2c3e50;">
                                        <span id="semantic-countdown">--:--</span>
                                    </div>
                                    <div style="font-size: 10px; color: #666;">
                                        间隔: ${GM_getValue("semanticModelInterval", 60)}分钟
                                    </div>
                                </div>
                                
                                <div style="
                                    flex: 1;
                                    background: ${currentPageType === "report" ? "#e8f4fd" : "#f8f9fa"};
                                    padding: 8px;
                                    border-radius: 5px;
                                    text-align: center;
                                    margin-left: 5px;
                                    border: ${currentPageType === "report" ? "2px solid #3498db" : "1px solid #ddd"};
                                ">
                                    <div style="font-size: 12px; color: #3498db; font-weight: bold;">📈 Report</div>
                                    <div style="font-size: 14px; font-weight: bold; color: #2c3e50;">
                                        <span id="report-countdown">--:--</span>
                                    </div>
                                    <div style="font-size: 10px; color: #666;">
                                        间隔: ${GM_getValue("reportInterval", 30)}分钟
                                    </div>
                                </div>
                            </div>
                            
                            <div style="
                                font-size: 11px;
                                color: #666;
                                text-align: center;
                                font-style: italic;
                            ">
                                ${currentPageType === "semantic-model" ? "📊 当前在 Semantic Model 页面" : 
                                  currentPageType === "report" ? "📈 当前在 Report 页面" : "🔍 未识别的页面类型"}
                            </div>
                        </div>
                        
                        <div style="
                            background: #e8f4fd;
                            padding: 8px;
                            border-radius: 5px;
                            font-size: 12px;
                            color: #2c3e50;
                            margin-bottom: 10px;
                        ">
                            <strong>💡 快捷键:</strong> Shift+Alt+H 显示/隐藏指示器<br>
                            <strong>🖥️ 全屏:</strong> 进入全屏自动隐藏，退出全屏自动显示
                        </div>
                        
                        <div style="display: flex; gap: 10px;">
                            <button id="manual-refresh" style="
                                flex: 1;
                                padding: 8px;
                                background: #3498db;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                            ">立即刷新</button>
                            
                            <button id="save-settings" style="
                                flex: 1;
                                padding: 8px;
                                background: #27ae60;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                            ">保存设置</button>
                        </div>
                    </div>
                </div>
        `;

      document.body.appendChild(panel);
      console.log("✅ 设置面板已添加到DOM");

      // 验证面板是否真的在DOM中
      const verifyPanel = document.getElementById("powerbi-settings-panel");
      if (verifyPanel) {
        console.log("✅ 面板DOM验证成功");
      } else {
        console.error("❌ 面板DOM验证失败");
      }

      // 绑定事件
      try {
        console.log("📍 开始绑定事件...");

        const closeBtn = document.getElementById("close-settings");
        if (closeBtn) {
          closeBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("✅ 关闭设置面板");
            panel.remove();
          });
          console.log("✅ 关闭按钮事件已绑定");
        } else {
          console.error("❌ 关闭按钮未找到");
        }

        const refreshBtn = document.getElementById("manual-refresh");
        if (refreshBtn) {
          refreshBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("✅ 手动刷新按钮被点击");
            manualRefresh();
          });
          console.log("✅ 刷新按钮事件已绑定");
        } else {
          console.error("❌ 刷新按钮未找到");
        }

        const saveBtn = document.getElementById("save-settings");
        if (saveBtn) {
          saveBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("✅ 保存设置按钮被点击");
            saveSettings();
            panel.remove();
          });
          console.log("✅ 保存按钮事件已绑定");
        } else {
          console.error("❌ 保存按钮未找到");
        }

        // 绑定快速设置按钮
        const quickSet1 = document.getElementById("quick-set-1");
        const quickSet5 = document.getElementById("quick-set-5");
        const quickSet30 = document.getElementById("quick-set-30");
        const intervalInput = document.getElementById("refresh-interval");

        if (quickSet1) {
          quickSet1.addEventListener("click", function (e) {
            e.preventDefault();
            intervalInput.value = "1";
            console.log("✅ 快速设置1分钟");
          });
        }

        if (quickSet5) {
          quickSet5.addEventListener("click", function (e) {
            e.preventDefault();
            intervalInput.value = "5";
            console.log("✅ 快速设置5分钟");
          });
        }

        if (quickSet30) {
          quickSet30.addEventListener("click", function (e) {
            e.preventDefault();
            intervalInput.value = "30";
            console.log("✅ 快速设置30分钟");
          });
        }

        console.log("✅ 快速设置按钮事件已绑定");
      } catch (eventError) {
        console.error("❌ 事件绑定失败:", eventError);
      }

      // 添加拖动功能
      makePanelDraggable(panel);
      console.log("✅ 面板拖动功能已启用");

      // 点击面板外部关闭 - 使用setTimeout避免立即触发
      setTimeout(() => {
        document.addEventListener("click", function handleOutsideClick(e) {
          if (
            !panel.contains(e.target) &&
            e.target.id !== "powerbi-refresh-indicator"
          ) {
            console.log("✅ 点击外部区域，关闭设置面板");
            panel.remove();
            document.removeEventListener("click", handleOutsideClick);
          }
        });
      }, 100);

      console.log("✅ 设置面板创建完成");
    } catch (error) {
      console.error("❌ createSettingsPanel 执行失败:", error);
      showNotification("设置面板创建失败: " + error.message, "error");
    }
  }

  // 应用自定义间隔
  function applyCustomInterval() {
    const customInput = document.getElementById("custom-interval");
    const customValue = parseInt(customInput.value);
    
    if (!customValue || customValue < 1 || customValue > 1440) {
      showNotification("请输入1-1440之间的有效分钟数", "error");
      return;
    }
    
    // 更新下拉菜单
    const selectElement = document.getElementById("refresh-interval");
    
    // 检查是否已存在这个值的选项
    let optionExists = false;
    for (let option of selectElement.options) {
      if (parseInt(option.value) === customValue) {
        option.selected = true;
        optionExists = true;
        break;
      }
    }
    
    // 如果不存在，添加新选项
    if (!optionExists) {
      const newOption = document.createElement('option');
      newOption.value = customValue;
      newOption.textContent = `${customValue}分钟 (自定义)`;
      newOption.selected = true;
      selectElement.appendChild(newOption);
    }
    
    // 保存设置到对应页面类型
    setCurrentRefreshInterval(customValue);
    
    // 重启自动刷新（如果已启用）
    if (GM_getValue("autoRefreshEnabled", false)) {
      startAutoRefresh();
    }
    
    const pageTypeText = currentPageType === "semantic-model" ? "Semantic Model" : 
                        currentPageType === "report" ? "Report" : "当前页面";
    showNotification(`${pageTypeText}自定义间隔已设置为 ${customValue} 分钟`, "success");
    customInput.value = "";
    
    console.log(`✅ ${pageTypeText}自定义间隔设置为: ${customValue}分钟`);
  }

  // 保存设置
  function saveSettings() {
    const autoRefreshEnabled = document.getElementById(
      "auto-refresh-enabled"
    ).checked;
    const refreshInterval = parseInt(
      document.getElementById("refresh-interval").value
    );

    // 验证输入
    if (!refreshInterval || refreshInterval < 1 || refreshInterval > 1440) {
      showNotification("请输入1-1440之间的有效分钟数", "error");
      return;
    }

    GM_setValue("autoRefreshEnabled", autoRefreshEnabled);
    
    // 保存到对应页面类型的间隔设置
    setCurrentRefreshInterval(refreshInterval);

    const pageTypeText = currentPageType === "semantic-model" ? "Semantic Model" : 
                        currentPageType === "report" ? "Report" : "当前页面";
    showNotification(`${pageTypeText}设置已保存 (${refreshInterval}分钟)`, "success");

    // 重启定时器
    if (autoRefreshEnabled) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  }

  // 手动刷新
  async function manualRefresh() {
    if (isRefreshing) {
      showNotification("正在刷新中，请稍等...", "info");
      return;
    }

    if (currentPageType === "semantic-model") {
      await refreshSemanticModel();
    } else if (currentPageType === "report") {
      await refreshReport();
    } else {
      showNotification("当前页面不支持刷新功能", "error");
    }
  }

  // 页面可见性处理
  function setupVisibilityHandler() {
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        console.log('📱 页面重新可见，检查自动刷新状态');
        checkAutoRefreshStatus();
      } else {
        console.log('📱 页面转入后台');
      }
    });

    // 监听窗口焦点变化
    window.addEventListener('focus', function() {
      console.log('📱 窗口重新获得焦点，检查自动刷新状态');
      checkAutoRefreshStatus();
    });
  }

  // 检查自动刷新状态（页面重新可见时调用）
  function checkAutoRefreshStatus() {
    const startTime = GM_getValue('autoRefreshStartTime', null);
    const interval = GM_getValue('autoRefreshInterval', null);
    
    if (startTime && interval) {
      const elapsed = Date.now() - startTime;
      const shouldHaveRefreshed = Math.floor(elapsed / interval);
      
      if (shouldHaveRefreshed > 0 && !isRefreshing) {
        console.log(`⏰ 检测到在后台期间应该刷新 ${shouldHaveRefreshed} 次，立即执行刷新`);
        manualRefresh();
        // 重置计时器
        GM_setValue('autoRefreshStartTime', Date.now());
      } else {
        // 计算剩余时间
        const remainingTime = interval - (elapsed % interval);
        console.log(`⏰ 距离下次刷新还有 ${Math.ceil(remainingTime / 60000)} 分钟`);
      }
      
      // 更新倒计时显示
      updateCountdown();
    }
  }

  // 更新倒计时显示
  let lastCountdownUpdate = 0;
  function updateCountdown() {
    const now = Date.now();
    
    // 只有距离上次更新超过1秒才检查状态
    if (now - lastCountdownUpdate >= 1000) {
      lastCountdownUpdate = now;
      
      // 检查自动刷新状态以防止后台暂停
      if (Math.random() < 0.1) { // 10%的概率检查，避免过于频繁
        checkAutoRefreshStatus();
      }
    }

    // 更新 Semantic Model 倒计时
    const semanticCountdownElement = document.getElementById("semantic-countdown");
    if (semanticCountdownElement) {
      const semanticCountdown = calculateRealCountdownForType("semantic-model");
      semanticCountdownElement.textContent = formatCountdownTime(semanticCountdown, "semantic-model");
    }

    // 更新 Report 倒计时
    const reportCountdownElement = document.getElementById("report-countdown");
    if (reportCountdownElement) {
      const reportCountdown = calculateRealCountdownForType("report");
      reportCountdownElement.textContent = formatCountdownTime(reportCountdown, "report");
    }
  }

  // 格式化倒计时时间显示
  function formatCountdownTime(seconds, pageType) {
    if (!GM_getValue("autoRefreshEnabled", false)) {
      return "未启用";
    }
    
    if (seconds > 0) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else if (currentPageType === pageType && isRefreshing) {
      return "刷新中...";
    } else {
      return "即将刷新";
    }
  }

  // 计算真实的倒计时秒数
  function calculateRealCountdown() {
    const startTime = GM_getValue('autoRefreshStartTime', null);
    const interval = GM_getValue('autoRefreshInterval', null);
    
    if (!startTime || !interval || !GM_getValue("autoRefreshEnabled", false)) {
      return 0;
    }
    
    const now = Date.now();
    const elapsed = now - startTime;
    const remaining = interval - (elapsed % interval);
    
    return Math.ceil(remaining / 1000);
  }

  // 计算特定页面类型的倒计时秒数
  function calculateRealCountdownForType(pageType) {
    if (!GM_getValue("autoRefreshEnabled", false)) {
      return 0;
    }

    const startTimeKey = pageType === "semantic-model" ? 
      'semanticModelStartTime' : 'reportStartTime';
    const intervalKey = pageType === "semantic-model" ? 
      'semanticModelInterval' : 'reportInterval';
    
    const startTime = GM_getValue(startTimeKey, null);
    const intervalMinutes = GM_getValue(intervalKey, pageType === "semantic-model" ? 60 : 30);
    const interval = intervalMinutes * 60 * 1000; // 转换为毫秒
    
    if (!startTime) {
      // 如果没有启动时间，初始化为现在
      GM_setValue(startTimeKey, Date.now());
      return intervalMinutes * 60; // 返回完整间隔的秒数
    }
    
    const now = Date.now();
    const elapsed = now - startTime;
    const remaining = interval - (elapsed % interval);
    
    return Math.ceil(remaining / 1000);
  }

  // 启动自动刷新
  function startAutoRefresh() {
    stopAutoRefresh(); // 先停止现有的定时器

    // 为每种页面类型设置独立的定时器和启动时间
    setupAutoRefreshForType("semantic-model");
    setupAutoRefreshForType("report");

    // 启动倒计时显示 - 使用更频繁的检查来对抗后台限制
    countdownTimer = setInterval(updateCountdown, 500); // 500ms而不是1000ms

    // 添加页面可见性检查
    setupVisibilityHandler();

    console.log("自动刷新已启动，为所有页面类型设置独立定时器");
    
    // 立即更新一次倒计时显示
    updateCountdown();
  }

  // 为特定页面类型设置自动刷新
  function setupAutoRefreshForType(pageType) {
    const intervalKey = pageType === "semantic-model" ? 
      'semanticModelInterval' : 'reportInterval';
    const startTimeKey = pageType === "semantic-model" ? 
      'semanticModelStartTime' : 'reportStartTime';
    const timerKey = pageType === "semantic-model" ? 
      'semanticModelTimer' : 'reportTimer';
    
    const intervalMinutes = GM_getValue(intervalKey, pageType === "semantic-model" ? 60 : 30);
    const interval = intervalMinutes * 60 * 1000; // 转换为毫秒

    // 记录启动时间
    const startTime = Date.now();
    GM_setValue(startTimeKey, startTime);

    // 清除可能存在的旧定时器
    const oldTimer = window[timerKey];
    if (oldTimer) {
      clearInterval(oldTimer);
    }

    // 设置新的定时器
    window[timerKey] = setInterval(() => {
      if (currentPageType === pageType && !isRefreshing) {
        console.log(`⏰ ${pageType} 定时器触发，执行刷新`);
        manualRefresh();
        // 更新启动时间为下一个周期
        GM_setValue(startTimeKey, Date.now());
      }
    }, interval);

    console.log(`✅ ${pageType} 自动刷新已设置，间隔: ${intervalMinutes}分钟`);
  }

  // 创建后台工作保持机制
  function createBackgroundKeepAlive() {
    // 方法1: 使用audio元素保持页面活跃
    const audio = document.createElement('audio');
    audio.loop = true;
    audio.volume = 0;
    // 创建一个无声音频源
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0; // 无声
    oscillator.frequency.value = 20000; // 超高频，人耳听不到
    oscillator.start();
    
    console.log('🔊 后台保活音频已启动');

    // 方法2: 定期发送空的fetch请求保持连接
    setInterval(() => {
      if (document.visibilityState === 'hidden') {
        fetch(window.location.href, { 
          method: 'HEAD',
          cache: 'no-cache'
        }).catch(() => {}); // 忽略错误
      }
    }, 30000); // 每30秒

    // 方法3: 使用Web Locks API保持后台活跃（如果支持）
    if ('locks' in navigator) {
      navigator.locks.request('powerbi-refresh-lock', { mode: 'shared' }, () => {
        return new Promise(() => {}); // 永不释放的锁
      }).catch(() => {});
      console.log('🔒 Web Locks后台保活已启动');
    }

    // 方法4: 使用SharedArrayBuffer和Atomics（如果支持）
    if (typeof SharedArrayBuffer !== 'undefined') {
      try {
        const sab = new SharedArrayBuffer(4);
        const view = new Int32Array(sab);
        setInterval(() => {
          Atomics.add(view, 0, 1);
        }, 1000);
        console.log('🧮 SharedArrayBuffer后台保活已启动');
      } catch (e) {
        console.log('SharedArrayBuffer不可用');
      }
    }
  }

  // 停止自动刷新
  function stopAutoRefresh() {
    // 清理旧的单一定时器
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    
    // 清理页面类型特定的定时器
    if (window.semanticModelTimer) {
      clearInterval(window.semanticModelTimer);
      window.semanticModelTimer = null;
    }
    if (window.reportTimer) {
      clearInterval(window.reportTimer);
      window.reportTimer = null;
    }
    
    // 不清理倒计时定时器，让它继续显示状态
    // if (countdownTimer) {
    //   clearInterval(countdownTimer);
    //   countdownTimer = null;
    // }
    
    // 清除保存的时间戳
    GM_setValue('autoRefreshStartTime', null);
    GM_setValue('autoRefreshInterval', null);
    GM_setValue('semanticModelStartTime', null);
    GM_setValue('reportStartTime', null);
    
    console.log("自动刷新已停止");
  }

  // 使状态指示器可拖动
  function makeIndicatorDraggable(indicator) {
    let isDragging = false;
    let dragTimeout = null;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;

    // 事件处理函数
    let mouseMoveHandler = null;
    let mouseUpHandler = null;

    // 鼠标按下事件
    indicator.addEventListener("mousedown", function (e) {
      console.log("🖱️ 鼠标按下事件触发");

      // 清除可能存在的点击延时
      if (dragTimeout) {
        clearTimeout(dragTimeout);
        dragTimeout = null;
      }

      // 获取当前指示器的位置
      const rect = indicator.getBoundingClientRect();

      // 计算鼠标相对于指示器的偏移
      initialX = e.clientX - rect.left;
      initialY = e.clientY - rect.top;

      // 延迟开始拖动，避免与点击事件冲突
      dragTimeout = setTimeout(() => {
        isDragging = true;

        // 添加拖动样式
        indicator.style.opacity = "0.8";
        indicator.style.transform = "scale(1.1)";
        indicator.style.cursor = "grabbing";
        indicator.style.zIndex = "99999";
        indicator.style.transition = "none"; // 拖动时禁用过渡动画

        console.log("开始拖动状态指示器");

        // 动态创建鼠标移动事件处理函数
        mouseMoveHandler = function (e) {
          if (isDragging) {
            e.preventDefault();

            // 计算新位置（鼠标位置减去点击时的相对偏移）
            const currentX = e.clientX - initialX;
            const currentY = e.clientY - initialY;

            // 获取窗口尺寸和指示器尺寸
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const indicatorSize = 50; // 指示器尺寸

            // 限制拖动范围，防止拖出屏幕
            const constrainedX = Math.max(
              0,
              Math.min(currentX, windowWidth - indicatorSize)
            );
            const constrainedY = Math.max(
              0,
              Math.min(currentY, windowHeight - indicatorSize)
            );

            // 应用位置
            indicator.style.left = constrainedX + "px";
            indicator.style.top = constrainedY + "px";
            indicator.style.right = "auto";

            // 更新偏移量
            xOffset = constrainedX;
            yOffset = constrainedY;
          }
        };

        // 动态创建鼠标释放事件处理函数
        mouseUpHandler = function (e) {
          console.log("鼠标释放事件触发，isDragging:", isDragging);

          if (isDragging) {
            isDragging = false;

            // 恢复样式
            indicator.style.transition = "all 0.3s ease"; // 恢复过渡动画
            indicator.style.opacity = "1";
            indicator.style.transform = "scale(1)";
            indicator.style.cursor = "pointer";
            indicator.style.zIndex = "9999";

            console.log("结束拖动状态指示器");

            // 保存指示器位置
            const rect = indicator.getBoundingClientRect();
            GM_setValue("indicatorX", rect.left);
            GM_setValue("indicatorY", rect.top);

            console.log("保存指示器位置:", rect.left, rect.top);

            // 清理事件监听器
            if (mouseMoveHandler) {
              document.removeEventListener("mousemove", mouseMoveHandler);
              mouseMoveHandler = null;
            }
            if (mouseUpHandler) {
              document.removeEventListener("mouseup", mouseUpHandler);
              mouseUpHandler = null;
            }

            console.log("拖动事件监听器已清理");
          }
        };

        // 添加事件监听器
        document.addEventListener("mousemove", mouseMoveHandler);
        document.addEventListener("mouseup", mouseUpHandler);
      }, 150); // 150ms延迟，短于点击但足够区分拖动意图
    });

    // 指示器特定的鼠标释放事件（处理拖动延时期间的释放）
    indicator.addEventListener("mouseup", function (e) {
      // 清除拖动延时
      if (dragTimeout) {
        clearTimeout(dragTimeout);
        dragTimeout = null;
        console.log("清除拖动延时 - 这是点击操作");
        return; // 如果还在延时期间，说明是点击而不是拖动
      }
    });

    // 恢复保存的位置
    const savedX = GM_getValue("indicatorX", null);
    const savedY = GM_getValue("indicatorY", null);

    if (savedX !== null && savedY !== null) {
      // 确保位置在可见区域内
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const indicatorSize = 50;

      const constrainedX = Math.max(
        0,
        Math.min(savedX, windowWidth - indicatorSize)
      );
      const constrainedY = Math.max(
        0,
        Math.min(savedY, windowHeight - indicatorSize)
      );

      indicator.style.left = constrainedX + "px";
      indicator.style.top = constrainedY + "px";
      indicator.style.right = "auto";

      xOffset = constrainedX;
      yOffset = constrainedY;
    }
  }

  // 创建状态指示器
  function createStatusIndicator() {
    // 检查是否已存在指示器
    if (document.getElementById("powerbi-refresh-indicator")) {
      return;
    }

    const indicator = document.createElement("div");
    indicator.id = "powerbi-refresh-indicator";
    indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: #3498db;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            color: white;
            font-size: 20px;
            user-select: none;
        `;
    indicator.title = "点击打开 Power BI 自动刷新设置";
    indicator.textContent = "🔄";

    // 绑定点击事件（移除阻止默认行为，避免干扰拖动）
    indicator.addEventListener("click", function (e) {
      console.log("✅ 状态指示器被点击");

      try {
        createSettingsPanel();
        console.log("✅ createSettingsPanel 调用成功");
      } catch (error) {
        console.error("❌ createSettingsPanel 调用失败:", error);
        showNotification("设置面板创建失败: " + error.message, "error");
      }
    });

    // 添加悬停效果
    indicator.addEventListener("mouseenter", function () {
      this.style.background = "#2980b9";
      this.style.transform = "scale(1.1)";
    });

    indicator.addEventListener("mouseleave", function () {
      this.style.background = "#3498db";
      this.style.transform = "scale(1)";
    });

    document.body.appendChild(indicator);
    console.log("状态指示器已创建并添加到页面");

    // 保存指示器元素引用
    indicatorElement = indicator;

    // 为状态指示器添加拖动功能
    console.log("📍 准备添加拖动功能...");
    makeIndicatorDraggable(indicator);
    console.log("✅ 状态指示器拖动功能已启用");

    // 初始化时检查全屏状态
    checkFullscreenStatus();
  }

  // 初始化脚本
  function init() {
    console.log("=== Power BI 自动刷新脚本开始初始化 ===");

    try {
      // 检测页面类型
      currentPageType = detectPageType();
      console.log("✅ 页面类型检测完成:", currentPageType);

      // 设置快捷键监听
      setupKeyboardShortcuts();
      console.log("✅ 快捷键设置完成");

      // 设置全屏状态监听
      setupFullscreenListener();
      console.log("✅ 全屏监听设置完成");

      // 创建状态指示器
      createStatusIndicator();
      console.log("✅ 状态指示器创建完成");

      // 启动后台保活机制
      createBackgroundKeepAlive();
      console.log("✅ 后台保活机制已启动");

      // 启动倒计时显示器（无论是否启用自动刷新）
      if (!countdownTimer) {
        countdownTimer = setInterval(updateCountdown, 500);
        console.log("✅ 倒计时显示器已启动");
      }

      // 如果启用了自动刷新，启动定时器
      if (GM_getValue("autoRefreshEnabled", false)) {
        startAutoRefresh();
        console.log("✅ 自动刷新已启动");
      }

      console.log("=== 初始化完成 ===");
      showNotification("Power BI 插件已加载", "success");
    } catch (error) {
      console.error("❌ 初始化失败:", error);
      showNotification("插件加载失败: " + error.message, "error");
    }

    // 监听页面变化
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (lastUrl !== window.location.href) {
        lastUrl = window.location.href;
        currentPageType = detectPageType();
        console.log("页面已切换，当前类型:", currentPageType);

        // 更新设置面板中的页面类型显示
        const pageTypeElement = document.getElementById("current-page-type");
        if (pageTypeElement) {
          pageTypeElement.textContent =
            currentPageType === "semantic-model"
              ? "Semantic Model"
              : currentPageType === "report"
              ? "Report"
              : "未知";
          pageTypeElement.style.color =
            currentPageType === "semantic-model"
              ? "#e67e22"
              : currentPageType === "report"
              ? "#3498db"
              : "#95a5a6";
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // 注册菜单命令
  GM_registerMenuCommand("打开设置面板", createSettingsPanel);
  GM_registerMenuCommand("立即刷新", manualRefresh);
  GM_registerMenuCommand("启动自动刷新", startAutoRefresh);
  GM_registerMenuCommand("停止自动刷新", stopAutoRefresh);
  GM_registerMenuCommand("显示/隐藏指示器 (Shift+Alt+H)", toggleIndicator);
  GM_registerMenuCommand("显示指示器", showIndicator);
  GM_registerMenuCommand("隐藏指示器", hideIndicator);

  // 页面加载完成后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
