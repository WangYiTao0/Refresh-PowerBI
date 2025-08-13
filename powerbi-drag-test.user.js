// ==UserScript==
// @name         Power BI Drag Test
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  测试拖动功能的简化版本
// @author       You
// @match        https://app.powerbi.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    console.log('拖动测试版本加载中...');

    // 创建测试指示器
    function createTestIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'test-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: #e74c3c;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9999;
            color: white;
            font-weight: bold;
            user-select: none;
            transition: all 0.3s ease;
        `;
        indicator.textContent = 'DRAG';

        // 拖动变量
        let isDragging = false;
        let dragTimeout = null;
        let initialX = 0;
        let initialY = 0;

        // 鼠标按下
        indicator.addEventListener('mousedown', function(e) {
            if (dragTimeout) {
                clearTimeout(dragTimeout);
                dragTimeout = null;
            }

            const rect = indicator.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;

            dragTimeout = setTimeout(() => {
                isDragging = true;
                e.preventDefault();
                e.stopPropagation();
                
                indicator.style.opacity = '0.8';
                indicator.style.transform = 'scale(1.1)';
                indicator.style.cursor = 'grabbing';
                indicator.style.transition = 'none';
                
                console.log('开始拖动测试指示器');
                
                // 开始拖动时添加事件监听器
                startDrag();
            }, 150);
        });

        // 事件处理函数
        let mouseMoveHandler = null;
        let mouseUpHandler = null;

        // 在拖动开始时动态添加事件监听器
        function startDrag() {
            mouseMoveHandler = function(e) {
                if (isDragging) {
                    e.preventDefault();
                    
                    const newX = e.clientX - initialX;
                    const newY = e.clientY - initialY;

                    const windowWidth = window.innerWidth;
                    const windowHeight = window.innerHeight;
                    const indicatorSize = 60;

                    const constrainedX = Math.max(0, Math.min(newX, windowWidth - indicatorSize));
                    const constrainedY = Math.max(0, Math.min(newY, windowHeight - indicatorSize));

                    indicator.style.left = constrainedX + 'px';
                    indicator.style.top = constrainedY + 'px';
                    indicator.style.right = 'auto';
                    
                    console.log('拖动到位置:', constrainedX, constrainedY);
                }
            };

            mouseUpHandler = function(e) {
                console.log('测试拖动结束，isDragging:', isDragging);
                
                if (isDragging) {
                    isDragging = false;
                    
                    indicator.style.transition = 'all 0.3s ease';
                    indicator.style.opacity = '1';
                    indicator.style.transform = 'scale(1)';
                    indicator.style.cursor = 'pointer';
                    
                    console.log('结束拖动测试指示器');
                    
                    // 清理事件监听器
                    if (mouseMoveHandler) {
                        document.removeEventListener('mousemove', mouseMoveHandler);
                        mouseMoveHandler = null;
                    }
                    if (mouseUpHandler) {
                        document.removeEventListener('mouseup', mouseUpHandler);
                        mouseUpHandler = null;
                    }
                    
                    console.log('测试拖动事件监听器已清理');
                }
            };
            
            // 添加事件监听器
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        }

        // 全局鼠标释放事件（处理拖动延时期间的释放）
        document.addEventListener('mouseup', function(e) {
            if (dragTimeout) {
                clearTimeout(dragTimeout);
                dragTimeout = null;
                console.log('清除测试拖动延时 - 这是点击操作');
            }
        });

        // 点击事件（非拖动时）
        indicator.addEventListener('click', function(e) {
            if (!isDragging) {
                console.log('测试指示器被点击');
                alert('测试指示器点击成功！\n如果你能成功拖动红色圆圈，说明拖动功能正常。');
            }
        });

        document.body.appendChild(indicator);
        console.log('拖动测试指示器已创建');
    }

    // 等待页面加载
    function init() {
        setTimeout(() => {
            createTestIndicator();
        }, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();