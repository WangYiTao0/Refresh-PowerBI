// ==UserScript==
// @name         Power BI Minimal Test
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  最小化测试版本，验证基本功能
// @author       You
// @match        https://app.powerbi.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('=== 最小化测试版本 ===');

    let indicator = null;
    let isVisible = true;

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

    // 创建指示器
    function createIndicator() {
        indicator = document.createElement('div');
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
        `;
        indicator.textContent = '🔄';
        indicator.title = '点击测试 | Shift+Alt+H 切换';

        indicator.addEventListener('click', function() {
            showNotification('指示器点击测试成功!', 'success');
        });

        document.body.appendChild(indicator);
        console.log('✅ 指示器已创建');
    }

    // 切换显示/隐藏
    function toggleIndicator() {
        if (!indicator) return;
        
        if (isVisible) {
            indicator.style.display = 'none';
            isVisible = false;
            console.log('❌ 指示器已隐藏');
            showNotification('指示器已隐藏', 'info');
        } else {
            indicator.style.display = 'flex';
            isVisible = true;
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
                showNotification('快捷键成功!', 'success');
                toggleIndicator();
            }
        });
        console.log('⌨️ 快捷键已设置');
    }

    // 初始化
    function init() {
        console.log('开始初始化...');
        
        setupShortcuts();
        
        setTimeout(() => {
            createIndicator();
            showNotification('测试版本已加载!', 'success');
            
            console.log('=== 测试说明 ===');
            console.log('1. 右上角应显示蓝色🔄图标');
            console.log('2. 点击图标测试点击功能');
            console.log('3. 按 Shift+Alt+H 测试快捷键');
            console.log('4. 如果都正常，说明基本功能可用');
        }, 1000);
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();