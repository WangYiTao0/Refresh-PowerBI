// ==UserScript==
// @name         Power BI Drag Test Simple
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  简化的拖动功能测试
// @author       You
// @match        https://app.powerbi.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    console.log('=== 拖动功能测试版本 ===');

    let testElement = null;

    // 创建测试元素
    function createTestElement() {
        testElement = document.createElement('div');
        testElement.id = 'drag-test-element';
        testElement.style.cssText = `
            position: fixed;
            top: 100px;
            right: 100px;
            width: 80px;
            height: 80px;
            background: #e74c3c;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: move;
            z-index: 99999;
            color: white;
            font-weight: bold;
            font-size: 12px;
            text-align: center;
            user-select: none;
        `;
        testElement.innerHTML = 'DRAG<br>TEST';

        // 简化的拖动实现
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;

        testElement.addEventListener('mousedown', function(e) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = testElement.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
            testElement.style.cursor = 'grabbing';
            testElement.style.opacity = '0.8';
            
            console.log('开始拖动测试元素');
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = initialLeft + deltaX;
            const newTop = initialTop + deltaY;
            
            // 边界限制
            const maxLeft = window.innerWidth - 80;
            const maxTop = window.innerHeight - 80;
            
            const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));
            const constrainedTop = Math.max(0, Math.min(newTop, maxTop));
            
            testElement.style.left = constrainedLeft + 'px';
            testElement.style.top = constrainedTop + 'px';
        });

        document.addEventListener('mouseup', function(e) {
            if (!isDragging) return;
            
            isDragging = false;
            testElement.style.cursor = 'move';
            testElement.style.opacity = '1';
            
            console.log('结束拖动测试元素');
            
            // 保存位置
            const rect = testElement.getBoundingClientRect();
            GM_setValue('testDragX', rect.left);
            GM_setValue('testDragY', rect.top);
        });

        // 恢复保存的位置
        const savedX = GM_getValue('testDragX', null);
        const savedY = GM_getValue('testDragY', null);
        
        if (savedX !== null && savedY !== null) {
            testElement.style.left = savedX + 'px';
            testElement.style.top = savedY + 'px';
            testElement.style.right = 'auto';
        }

        document.body.appendChild(testElement);
        console.log('✅ 拖动测试元素已创建');
    }

    // 初始化
    function init() {
        setTimeout(() => {
            createTestElement();
            console.log('测试说明: 尝试拖动红色圆圈进行测试');
        }, 1000);
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();