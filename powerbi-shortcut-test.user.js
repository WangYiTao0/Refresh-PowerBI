// ==UserScript==
// @name         Power BI Shortcut Test
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  测试快捷键和全屏功能
// @author       You
// @match        https://app.powerbi.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('快捷键和全屏测试版本加载中...');

    let testIndicator = null;
    let isVisible = true;
    let isFullscreen = false;

    // 创建测试指示器
    function createTestIndicator() {
        testIndicator = document.createElement('div');
        testIndicator.id = 'shortcut-test-indicator';
        testIndicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            width: 80px;
            height: 80px;
            background: #9b59b6;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            color: white;
            font-weight: bold;
            font-size: 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        testIndicator.innerHTML = 'SHORTCUT<br>TEST';

        testIndicator.addEventListener('click', function() {
            alert('测试指示器点击成功！\\n\\n快捷键测试说明：\\n1. 按 Shift+Alt+H 切换显示/隐藏\\n2. 按 F11 进入/退出浏览器全屏测试自动隐藏/显示');
        });

        document.body.appendChild(testIndicator);
        console.log('测试指示器已创建');
    }

    // 显示指示器
    function showIndicator() {
        if (testIndicator && !isVisible) {
            testIndicator.style.display = 'flex';
            isVisible = true;
            console.log('✅ 显示测试指示器');
            showNotification('指示器已显示', 'success');
        }
    }

    // 隐藏指示器
    function hideIndicator() {
        if (testIndicator && isVisible) {
            testIndicator.style.display = 'none';
            isVisible = false;
            console.log('❌ 隐藏测试指示器');
            showNotification('指示器已隐藏', 'info');
        }
    }

    // 切换指示器
    function toggleIndicator() {
        if (isVisible) {
            hideIndicator();
        } else {
            showIndicator();
        }
    }

    // 显示通知
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 120px;
            left: 20px;
            padding: 10px 15px;
            border-radius: 5px;
            color: white;
            font-size: 14px;
            z-index: 99998;
            transition: all 0.3s ease;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    // 检查全屏状态
    function checkFullscreenStatus() {
        const currentFullscreen = !!(document.fullscreenElement || 
                                    document.webkitFullscreenElement || 
                                    document.mozFullScreenElement || 
                                    document.msFullscreenElement);
        
        if (currentFullscreen !== isFullscreen) {
            isFullscreen = currentFullscreen;
            console.log('🖥️ 全屏状态变化:', isFullscreen ? '进入全屏' : '退出全屏');
            
            if (isFullscreen) {
                hideIndicator();
                showNotification('进入全屏，自动隐藏', 'info');
            } else {
                showIndicator();
                showNotification('退出全屏，自动显示', 'success');
            }
        }
    }

    // 设置快捷键监听
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('⌨️ 检测到快捷键 Shift+Alt+H');
                showNotification('快捷键触发: Shift+Alt+H', 'success');
                toggleIndicator();
            }
        });
        
        console.log('⌨️ 快捷键监听已设置: Shift+Alt+H');
    }

    // 设置全屏监听
    function setupFullscreenListener() {
        const fullscreenEvents = [
            'fullscreenchange',
            'webkitfullscreenchange', 
            'mozfullscreenchange',
            'msfullscreenchange'
        ];
        
        fullscreenEvents.forEach(eventName => {
            document.addEventListener(eventName, checkFullscreenStatus);
        });
        
        setInterval(checkFullscreenStatus, 1000);
        
        console.log('🖥️ 全屏状态监听已设置');
    }

    // 初始化
    function init() {
        console.log('=== 快捷键和全屏功能测试 ===');
        console.log('1. 创建测试指示器');
        console.log('2. 设置 Shift+Alt+H 快捷键');
        console.log('3. 设置全屏状态监听');
        console.log('4. 测试方法：');
        console.log('   - 按 Shift+Alt+H 切换显示/隐藏');
        console.log('   - 按 F11 测试全屏自动隐藏/显示');
        
        setupKeyboardShortcuts();
        setupFullscreenListener();
        
        setTimeout(() => {
            createTestIndicator();
            checkFullscreenStatus();
            
            // 显示测试说明
            setTimeout(() => {
                showNotification('测试已就绪! 按 Shift+Alt+H', 'success');
            }, 1000);
        }, 2000);
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();