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

(function() {
    'use strict';

    // 配置常量
    const CONFIG = {
        SEMANTIC_MODEL_INTERVAL: 60 * 60 * 1000, // 1小时
        REPORT_INTERVAL: 30 * 60 * 1000, // 30分钟
        REFRESH_WAIT_TIME: 60 * 1000, // Semantic Model刷新等待时间 60秒
        REPORT_REFRESH_WAIT_TIME: 30 * 1000, // Report刷新等待时间 30秒
        MENU_EXPAND_WAIT: 1000, // 菜单展开等待时间 1秒
    };

    // 全局变量
    let refreshTimer = null;
    let countdownTimer = null;
    let currentPageType = '';
    let isRefreshing = false;
    let countdownSeconds = 0;

    // 工具函数：等待指定时间
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
                subtree: true
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
        if (url.includes('datasets')) {
            return 'semantic-model';
        } else if (url.includes('report')) {
            return 'report';
        }
        return 'unknown';
    }

    // 显示通知消息
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
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
                background-color: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
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

    // Semantic Model 刷新功能
    async function refreshSemanticModel() {
        try {
            isRefreshing = true;
            showNotification('开始刷新 Semantic Model...', 'info');

            // 1. 找到并点击 Refresh 按钮
            const refreshButton = await waitForElement('#model-actionbar-refresh');
            refreshButton.click();
            console.log('点击了 Refresh 按钮');

            // 2. 等待菜单展开
            await sleep(CONFIG.MENU_EXPAND_WAIT);

            // 3. 找到并点击 Refresh Now 按钮
            const refreshNowButton = await waitForElement('button[title="Refresh now"]');
            refreshNowButton.click();
            console.log('点击了 Refresh Now 按钮');

            showNotification('已触发数据刷新，等待完成...', 'success');

            // 4. 等待刷新完成
            await sleep(CONFIG.REFRESH_WAIT_TIME);

            showNotification('Semantic Model 刷新完成', 'success');

        } catch (error) {
            console.error('刷新 Semantic Model 失败:', error);
            showNotification('刷新 Semantic Model 失败: ' + error.message, 'error');
        } finally {
            isRefreshing = false;
        }
    }

    // 检查是否处于全屏模式
    function isFullscreen() {
        return !!(document.fullscreenElement || 
                 document.webkitFullscreenElement || 
                 document.mozFullScreenElement || 
                 document.msFullscreenElement);
    }

    // 退出全屏
    async function exitFullscreen() {
        if (isFullscreen()) {
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
            showNotification('开始刷新 Report...', 'info');

            // 1. 如果处于全屏状态，先退出全屏
            if (isFullscreen()) {
                await exitFullscreen();
                showNotification('已退出全屏模式', 'info');
            }

            // 2. 找到并点击刷新视觉效果按钮
            const refreshVisualsButton = await waitForElement('#reportAppBarRefreshBtn');
            refreshVisualsButton.click();
            console.log('点击了刷新视觉效果按钮');

            // 3. 等待刷新完成
            await sleep(CONFIG.REPORT_REFRESH_WAIT_TIME);

            // 4. 找到并点击菜单按钮
            const menuButton = await waitForElement('button[data-testid="app-bar-view-menu-btn"]');
            menuButton.click();
            console.log('点击了菜单按钮');

            // 5. 等待菜单展开
            await sleep(CONFIG.MENU_EXPAND_WAIT);

            // 6. 找到并点击全屏按钮
            const fullscreenButton = await waitForElement('button[data-testid="open-in-full-screen-btn"]');
            fullscreenButton.click();
            console.log('点击了全屏按钮');

            showNotification('Report 刷新完成并已切换到全屏模式', 'success');

        } catch (error) {
            console.error('刷新 Report 失败:', error);
            showNotification('刷新 Report 失败: ' + error.message, 'error');
        } finally {
            isRefreshing = false;
        }
    }

    // 创建设置面板
    function createSettingsPanel() {
        console.log('createSettingsPanel 函数被调用');
        
        // 检查是否已存在设置面板
        const existingPanel = document.getElementById('powerbi-settings-panel');
        if (existingPanel) {
            console.log('设置面板已存在，移除现有面板');
            existingPanel.remove();
        }

        const panel = document.createElement('div');
        panel.id = 'powerbi-settings-panel';
        panel.innerHTML = `
            <div style="
                position: fixed;
                top: 60px;
                right: 20px;
                width: 300px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
            ">
                <div style="
                    background: #f8f9fa;
                    padding: 15px;
                    border-bottom: 1px solid #eee;
                    border-radius: 8px 8px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h3 style="margin: 0; color: #333;">Power BI 自动刷新设置</h3>
                    <button id="close-settings" style="
                        background: none;
                        border: none;
                        font-size: 18px;
                        cursor: pointer;
                        color: #666;
                    ">×</button>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 15px;">
                        <strong>当前页面类型:</strong> 
                        <span id="current-page-type" style="
                            color: ${currentPageType === 'semantic-model' ? '#e67e22' : currentPageType === 'report' ? '#3498db' : '#95a5a6'};
                            font-weight: bold;
                        ">${currentPageType === 'semantic-model' ? 'Semantic Model' : currentPageType === 'report' ? 'Report' : '未知'}</span>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="margin-bottom: 10px;">
                            <label>
                                <input type="checkbox" id="auto-refresh-enabled" ${GM_getValue('autoRefreshEnabled', false) ? 'checked' : ''}> 
                                启用自动刷新
                            </label>
                        </div>
                        
                        <div style="margin-bottom: 10px;">
                            <label>刷新间隔 (分钟):</label>
                            <select id="refresh-interval" style="width: 100%; padding: 5px; margin-top: 5px;">
                                <option value="30" ${GM_getValue('refreshInterval', 60) == 30 ? 'selected' : ''}>30分钟</option>
                                <option value="60" ${GM_getValue('refreshInterval', 60) == 60 ? 'selected' : ''}>1小时</option>
                                <option value="120" ${GM_getValue('refreshInterval', 60) == 120 ? 'selected' : ''}>2小时</option>
                                <option value="180" ${GM_getValue('refreshInterval', 60) == 180 ? 'selected' : ''}>3小时</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <div id="countdown-display" style="
                            background: #f1f2f6;
                            padding: 10px;
                            border-radius: 5px;
                            text-align: center;
                            margin-bottom: 10px;
                        ">
                            下次刷新: <span id="countdown-text">--:--</span>
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
            </div>
        `;

        document.body.appendChild(panel);
        console.log('设置面板已创建并添加到页面');

        // 绑定事件
        document.getElementById('close-settings').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('关闭设置面板');
            panel.remove();
        });

        document.getElementById('manual-refresh').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('手动刷新按钮被点击');
            manualRefresh();
        });

        document.getElementById('save-settings').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('保存设置按钮被点击');
            saveSettings();
            panel.remove();
        });

        // 点击面板外部关闭 - 使用setTimeout避免立即触发
        setTimeout(() => {
            document.addEventListener('click', function handleOutsideClick(e) {
                if (!panel.contains(e.target) && e.target.id !== 'powerbi-refresh-indicator') {
                    console.log('点击外部区域，关闭设置面板');
                    panel.remove();
                    document.removeEventListener('click', handleOutsideClick);
                }
            });
        }, 100);
    }

    // 保存设置
    function saveSettings() {
        const autoRefreshEnabled = document.getElementById('auto-refresh-enabled').checked;
        const refreshInterval = parseInt(document.getElementById('refresh-interval').value);

        GM_setValue('autoRefreshEnabled', autoRefreshEnabled);
        GM_setValue('refreshInterval', refreshInterval);

        showNotification('设置已保存', 'success');

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
            showNotification('正在刷新中，请稍等...', 'info');
            return;
        }

        if (currentPageType === 'semantic-model') {
            await refreshSemanticModel();
        } else if (currentPageType === 'report') {
            await refreshReport();
        } else {
            showNotification('当前页面不支持刷新功能', 'error');
        }
    }

    // 更新倒计时显示
    function updateCountdown() {
        const countdownElement = document.getElementById('countdown-text');
        if (countdownElement) {
            const minutes = Math.floor(countdownSeconds / 60);
            const seconds = countdownSeconds % 60;
            countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        if (countdownSeconds > 0) {
            countdownSeconds--;
        }
    }

    // 启动自动刷新
    function startAutoRefresh() {
        stopAutoRefresh(); // 先停止现有的定时器

        const interval = GM_getValue('refreshInterval', 60) * 60 * 1000; // 转换为毫秒
        countdownSeconds = GM_getValue('refreshInterval', 60) * 60; // 转换为秒

        refreshTimer = setInterval(() => {
            if (!isRefreshing) {
                manualRefresh();
                countdownSeconds = GM_getValue('refreshInterval', 60) * 60; // 重置倒计时
            }
        }, interval);

        // 启动倒计时显示
        countdownTimer = setInterval(updateCountdown, 1000);

        console.log(`自动刷新已启动，间隔: ${GM_getValue('refreshInterval', 60)}分钟`);
    }

    // 停止自动刷新
    function stopAutoRefresh() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
        console.log('自动刷新已停止');
    }

    // 创建状态指示器
    function createStatusIndicator() {
        // 检查是否已存在指示器
        if (document.getElementById('powerbi-refresh-indicator')) {
            return;
        }

        const indicator = document.createElement('div');
        indicator.id = 'powerbi-refresh-indicator';
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
        indicator.title = '点击打开 Power BI 自动刷新设置';
        indicator.textContent = '🔄';

        // 绑定点击事件
        indicator.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('状态指示器被点击');
            createSettingsPanel();
        });

        // 添加悬停效果
        indicator.addEventListener('mouseenter', function() {
            this.style.background = '#2980b9';
            this.style.transform = 'scale(1.1)';
        });

        indicator.addEventListener('mouseleave', function() {
            this.style.background = '#3498db';
            this.style.transform = 'scale(1)';
        });

        document.body.appendChild(indicator);
        console.log('状态指示器已创建并添加到页面');
    }

    // 初始化脚本
    function init() {
        console.log('Power BI 自动刷新脚本已加载');
        
        // 检测页面类型
        currentPageType = detectPageType();
        console.log('当前页面类型:', currentPageType);

        // 创建状态指示器
        createStatusIndicator();

        // 如果启用了自动刷新，启动定时器
        if (GM_getValue('autoRefreshEnabled', false)) {
            startAutoRefresh();
        }

        // 监听页面变化
        let lastUrl = window.location.href;
        const observer = new MutationObserver(() => {
            if (lastUrl !== window.location.href) {
                lastUrl = window.location.href;
                currentPageType = detectPageType();
                console.log('页面已切换，当前类型:', currentPageType);
                
                // 更新设置面板中的页面类型显示
                const pageTypeElement = document.getElementById('current-page-type');
                if (pageTypeElement) {
                    pageTypeElement.textContent = currentPageType === 'semantic-model' ? 'Semantic Model' : 
                                                  currentPageType === 'report' ? 'Report' : '未知';
                    pageTypeElement.style.color = currentPageType === 'semantic-model' ? '#e67e22' : 
                                                   currentPageType === 'report' ? '#3498db' : '#95a5a6';
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 注册菜单命令
    GM_registerMenuCommand('打开设置面板', createSettingsPanel);
    GM_registerMenuCommand('立即刷新', manualRefresh);
    GM_registerMenuCommand('启动自动刷新', startAutoRefresh);
    GM_registerMenuCommand('停止自动刷新', stopAutoRefresh);

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();