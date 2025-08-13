# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

遵守Clean Code原则

总是写详细点注释

## Project Overview

这是一个Power BI自动刷新项目，使用TamperMonkey创建浏览器插件来自动化Power BI数据模型和报表的刷新操作。

主要功能：
- 自动刷新Semantic Model数据模型
- 自动刷新Report报表并切换全屏
- 支持定时执行（30分钟/1小时/2小时/3小时间隔）
- 提供可视化设置面板和倒计时显示

## Development Commands

此项目是TamperMonkey用户脚本，无需传统的构建命令。

安装和测试：
1. 安装TamperMonkey浏览器扩展
2. 在TamperMonkey中导入 `powerbi-auto-refresh.user.js`
3. 访问 https://app.powerbi.com 进行测试

## Architecture

### 技术栈
- **TamperMonkey** - 浏览器用户脚本管理器
- **JavaScript ES6+** - 核心脚本语言
- **DOM API** - 页面元素操作
- **MutationObserver** - 页面变化监听

### 核心模块
1. **页面检测模块** - 识别Semantic Model vs Report页面
2. **自动刷新模块** - 处理两种不同的刷新流程
3. **定时器模块** - 管理自动执行和倒计时
4. **设置管理模块** - 用户配置的存储和UI
5. **通知系统** - 用户反馈和状态提示
6. **拖动系统** - 支持状态指示器和设置面板的拖拽移动

### 关键选择器
```css
/* Semantic Model 页面 */
#model-actionbar-refresh
button[title="Refresh now"]

/* Report 页面 */
#reportAppBarRefreshBtn
button[data-testid="app-bar-view-menu-btn"]
button[data-testid="open-in-full-screen-btn"]
```

## Project Structure

```
/
├── powerbi-auto-refresh.user.js    # 主要的TamperMonkey用户脚本
├── 使用说明.md                     # 详细的用户使用指南
├── Readme.md                       # 项目需求和功能说明
└── CLAUDE.md                       # 此文件，开发指导文档
```

## 开发注意事项

1. **CSS选择器维护** - Power BI界面更新时需要同步更新选择器
2. **等待时间优化** - 根据实际网络情况调整各种等待时间
3. **错误处理** - 增强异常情况的处理和用户提示
4. **权限检查** - 确保脚本只在正确的域名下运行

## 功能测试要点

1. 在Semantic Model页面测试自动刷新流程
2. 在Report页面测试刷新和全屏切换
3. 验证定时器和倒计时功能
4. 测试设置面板的保存和加载
5. 确认页面切换时的正确识别
6. 测试状态指示器和设置面板的拖动功能
7. 验证位置保存和恢复功能
8. 测试双击重置位置功能