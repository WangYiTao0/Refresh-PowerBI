// ==UserScript==
// @name         Power BI Auto Refresh Fixed
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  修复版本：自动刷新Power BI数据模型和报表，支持定时刷新和全屏显示
// @author       You
// @match        https://app.powerbi.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    console.log('=== Power BI 自动刷新脚本 - 修复版本 ===');

    // 全局变量
    let indicatorElement = null;
    let isIndicatorVisible = true;
    let isFullscreen = false;

    // 显示通知
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            background-color: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // 简化的设置面板
    function createSettingsPanel() {
        console.log('🎯 创建设置面板');
        
        try {
            // 移除已存在的面板
            const existing = document.getElementById('powerbi-settings-panel');
            if (existing) {
                existing.remove();
            }

            const panel = document.createElement('div');
            panel.id = 'powerbi-settings-panel';
            panel.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                width: 350px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
            `;

            panel.innerHTML = `
                <div id="panel-header" style="
                    background: #f8f9fa;
                    padding: 15px;
                    border-bottom: 1px solid #eee;
                    border-radius: 8px 8px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                ">
                    <h3 style="margin: 0; color: #333;">🔄 Power BI 自动刷新</h3>
                    <button id="close-panel" style="
                        background: none;
                        border: none;
                        font-size: 18px;
                        cursor: pointer;
                        color: #666;
                    ">×</button>
                </div>
                <div style="padding: 20px;">
                    <div style="
                        background: #e8f4fd;
                        padding: 10px;
                        border-radius: 5px;
                        font-size: 12px;
                        color: #2c3e50;
                        margin-bottom: 15px;
                    ">
                        <strong>⌨️ 快捷键:</strong> Shift+Alt+H 显示/隐藏指示器<br>
                        <strong>🖱️ 拖动:</strong> 拖动指示器和面板到任意位置<br>
                        <strong>🖥️ 全屏:</strong> 全屏时自动隐藏，退出时显示
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button id="test-notification" style="
                            flex: 1;
                            padding: 8px;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        ">测试通知</button>
                        
                        <button id="close-panel-btn" style="
                            flex: 1;
                            padding: 8px;
                            background: #27ae60;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        ">关闭面板</button>
                    </div>
                </div>
            `;

            document.body.appendChild(panel);
            console.log('✅ 设置面板已创建');

            // 绑定事件
            document.getElementById('close-panel').addEventListener('click', () => panel.remove());
            document.getElementById('close-panel-btn').addEventListener('click', () => panel.remove());
            document.getElementById('test-notification').addEventListener('click', () => {
                showNotification('测试通知功能正常!', 'success');
            });

            // 添加面板拖动功能
            makePanelDraggable(panel);

            // 点击外部关闭
            setTimeout(() => {
                document.addEventListener('click', function handleOutsideClick(e) {
                    if (!panel.contains(e.target) && e.target.id !== 'powerbi-refresh-indicator') {
                        panel.remove();
                        document.removeEventListener('click', handleOutsideClick);
                    }
                });
            }, 100);

        } catch (error) {
            console.error('❌ 设置面板创建失败:', error);
            showNotification('面板创建失败: ' + error.message, 'error');
        }
    }

    // 面板拖动功能
    function makePanelDraggable(panel) {
        const header = panel.querySelector('#panel-header');
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        header.addEventListener('mousedown', function(e) {
            if (e.button === 0) { // 左键
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                
                const rect = panel.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                
                header.style.cursor = 'grabbing';
                panel.style.transition = 'none';
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;
            
            // 边界限制
            const maxLeft = window.innerWidth - panel.offsetWidth;
            const maxTop = window.innerHeight - panel.offsetHeight;
            
            const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));
            const constrainedTop = Math.max(0, Math.min(newTop, maxTop));
            
            panel.style.left = constrainedLeft + 'px';
            panel.style.top = constrainedTop + 'px';
            panel.style.right = 'auto';
        });

        document.addEventListener('mouseup', function(e) {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'move';
                panel.style.transition = '';
                
                // 保存位置
                const rect = panel.getBoundingClientRect();
                GM_setValue('panelX', rect.left);
                GM_setValue('panelY', rect.top);
            }
        });
    }

    // 指示器拖动功能 - 简化版本
    function makeIndicatorDraggable(indicator) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        let hasMoved = false;

        indicator.addEventListener('mousedown', function(e) {
            if (e.button === 0) { // 左键
                isDragging = true;
                hasMoved = false;
                startX = e.clientX;
                startY = e.clientY;
                
                const rect = indicator.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            // 检查是否有实际移动
            if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
                if (!hasMoved) {
                    hasMoved = true;
                    indicator.style.opacity = '0.8';
                    indicator.style.cursor = 'grabbing';
                    indicator.style.zIndex = '99999';
                    console.log('开始拖动指示器');
                }
                
                const newLeft = startLeft + deltaX;
                const newTop = startTop + deltaY;
                
                // 边界限制
                const maxLeft = window.innerWidth - 50;
                const maxTop = window.innerHeight - 50;
                
                const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));
                const constrainedTop = Math.max(0, Math.min(newTop, maxTop));
                
                indicator.style.left = constrainedLeft + 'px';
                indicator.style.top = constrainedTop + 'px';
                indicator.style.right = 'auto';
            }
        });

        document.addEventListener('mouseup', function(e) {
            if (isDragging) {
                isDragging = false;
                
                if (hasMoved) {
                    // 这是拖动，阻止点击事件
                    indicator.style.opacity = '1';
                    indicator.style.cursor = 'pointer';
                    indicator.style.zIndex = '9999';
                    
                    // 保存位置
                    const rect = indicator.getBoundingClientRect();
                    GM_setValue('indicatorX', rect.left);
                    GM_setValue('indicatorY', rect.top);
                    
                    console.log('拖动结束，位置已保存');
                    
                    // 阻止点击事件
                    setTimeout(() => hasMoved = false, 100);
                } else {
                    // 这是点击，允许点击事件触发
                    console.log('检测到点击');
                }
            }
        });
    }

    // 创建状态指示器
    function createStatusIndicator() {
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
            color: white;
            font-size: 20px;
            transition: all 0.3s ease;
            user-select: none;
        `;
        indicator.textContent = '🔄';
        indicator.title = '点击打开设置 | 拖动移动位置 | Shift+Alt+H 切换显示';

        // 点击事件
        indicator.addEventListener('click', function(e) {
            // 检查是否刚才拖动过
            if (e.target.style.opacity === '0.8') return;
            
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ 指示器被点击');
            createSettingsPanel();
        });

        // 悬停效果
        indicator.addEventListener('mouseenter', function() {
            if (!this.style.opacity || this.style.opacity === '1') {
                this.style.background = '#2980b9';
                this.style.transform = 'scale(1.1)';
            }
        });

        indicator.addEventListener('mouseleave', function() {
            if (!this.style.opacity || this.style.opacity === '1') {
                this.style.background = '#3498db';
                this.style.transform = 'scale(1)';
            }
        });

        document.body.appendChild(indicator);
        indicatorElement = indicator;
        
        // 添加拖动功能
        makeIndicatorDraggable(indicator);
        
        // 恢复保存的位置
        const savedX = GM_getValue('indicatorX', null);
        const savedY = GM_getValue('indicatorY', null);
        
        if (savedX !== null && savedY !== null) {
            indicator.style.left = savedX + 'px';
            indicator.style.top = savedY + 'px';
            indicator.style.right = 'auto';
        }

        console.log('✅ 状态指示器创建完成');
    }

    // 切换显示/隐藏
    function toggleIndicator() {
        if (!indicatorElement) return;
        
        if (isIndicatorVisible) {
            indicatorElement.style.display = 'none';
            isIndicatorVisible = false;
            showNotification('指示器已隐藏', 'info');
        } else {
            indicatorElement.style.display = 'flex';
            isIndicatorVisible = true;
            showNotification('指示器已显示', 'success');
        }
    }

    // 检查全屏状态
    function checkFullscreenStatus() {
        const currentFullscreen = !!(document.fullscreenElement || 
                                   document.webkitFullscreenElement || 
                                   document.mozFullScreenElement || 
                                   document.msFullscreenElement);
        
        if (currentFullscreen !== isFullscreen) {
            isFullscreen = currentFullscreen;
            
            if (isFullscreen && indicatorElement && isIndicatorVisible) {
                indicatorElement.style.display = 'none';
                showNotification('全屏模式，指示器自动隐藏', 'info');
            } else if (!isFullscreen && indicatorElement && isIndicatorVisible) {
                indicatorElement.style.display = 'flex';
                showNotification('退出全屏，指示器自动显示', 'success');
            }
        }
    }

    // 设置快捷键
    function setupShortcuts() {
        document.addEventListener('keydown', function(e) {
            if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                e.stopPropagation();
                console.log('⌨️ 快捷键触发');
                toggleIndicator();
            }
        });
        console.log('⌨️ 快捷键已设置');
    }

    // 设置全屏监听
    function setupFullscreenListener() {
        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'];
        events.forEach(event => document.addEventListener(event, checkFullscreenStatus));
        setInterval(checkFullscreenStatus, 1000);
        console.log('🖥️ 全屏监听已设置');
    }

    // 初始化
    function init() {
        console.log('开始初始化...');
        
        try {
            setupShortcuts();
            setupFullscreenListener();
            createStatusIndicator();
            showNotification('Power BI 插件已加载', 'success');
            console.log('=== 初始化完成 ===');
        } catch (error) {
            console.error('❌ 初始化失败:', error);
            showNotification('初始化失败: ' + error.message, 'error');
        }
    }

    // 注册菜单命令
    GM_registerMenuCommand('显示/隐藏指示器', toggleIndicator);
    GM_registerMenuCommand('打开设置面板', createSettingsPanel);

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();