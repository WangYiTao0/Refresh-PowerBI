# 项目需求

## 基本功能

1. 使用 TamperMonkey 制作一个定时刷新 PowerBI 到插件
2. 定时点击功能（如每隔一小时/30 分钟），分别对应两个功能
   1. 有倒计时显示
3. 刷 power BI Semantic Model
4. 刷新 Power BI report 内容
5. 网址都是 app.powerbi.com
6. 简单的设置面板，会根据地址变化
   1. 地址包含 report 就是 powerbi report 网页
   2. 地址包含 datasets 就是 power bi Semantic Model 网页

## 1. 刷新 Semantic Model 网页功能

1. 找到 Refresh 按钮 -->点击

```css
<button _ngcontent-ng-c3482213581="" tri-button="" appearance="subtle" class="mat-mdc-menu-trigger ng-star-inserted" title="Refresh" aria-label="Refresh" id="model-actionbar-refresh" aria-haspopup="menu" aria-expanded="false" pbi-focus-tracker-idx="32">
```

2. 等待展开 menu 1s
3. 找到 refresh now 按钮 -->点击

```css
<button _ngcontent-ng-c3482213581="" mat-menu-item="" tri-button="" appearance="subtle" class="mat-mdc-menu-item mat-mdc-focus-indicator app-bar-mat-menu-button ng-star-inserted" title="Refresh now" aria-label="Refresh now" role="menuitem" tabindex="0" aria-disabled="false" pbi-focus-tracker-idx="33">
```

4. 等待刷新 60s

## 2. 刷新 report model 网页功能

1. 判断当前页面是否全屏 -> 如果是 -> 退出全屏
2. 找到 refresh visuals 按钮 -> 点击 -> 等待 30s（可自定义）

```css
<button _ngcontent-ng-c1231654981="" id="reportAppBarRefreshBtn" class="actionBarBtn app-bar-nav-btn ng-star-inserted" aria-label="Refresh visuals—when the data model has been updated, refreshing will update all visuals with the latest data." pbi-focus-tracker-idx="14"><mat-icon _ngcontent-ng-c1231654981="" role="img" fonticon="pbi-glyph-refresh" class="mat-icon notranslate pbi-glyph-refresh pbi-glyph-font-face mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="pbi-glyph-refresh"></mat-icon></button>
```

3. 找到 menu 按钮->点击-> 等 1s 展开 menu

```css
<button _ngcontent-ng-c1231654981="" data-testid="app-bar-view-menu-btn" class="mat-mdc-menu-trigger rightActionBarBtn app-bar-nav-btn" aria-haspopup="menu" aria-expanded="false" aria-label="View" pbi-focus-tracker-idx="15">
```

4. 找到 full screen 按钮 -> 点击

```css
<button _ngcontent-ng-c1231654981="" mat-menu-item="" data-testid="open-in-full-screen-btn" localizetooltip="OpenInFullScreen" class="mat-mdc-menu-item mat-mdc-focus-indicator appBarMatMenu ng-tns-c1967311527-34" title="Open in full-screen mode" role="menuitem" tabindex="0" aria-disabled="false" pbi-focus-tracker-idx="16"><span class="mat-mdc-menu-item-text"><pbi-office-icon _ngcontent-ng-c1231654981="" aria-hidden="true" role="presentation" name="FullScreenSizeIcon_16" class="pbi-office-icon ng-star-inserted" _nghost-ng-c2454461394=""><svg height="100%" width="100%" focusable="false" viewBox="0 0 16 16"><path key="0" class="OfficeIconColors_HighContrast" d="M15,1v5h-1V2.711L2.711,14H6v1H1v-5h1v3.289L13.289,2H10V1H15z"></path><path key="1" class="OfficeIconColors_m22" d="M15,1v5h-1V2.711L2.711,14H6v1H1v-5h1v3.289L13.289,2H10V1H15z"></path></svg></pbi-office-icon><!----><!----><!----><span _ngcontent-ng-c1231654981="" localize="FullScreen">Full screen</span></span><div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div><!----></button>
```
