// ==UserScript==
// @name         Power BI Simplified Working
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  简化版本，基于测试版本逐步添加功能
// @author       You
// @match        https://app.powerbi.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    console.log('=== 简化工作版本开始加载 ===');

    // 全局变量
    let indicatorElement = null;
    let isIndicatorVisible = true;

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

    // 创建简化的设置面板
    function createSimpleSettingsPanel() {
        console.log('🎯 创建简化设置面板');
        
        try {
            // 移除已存在的面板
            const existing = document.getElementById('simple-settings-panel');
            if (existing) {
                existing.remove();
            }

            const panel = document.createElement('div');
            panel.id = 'simple-settings-panel';
            panel.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                width: 300px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
            `;

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
                    <h3 style="margin: 0; color: #333;">Power BI 设置</h3>
                    <button id="close-simple-panel" style="
                        background: none;
                        border: none;
                        font-size: 18px;
                        cursor: pointer;
                        color: #666;
                    ">×</button>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 15px;">
                        <strong>📍 简化版本测试</strong>
                    </div>
                    
                    <div style="
                        background: #e8f4fd;
                        padding: 8px;
                        border-radius: 5px;
                        font-size: 12px;
                        color: #2c3e50;
                        margin-bottom: 15px;
                    ">
                        <strong>⌨️ 快捷键:</strong> Shift+Alt+H 显示/隐藏指示器
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button id="test-notification" style="
                            flex: 1;
                            padding: 8px;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        ">测试通知</button>
                        
                        <button id="close-panel" style="
                            flex: 1;
                            padding: 8px;
                            background: #27ae60;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        ">关闭</button>
                    </div>
                </div>
            `;

            document.body.appendChild(panel);
            console.log('✅ 简化面板已添加到DOM');

            // 绑定事件
            document.getElementById('close-simple-panel').addEventListener('click', function() {
                panel.remove();
                console.log('✅ 面板已关闭');
            });

            document.getElementById('test-notification').addEventListener('click', function() {
                showNotification('测试通知功能正常!', 'success');
            });

            document.getElementById('close-panel').addEventListener('click', function() {
                panel.remove();
                console.log('✅ 面板已关闭');
            });

            // 点击外部关闭
            setTimeout(() => {
                document.addEventListener('click', function handleOutsideClick(e) {
                    if (!panel.contains(e.target) && e.target.id !== 'simple-indicator') {
                        panel.remove();
                        document.removeEventListener('click', handleOutsideClick);
                    }
                });
            }, 100);

            console.log('✅ 简化设置面板创建完成');

        } catch (error) {
            console.error('❌ 简化面板创建失败:', error);
            showNotification('面板创建失败: ' + error.message, 'error');
        }
    }

    // 创建状态指示器
    function createIndicator() {
        console.log('📍 创建状态指示器');
        
        try {
            const indicator = document.createElement('div');
            indicator.id = 'simple-indicator';
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
            `;
            indicator.textContent = '🔄';
            indicator.title = '点击打开设置 | Shift+Alt+H 切换显示';

            // 点击事件
            indicator.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('✅ 指示器被点击');
                createSimpleSettingsPanel();
            });

            // 悬停效果
            indicator.addEventListener('mouseenter', function() {
                this.style.background = '#2980b9';
                this.style.transform = 'scale(1.1)';
            });

            indicator.addEventListener('mouseleave', function() {
                this.style.background = '#3498db';
                this.style.transform = 'scale(1)';
            });

            document.body.appendChild(indicator);
            indicatorElement = indicator;
            
            console.log('✅ 状态指示器创建完成');

        } catch (error) {
            console.error('❌ 指示器创建失败:', error);
            showNotification('指示器创建失败: ' + error.message, 'error');
        }
    }

    // 切换显示/隐藏
    function toggleIndicator() {
        if (!indicatorElement) return;
        
        if (isIndicatorVisible) {
            indicatorElement.style.display = 'none';
            isIndicatorVisible = false;
            console.log('❌ 指示器已隐藏');
            showNotification('指示器已隐藏', 'info');
        } else {
            indicatorElement.style.display = 'flex';
            isIndicatorVisible = true;
            console.log('✅ 指示器已显示');
            showNotification('指示器已显示', 'success');
        }
    }

    // 设置快捷键
    function setupShortcuts() {
        document.addEventListener('keydown', function(e) {
            if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                e.stopPropagation();
                console.log('⌨️ 快捷键 Shift+Alt+H 触发');
                toggleIndicator();
            }
        });
        console.log('⌨️ 快捷键已设置');
    }

    // 初始化
    function init() {
        console.log('📍 开始初始化简化版本...');
        
        try {
            setupShortcuts();
            console.log('✅ 快捷键设置完成');
            
            createIndicator();
            console.log('✅ 指示器创建完成');
            
            showNotification('简化版本加载成功!', 'success');
            console.log('✅ 简化版本初始化完成');
            
        } catch (error) {
            console.error('❌ 初始化失败:', error);
            showNotification('初始化失败: ' + error.message, 'error');
        }
    }

    // 注册菜单命令
    GM_registerMenuCommand('显示/隐藏指示器', toggleIndicator);
    GM_registerMenuCommand('打开设置面板', createSimpleSettingsPanel);

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();