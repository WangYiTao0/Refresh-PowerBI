// ==UserScript==
// @name         Power BI Debug Test
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  调试测试版本，简化功能用于排查问题
// @author       You
// @match        https://app.powerbi.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('调试版本脚本开始加载...');

    // 创建一个简单的测试按钮
    function createTestButton() {
        // 移除已存在的测试按钮
        const existing = document.getElementById('powerbi-debug-btn');
        if (existing) {
            existing.remove();
        }

        const button = document.createElement('div');
        button.id = 'powerbi-debug-btn';
        button.textContent = 'TEST';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: red;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 99999;
            border-radius: 50%;
            font-weight: bold;
            font-size: 12px;
        `;

        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('测试按钮被点击了！');
            alert('测试按钮点击成功！\n这说明基本的点击事件是工作的。');
            
            // 创建简单的设置面板
            createSimplePanel();
        });

        document.body.appendChild(button);
        console.log('测试按钮已创建');
    }

    // 创建简单的设置面板
    function createSimplePanel() {
        // 移除已存在的面板
        const existing = document.getElementById('simple-panel');
        if (existing) {
            existing.remove();
        }

        const panel = document.createElement('div');
        panel.id = 'simple-panel';
        panel.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            width: 200px;
            height: 150px;
            background: white;
            border: 2px solid #333;
            z-index: 99998;
            padding: 10px;
        `;
        
        panel.innerHTML = `
            <h3>测试面板</h3>
            <p>如果你能看到这个面板，说明基本功能正常。</p>
            <button id="close-panel" style="padding: 5px 10px;">关闭</button>
        `;

        document.body.appendChild(panel);
        console.log('简单面板已创建');

        // 绑定关闭事件
        document.getElementById('close-panel').addEventListener('click', function() {
            console.log('关闭按钮被点击');
            panel.remove();
        });
    }

    // 等待页面加载完成
    function init() {
        console.log('调试脚本初始化');
        
        // 等待2秒后创建测试按钮，确保页面完全加载
        setTimeout(() => {
            createTestButton();
            console.log('调试脚本加载完成，请查看页面右上角的红色TEST按钮');
        }, 2000);
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();