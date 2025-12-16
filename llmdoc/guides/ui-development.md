# UI开发指南

Galacean Engine提供了强大的UI系统，支持2D/3D混合UI、动态布局、动画效果等功能。本指南详细介绍如何使用UI系统创建用户界面。

## 目录
- [UI系统概述](#ui系统概述)
- [Canvas基础](#canvas基础)
- [UI组件](#ui组件)
- [布局系统](#布局系统)
- [事件系统](#事件系统)
- [UI动画](#ui动画)
- [UI优化](#ui优化)
- [最佳实践](#最佳实践)

## UI系统概述

### 核心概念

- **UICanvas**: UI画布，所有UI元素的根容器
- **RectTransform**: UI专用的变换组件，支持锚点、布局等功能
- **Graphic**: 图形基类，负责图像渲染和交互
- **Layout**: 布局组件，自动排列子元素
- **Mask**: 裁剪组件，控制显示区域

### UI坐标系统

```typescript
// UI使用屏幕坐标系，原点在左上角
// X轴向右为正，Y轴向下为正

// 获取UI坐标
const screenPosition = new Vector2(
  event.clientX,
  event.clientY
);

// 转换到世界坐标
const worldPosition = camera.screenToWorldPoint(
  new Vector3(screenPosition.x, screenPosition.y, camera.nearClipPlane)
);
```

## Canvas基础

### 创建Canvas

```typescript
import { UICanvas, RectTransform, CanvasScaler } from '@galacean/engine-ui';

// 创建UI Canvas
const canvasEntity = scene.createRootEntity('UI Canvas');
const canvas = canvasEntity.addComponent(UICanvas);

// 设置Canvas属性
canvas.sortingOrder = 0;        // 渲染顺序
canvas.renderMode = CanvasRenderMode.ScreenSpace; // 渲染模式

// 添加缩放组件（适配不同分辨率）
const scaler = canvasEntity.addComponent(CanvasScaler);
scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
scaler.referenceResolution = new Vector2(1920, 1080);
scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
scaler.matchWidthOrHeight = 0.5; // 0=width, 1=height

// 其他渲染模式
canvas.renderMode = CanvasRenderMode.WorldSpace; // 3D空间中的UI
canvas.renderMode = CanvasRenderMode.CameraSpace; // 相机空间UI
```

### Canvas渲染模式

```typescript
// Screen Space - Overlay（2D UI）
canvas.renderMode = CanvasRenderMode.ScreenSpaceOverlay;
canvas.pixelPerfect = true;

// Screen Space - Camera（跟随相机的2D UI）
canvas.renderMode = CanvasRenderMode.ScreenSpaceCamera;
canvas.renderCamera = mainCamera;

// World Space（3D空间中的UI）
canvas.renderMode = CanvasRenderMode.WorldSpace;
const rectTransform = canvasEntity.getComponent(RectTransform);
rectTransform.size = new Vector2(800, 600);
```

### 多Canvas管理

```typescript
class CanvasManager {
  private canvases: Map<string, UICanvas> = new Map();
  private layerOrder: string[] = [];

  addCanvas(name: string, canvas: UICanvas, order: number = 0): void {
    this.canvases.set(name, canvas);
    canvas.sortingOrder = order;

    this.updateLayerOrder();
  }

  bringToFront(canvasName: string): void {
    const canvas = this.canvases.get(canvasName);
    if (canvas) {
      const maxOrder = Math.max(...Array.from(this.canvases.values())
        .map(c => c.sortingOrder));
      canvas.sortingOrder = maxOrder + 1;
    }
  }

  hideCanvas(canvasName: string): void {
    const canvas = this.canvases.get(canvasName);
    if (canvas) {
      canvas.enabled = false;
    }
  }

  showCanvas(canvasName: string): void {
    const canvas = this.canvases.get(canvasName);
    if (canvas) {
      canvas.enabled = true;
      this.bringToFront(canvasName);
    }
  }
}
```

## UI组件

### 基础组件

#### Image组件

```typescript
import { Image, ImageType, Sprite } from '@galacean/engine-ui';

// 创建Image
const imageEntity = canvasEntity.createChild('Image');
const image = imageEntity.addComponent(Image);

// 设置图片
const sprite = await resourceManager.load<Sprite>('ui_button.png');
image.sprite = sprite;

// 图片类型
image.type = ImageType.Simple;      // 普通图片
image.type = ImageType.Sliced;      // 九宫格切片
image.type = ImageType.Tiled;       // 平铺
image.type = ImageType.Filled;      // 填充

// 九宫格设置
image.type = ImageType.Sliced;
image.fillCenter = new Rect(10, 10, 20, 20); // 中心区域

// 填充设置
image.type = ImageType.Filled;
image.fillMethod = Image.FillMethod.Radial360;
image.fillAmount = 0.75; // 填充75%
image.fillOrigin = 2;    // 从顶部开始

// 颜色设置
image.color = new Color(1, 1, 1, 1);
```

#### Text组件

```typescript
import { Text, Font, TextOverflow } from '@galacean/engine-ui';

// 创建Text
const textEntity = canvasEntity.createChild('Text');
const text = textEntity.addComponent(Text);

// 文本内容
text.text = 'Hello Galacean Engine!';
text.fontSize = 32;
text.font = await resourceManager.load<Font>('fonts/arial.ttf');

// 颜色和样式
text.color = new Color(1, 0, 0, 1);
text.fontStyle = FontStyle.Bold;
text.alignment = TextAlignment.MiddleCenter;

// 文本溢出处理
text.overflow = TextOverflow.Overflow;      // 显示超出部分
text.overflow = TextOverflow.Ellipsis;      // 省略号
text.overflow = TextOverflow.Resize;        // 自动调整大小

// 富文本
text.supportRichText = true;
text.text = 'Hello <color=red>World</color>! <b>Bold Text</b>';

// 文本动画
const textAnimation = new TextTypingEffect(text);
textAnimation.startTyping('Hello World!', 50); // 每秒50字符
```

#### Button组件

```typescript
import { Button, ButtonTargetGraphic } from '@galacean/engine-ui';

// 创建Button
const buttonEntity = canvasEntity.createChild('Button');
const button = buttonEntity.addComponent(Button);

// 设置目标图形
const targetGraphic = buttonEntity.addComponent(Image);
targetGraphic.sprite = await resourceManager.load<Sprite>('ui_button_normal.png');
button.targetGraphic = targetGraphic;

// 按钮状态精灵
const transition = button.transition as ButtonTargetGraphic;
transition.normalSprite = await resourceManager.load<Sprite>('ui_button_normal.png');
transition.highlightedSprite = await resourceManager.load<Sprite>('ui_button_hover.png');
transition.pressedSprite = await resourceManager.load<Sprite>('ui_button_pressed.png');
transition.disabledSprite = await resourceManager.load<Sprite>('ui_button_disabled.png');

// 事件监听
button.onClick.add(() => {
  console.log('Button clicked!');
});

// 按钮组
const buttonGroup = new ButtonGroup();
buttonGroup.AddButton(button);
buttonGroup.allowSwitchOff = false; // 至少有一个按钮被选中
```

#### InputField组件

```typescript
import { InputField } from '@galacean/engine-ui';

// 创建输入框
const inputEntity = canvasEntity.createChild('InputField');
const inputField = inputEntity.AddComponent(InputField);

// 设置占位符
inputField.placeholder = 'Enter your name...';
inputField.placeholderColor = new Color(0.5, 0.5, 0.5, 1);

// 输入限制
inputField.contentType = InputField.ContentType.Standard;
inputField.characterLimit = 20;
inputField.inputType = InputField.InputType.Password;

// 事件监听
inputField.onValueChanged.add((text) => {
  console.log('Input changed:', text);
});

inputField.onEndEdit.add((text) => {
  console.log('Edit finished:', text);
});

// 验证
inputField.onValidateInput.add((text, charIndex, addedChar) => {
  // 只允许数字
  if (addedChar && !/^\d$/.test(addedChar)) {
    return '';
  }
  return addedChar;
});
```

#### Toggle组件

```typescript
import { Toggle } from '@galacean/engine-ui';

// 创建Toggle
const toggleEntity = canvasEntity.createChild('Toggle');
const toggle = toggleEntity.AddComponent(Toggle);

// 设置图形
const backgroundGraphic = toggleEntity.AddComponent(Image);
backgroundGraphic.sprite = await resourceManager.load<Sprite>('ui_toggle_bg.png');

const checkmarkEntity = toggleEntity.createChild('Checkmark');
const checkmarkGraphic = checkmarkEntity.AddComponent(Image);
checkmarkGraphic.sprite = await resourceManager.load<Sprite>('ui_checkmark.png');

toggle.targetGraphic = backgroundGraphic;
toggle.graphic = checkmarkGraphic;

// 事件监听
toggle.onValueChanged.AddListener((isOn) => {
  console.log('Toggle state:', isOn);
});

// Toggle组（单选按钮）
const toggleGroup = new ToggleGroup();
toggleGroup.AddToggle(toggle);
toggleGroup.allowSwitchOff = true;
```

#### Slider组件

```typescript
import { Slider } from '@galacean/engine-ui';

// 创建Slider
const sliderEntity = canvasEntity.createChild('Slider');
const slider = sliderEntity.AddComponent(Slider);

// 设置轨道
const fillAreaEntity = sliderEntity.createChild('Fill Area');
const fillEntity = fillAreaEntity.createChild('Fill');
const fillGraphic = fillEntity.AddComponent(Image);
fillGraphic.color = new Color(0, 1, 0, 1); // 绿色填充

// 设置滑块
const handleEntity = sliderEntity.createChild('Handle');
const handleGraphic = handleEntity.AddComponent(Image);
handleGraphic.sprite = await resourceManager.load<Sprite>('ui_slider_handle.png');

// 配置Slider
slider.fillRect = fillGraphic;
slider.handleRect = handleGraphic;
slider.minValue = 0;
slider.maxValue = 100;
slider.value = 50;
slider.wholeNumbers = true; // 只能是整数

// 事件监听
slider.onValueChanged.AddListener((value) => {
  console.log('Slider value:', value);
});
```

#### ScrollView组件

```typescript
import { ScrollView, ScrollRect } from '@galacean/engine-ui';

// 创建ScrollView
const scrollEntity = canvasEntity.createChild('ScrollView');
const scrollView = scrollEntity.AddComponent(ScrollView);

// 设置视图区域
const viewRect = scrollEntity.GetComponent(RectTransform);
viewRect.size = new Vector2(400, 300);

// 设置内容区域
const contentEntity = scrollEntity.createChild('Content');
const contentRect = contentEntity.GetComponent(RectTransform);
contentRect.size = new Vector2(380, 1000);

// 配置滚动
scrollView.viewport = viewRect;
scrollView.content = contentRect;
scrollView.horizontal = true;
scrollView.vertical = true;
scrollView.movementType = ScrollRect.MovementType.Elastic;
scrollView.elasticity = 0.1;

// 滚动条
const horizontalScrollbar = this.CreateScrollbar();
const verticalScrollbar = this.CreateScrollbar();

scrollView.horizontalScrollbar = horizontalScrollbar;
scrollView.verticalScrollbar = verticalScrollbar;

// 事件监听
scrollView.onValueChanged.AddListener((position) => {
  console.log('Scroll position:', position);
});

// 动态添加内容
function AddContentToScrollView(scrollView: ScrollView, itemCount: number): void {
  const content = scrollView.content;

  for (let i = 0; i < itemCount; i++) {
    const itemEntity = content.createChild(`Item${i}`);
    const itemText = itemEntity.AddComponent(Text);
    itemText.text = `Item ${i}`;
    itemText.fontSize = 20;

    const itemRect = itemEntity.GetComponent(RectTransform);
    itemRect.size = new Vector2(380, 50);
    itemRect.anchoredPosition = new Vector2(0, -i * 55);
  }

  // 调整内容大小
  contentRect.size = new Vector2(380, itemCount * 55);
}
```

## 布局系统

### 自动布局

```typescript
import { LayoutGroup, HorizontalLayoutGroup, VerticalLayoutGroup } from '@galacean/engine-ui';

// 水平布局
const horizontalEntity = canvasEntity.createChild('Horizontal Layout');
const horizontalLayout = horizontalEntity.AddComponent(HorizontalLayoutGroup);
horizontalLayout.padding = new Rect(10, 10, 10, 10);
horizontalLayout.spacing = 5;
horizontalLayout.childControlWidth = true;
horizontalLayout.childControlHeight = false;
horizontalLayout.childForceExpandWidth = true;
horizontalLayout.childForceExpandHeight = false;

// 垂直布局
const verticalEntity = canvasEntity.createChild('Vertical Layout');
const verticalLayout = verticalEntity.AddComponent(VerticalLayoutGroup);
verticalLayout.padding = new Rect(10, 10, 10, 10);
verticalLayout.spacing = 10;
verticalLayout.childAlignment = TextAnchor.UpperCenter;

// Grid布局
const gridEntity = canvasEntity.createChild('Grid Layout');
const gridLayout = gridEntity.AddComponent(GridLayoutGroup);
gridLayout.cellSize = new Vector2(100, 100);
gridLayout.spacing = new Vector2(10, 10);
gridLayout.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
gridLayout.constraintCount = 3;
```

### RectTransform详解

```typescript
// RectTransform属性
const rectTransform = entity.GetComponent(RectTransform);

// 锚点设置
rectTransform.anchorMin = new Vector2(0, 0); // 左下角
rectTransform.anchorMax = new Vector2(1, 1); // 右上角

// 位置设置
rectTransform.anchoredPosition = new Vector2(0, 0); // 相对于锚点的偏移

// 大小设置
rectTransform.sizeDelta = new Vector2(100, 100); // 相对于锚点的大小

// Pivot设置
rectTransform.pivot = new Vector2(0.5, 0.5); // 中心点

// 实用工具类
class RectTransformHelper {
  static SetAnchorToTopLeft(rectTransform: RectTransform): void {
    rectTransform.anchorMin = new Vector2(0, 1);
    rectTransform.anchorMax = new Vector2(0, 1);
    rectTransform.pivot = new Vector2(0, 1);
  }

  static SetAnchorToCenter(rectTransform: RectTransform): void {
    rectTransform.anchorMin = new Vector2(0.5, 0.5);
    rectTransform.anchorMax = new Vector2(0.5, 0.5);
    rectTransform.pivot = new Vector2(0.5, 0.5);
  }

  static SetStretch(rectTransform: RectTransform): void {
    rectTransform.anchorMin = new Vector2(0, 0);
    rectTransform.anchorMax = new Vector2(1, 1);
    rectTransform.offsetMin = Vector2.zero;
    rectTransform.offsetMax = Vector2.zero;
  }

  static SetFullScreen(rectTransform: RectTransform): void {
    this.SetStretch(rectTransform);
    rectTransform.sizeDelta = Vector2.zero;
  }
}
```

### 自适应布局

```typescript
class ResponsiveLayout {
  private breakpoints: Breakpoint[] = [
    { width: 480, name: 'mobile' },
    { width: 768, name: 'tablet' },
    { width: 1024, name: 'desktop' }
  ];

  private currentBreakpoint: string = 'desktop';
  private layoutConfigs: Map<string, LayoutConfig> = new Map();

  constructor() {
    this.setupLayoutConfigs();
    window.addEventListener('resize', () => this.onResize());
  }

  private setupLayoutConfigs(): void {
    // 移动端布局
    this.layoutConfigs.set('mobile', {
      buttonSize: new Vector2(80, 40),
      fontSize: 16,
      spacing: 5,
      padding: new Rect(10, 10, 10, 10)
    });

    // 平板布局
    this.layoutConfigs.set('tablet', {
      buttonSize: new Vector2(100, 50),
      fontSize: 20,
      spacing: 10,
      padding: new Rect(20, 20, 20, 20)
    });

    // 桌面布局
    this.layoutConfigs.set('desktop', {
      buttonSize: new Vector2(120, 60),
      fontSize: 24,
      spacing: 15,
      padding: new Rect(30, 30, 30, 30)
    });
  }

  private onResize(): void {
    const width = window.innerWidth;
    let newBreakpoint = 'mobile';

    for (let i = this.breakpoints.length - 1; i >= 0; i--) {
      if (width >= this.breakpoints[i].width) {
        newBreakpoint = this.breakpoints[i].name;
        break;
      }
    }

    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint;
      this.applyLayout();
    }
  }

  private applyLayout(): void {
    const config = this.layoutConfigs.get(this.currentBreakpoint);
    if (!config) return;

    // 应用布局配置到所有UI元素
    const buttons = Object.values(uiElements).filter(el => el.isButton);
    buttons.forEach(button => {
      const rectTransform = button.GetComponent(RectTransform);
      rectTransform.sizeDelta = config.buttonSize;

      const text = button.GetComponent(Text);
      if (text) {
        text.fontSize = config.fontSize;
      }
    });

    // 更新布局组件
    const layoutGroups = Object.values(uiElements).filter(el => el.hasLayout);
    layoutGroups.forEach(element => {
      const layout = element.GetComponent(LayoutGroup);
      if (layout) {
        layout.padding = config.padding;
        layout.spacing = config.spacing;
      }
    });
  }
}
```

## 事件系统

### Pointer事件

```typescript
// Pointer事件类型
enum PointerEventType {
  PointerDown = 'pointerdown',
  PointerUp = 'pointerup',
  PointerClick = 'pointerclick',
  PointerEnter = 'pointerenter',
  PointerExit = 'pointerexit',
  PointerMove = 'pointermove'
}

// 事件监听
class UIEventHandler {
  constructor(private target: Graphic) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 点击事件
    this.target.onPointerClick.add((event: PointerEventData) => {
      console.log('Clicked at:', event.position);
    });

    // 悬停事件
    this.target.onPointerEnter.add((event: PointerEventData) => {
      this.target.color = new Color(1, 1, 0, 1); // 黄色高亮
    });

    this.target.onPointerExit.add((event: PointerEventData) => {
      this.target.color = Color.white; // 恢复原色
    });

    // 拖拽事件
    this.target.onPointerDrag.add((event: PointerEventData) => {
      this.handleDrag(event);
    });
  }

  private handleDrag(event: PointerEventData): void {
    const rectTransform = this.target.GetComponent(RectTransform);
    rectTransform.anchoredPosition = event.position;
  }
}
```

### 自定义事件

```typescript
class CustomEventSystem {
  private eventDispatcher: EventDispatcher = new EventDispatcher();

  // 注册事件
  registerEvent(eventName: string): void {
    this.eventDispatcher.registerEvent(eventName);
  }

  // 添加监听器
  addEventListener(eventName: string, callback: Function): void {
    this.eventDispatcher.on(eventName, callback);
  }

  // 移除监听器
  removeEventListener(eventName: string, callback: Function): void {
    this.eventDispatcher.off(eventName, callback);
  }

  // 触发事件
  dispatchEvent(eventName: string, data?: any): void {
    this.eventDispatcher.dispatch(eventName, data);
  }
}

// 使用示例
const eventSystem = new CustomEventSystem();

// 注册自定义事件
eventSystem.registerEvent('PlayerHealthChanged');
eventSystem.registerEvent('InventoryUpdated');

// 监听事件
eventSystem.addEventListener('PlayerHealthChanged', (health: number) => {
  updateHealthBar(health);
});

// 触发事件
eventSystem.dispatchEvent('PlayerHealthChanged', 80);
```

### 手势识别

```typescript
class GestureRecognizer {
  private touches: Map<number, Touch> = new Map();
  private tapThreshold: number = 10;
  private doubleTapTime: number = 300;
  private lastTapTime: number = 0;
  private tapCount: number = 0;

  onTouchStart(event: TouchEvent): void {
    event.touches.forEach(touch => {
      this.touches.set(touch.identifier, touch);
    });
  }

  onTouchEnd(event: TouchEvent): void {
    event.changedTouches.forEach(touch => {
      const startTouch = this.touches.get(touch.identifier);
      if (startTouch) {
        const distance = this.calculateDistance(startTouch, touch);

        if (distance < this.tapThreshold) {
          this.handleTap(touch);
        }

        this.touches.delete(touch.identifier);
      }
    });

    // 检测多指手势
    if (this.touches.size === 2) {
      this.handleMultiTouch();
    }
  }

  private handleTap(touch: Touch): void {
    const currentTime = performance.now();

    if (currentTime - this.lastTapTime < this.doubleTapTime) {
      this.tapCount++;
    } else {
      this.tapCount = 1;
    }

    this.lastTapTime = currentTime;

    if (this.tapCount === 2) {
      this.onDoubleTap?.(touch);
    } else {
      setTimeout(() => {
        if (this.tapCount === 1) {
          this.onSingleTap?.(touch);
        }
        this.tapCount = 0;
      }, this.doubleTapTime);
    }
  }

  private handleMultiTouch(): void {
    const touches = Array.from(this.touches.values());
    if (touches.length === 2) {
      const distance = this.calculateDistance(touches[0], touches[1]);
      this.onPinch?.(distance);
    }
  }

  private calculateDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 事件回调
  onSingleTap?: (touch: Touch) => void;
  onDoubleTap?: (touch: Touch) => void;
  onPinch?: (distance: number) => void;
}
```

## UI动画

### 基础动画

```typescript
import { Animation, AnimationClip, AnimationCurve } from '@galacean/engine';

class UIAnimator {
  private animation: Animation;
  private clips: Map<string, AnimationClip> = new Map();

  constructor(private target: Entity) {
    this.animation = target.AddComponent(Animation);
  }

  // 淡入淡出
  async fade(from: number, to: number, duration: number = 0.5): Promise<void> {
    const graphic = this.target.GetComponent(Graphic);
    if (!graphic) return;

    const clip = this.createFadeClip(graphic, from, to, duration);
    return this.playClip('fade', clip);
  }

  private createFadeClip(graphic: Graphic, from: number, to: number, duration: number): AnimationClip {
    const clip = new AnimationClip('Fade');
    clip.duration = duration;

    const curve = new AnimationCurve();
    curve.keys = [
      { time: 0, value: from },
      { time: duration, value: to }
    ];

    // 创建颜色动画曲线
    const colorCurve = new AnimationCurve();
    colorCurve.keys = [
      { time: 0, value: from },
      { time: duration, value: to }
    ];

    clip.addCurveBinding('material.color.a', AnimationCurveType.Float, colorCurve);
    return clip;
  }

  // 缩放动画
  async scale(from: Vector2, to: Vector2, duration: number = 0.3): Promise<void> {
    const rectTransform = this.target.GetComponent(RectTransform);
    if (!rectTransform) return;

    const clip = this.createScaleClip(rectTransform, from, to, duration);
    return this.playClip('scale', clip);
  }

  private createScaleClip(rectTransform: RectTransform, from: Vector2, to: Vector2, duration: number): AnimationClip {
    const clip = new AnimationClip('Scale');
    clip.duration = duration;

    // X轴缩放
    const scaleXCurve = new AnimationCurve();
    scaleXCurve.keys = [
      { time: 0, value: from.x },
      { time: duration, value: to.x }
    ];

    // Y轴缩放
    const scaleYCurve = new AnimationCurve();
    scaleYCurve.keys = [
      { time: 0, value: from.y },
      { time: duration, value: to.y }
    ];

    clip.addCurveBinding('sizeDelta.x', AnimationCurveType.Float, scaleXCurve);
    clip.addCurveBinding('sizeDelta.y', AnimationCurveType.Float, scaleYCurve);

    return clip;
  }

  // 位置动画
  async moveTo(targetPosition: Vector2, duration: number = 0.5): Promise<void> {
    const rectTransform = this.target.GetComponent(RectTransform);
    if (!rectTransform) return;

    const startPosition = rectTransform.anchoredPosition;
    const clip = this.createMoveClip(rectTransform, startPosition, targetPosition, duration);

    return this.playClip('move', clip);
  }

  private createMoveClip(
    rectTransform: RectTransform,
    from: Vector2,
    to: Vector2,
    duration: number
  ): AnimationClip {
    const clip = new AnimationClip('Move');
    clip.duration = duration;

    // X轴位置
    const xCurve = new AnimationCurve();
    xCurve.keys = [
      { time: 0, value: from.x },
      { time: duration, value: to.x }
    ];

    // Y轴位置
    const yCurve = new AnimationCurve();
    yCurve.keys = [
      { time: 0, value: from.y },
      { time: duration, value: to.y }
    ];

    clip.addCurveBinding('anchoredPosition.x', AnimationCurveType.Float, xCurve);
    clip.addCurveBinding('anchoredPosition.y', AnimationCurveType.Float, yCurve);

    return clip;
  }

  // 弹性动画
  async bounce(duration: number = 0.6): Promise<void> {
    const rectTransform = this.target.GetComponent(RectTransform);
    if (!rectTransform) return;

    const clip = new AnimationClip('Bounce');
    clip.duration = duration;

    // 创建弹性曲线
    const scaleCurve = new AnimationCurve();
    scaleCurve.keys = [
      { time: 0, value: 1, inTangent: 0, outTangent: 0 },
      { time: 0.2, value: 1.2, inTangent: 0, outTangent: 0 },
      { time: 0.4, value: 0.9, inTangent: 0, outTangent: 0 },
      { time: 0.6, value: 1.05, inTangent: 0, outTangent: 0 },
      { time: 0.8, value: 0.98, inTangent: 0, outTangent: 0 },
      { time: 1, value: 1, inTangent: 0, outTangent: 0 }
    ];

    clip.addCurveBinding('localScale.x', AnimationCurveType.Float, scaleCurve);
    clip.addCurveBinding('localScale.y', AnimationCurveType.Float, scaleCurve.clone());

    return this.playClip('bounce', clip);
  }

  private async playClip(name: string, clip: AnimationClip): Promise<void> {
    this.clips.set(name, clip);
    this.animation.addClip(clip);

    return new Promise<void>((resolve) => {
      const onComplete = () => {
        this.animation.removeClip(clip);
        resolve();
      };

      this.animation.play(name);
      setTimeout(onComplete, clip.duration * 1000);
    });
  }
}
```

### 序列动画

```typescript
class UIAnimationSequence {
  private animations: AnimationStep[] = [];
  private currentIndex: number = 0;
  private isPlaying: boolean = false;

  // 添加动画步骤
  addAnimation(animation: Promise<void>): UIAnimationSequence {
    this.animations.push({ animation, type: 'parallel' });
    return this;
  }

  // 添加延迟
  addDelay(duration: number): UIAnimationSequence {
    this.animations.push({
      animation: new Promise(resolve => setTimeout(resolve, duration * 1000)),
      type: 'delay'
    });
    return this;
  }

  // 并行动画
  addParallel(...animations: Promise<void>[]): UIAnimationSequence {
    this.animations.push({
      animation: Promise.all(animations),
      type: 'parallel'
    });
    return this;
  }

  // 播放序列
  async play(): Promise<void> {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.currentIndex = 0;

    for (; this.currentIndex < this.animations.length; this.currentIndex++) {
      const step = this.animations[this.currentIndex];
      await step.animation;
    }

    this.isPlaying = false;
  }

  // 停止播放
  stop(): void {
    this.isPlaying = false;
  }

  // 跳转到特定步骤
  async goToStep(index: number): Promise<void> {
    if (index < 0 || index >= this.animations.length) return;

    this.currentIndex = index;
    const step = this.animations[this.currentIndex];
    await step.animation;
  }
}

interface AnimationStep {
  animation: Promise<void>;
  type: 'animation' | 'delay' | 'parallel';
}

// 使用示例
const sequence = new UIAnimationSequence();

sequence
  .addAnimation(button1Animator.fade(0, 1, 0.3))
  .addDelay(0.2)
  .addParallel(
    button2Animator.moveTo(new Vector2(100, 0), 0.4),
    button3Animator.scale(new Vector2(1.2, 1.2), 0.4)
  )
  .addAnimation(textAnimator.bounce(0.5))
  .play();
```

### UI过渡效果

```typescript
class UITransition {
  private duration: number = 0.5;
  private easing: EasingFunction = Easing.EaseInOut;

  // 页面切换效果
  async switchPages(fromPage: Entity, toPage: Entity, type: TransitionType = TransitionType.Fade): Promise<void> {
    switch (type) {
      case TransitionType.Fade:
        await this.fadeTransition(fromPage, toPage);
        break;
      case TransitionType.Slide:
        await this.slideTransition(fromPage, toPage);
        break;
      case TransitionType.Scale:
        await this.scaleTransition(fromPage, toPage);
        break;
    }
  }

  private async fadeTransition(fromPage: Entity, toPage: Entity): Promise<void> {
    const fromAnimator = new UIAnimator(fromPage);
    const toAnimator = new UIAnimator(toPage);

    toPage.SetActive(true);
    toPage.GetComponent(Graphic).color.a = 0;

    await Promise.all([
      fromAnimator.fade(1, 0, this.duration),
      toAnimator.fade(0, 1, this.duration)
    ]);

    fromPage.SetActive(false);
  }

  private async slideTransition(fromPage: Entity, toPage: Entity): Promise<void> {
    const fromAnimator = new UIAnimator(fromPage);
    const toAnimator = new UIAnimator(toPage);

    const canvasRect = canvas.GetComponent(RectTransform);
    const slideDistance = canvasRect.sizeDelta.x;

    toPage.SetActive(true);
    const toRect = toPage.GetComponent(RectTransform);
    toRect.anchoredPosition = new Vector2(slideDistance, 0);

    await Promise.all([
      fromAnimator.moveTo(new Vector2(-slideDistance, 0), this.duration),
      toAnimator.moveTo(Vector2.zero, this.duration)
    ]);

    fromPage.SetActive(false);
  }

  private async scaleTransition(fromPage: Entity, toPage: Entity): Promise<void> {
    const fromAnimator = new UIAnimator(fromPage);
    const toAnimator = new UIAnimator(toPage);

    toPage.SetActive(true);
    toAnimator.target.localScale = new Vector3(0, 0, 1);

    await Promise.all([
      fromAnimator.scale(Vector2.one, Vector2.zero, this.duration),
      toAnimator.scale(Vector2.zero, Vector2.one, this.duration)
    ]);

    fromPage.SetActive(false);
  }
}

enum TransitionType {
  Fade,
  Slide,
  Scale,
  Flip
}
```

## UI优化

### UI批处理

```typescript
class UIBatcher {
  private batchedUIElements: Graphic[] = [];
  private batchMaterial: Material;

  constructor() {
    this.batchMaterial = new Material(engine, Shader.find('UIShader'));
  }

  addUIElement(element: Graphic): void {
    // 检查是否可以批处理
    if (this.canBatch(element)) {
      this.batchedUIElements.push(element);
    } else {
      // 立即绘制
      this.renderBatch();
      this.batchedUIElements.push(element);
    }
  }

  private canBatch(element: Graphic): boolean {
    if (this.batchedUIElements.length === 0) return true;

    const lastElement = this.batchedUIElements[this.batchedUIElements.length - 1];

    // 检查材质是否相同
    if (!this.isMaterialCompatible(lastElement, element)) {
      return false;
    }

    // 检查纹理是否相同
    if (!this.isTextureCompatible(lastElement, element)) {
      return false;
    }

    return true;
  }

  private isMaterialCompatible(element1: Graphic, element2: Graphic): boolean {
    return element1.material === element2.material ||
           element1.material.shader === element2.material.shader;
  }

  private isTextureCompatible(element1: Graphic, element2: Graphic): boolean {
    const texture1 = element1.material.getTexture('mainTexture');
    const texture2 = element2.material.getTexture('mainTexture');
    return texture1 === texture2;
  }

  renderBatch(): void {
    if (this.batchedUIElements.length === 0) return;

    // 合并网格数据
    const batchedMesh = this.createBatchedMesh();

    // 使用批处理材质渲染
    const renderer = engine.renderer;
    renderer.drawMesh(batchedMesh, 0, this.batchMaterial);

    // 清空批处理列表
    this.batchedUIElements.length = 0;
  }

  private createBatchedMesh(): Mesh {
    const vertices: number[] = [];
    const indices: number[] = [];
    let indexOffset = 0;

    this.batchedUIElements.forEach(element => {
      const elementMesh = this.getElementMesh(element);

      // 添加顶点
      vertices.push(...elementMesh.vertices);

      // 添加索引（调整偏移）
      const adjustedIndices = elementMesh.indices.map(i => i + indexOffset);
      indices.push(...adjustedIndices);

      indexOffset += elementMesh.vertexCount / 4; // 每个矩形4个顶点
    });

    const batchedMesh = new Mesh(engine);
    batchedMesh.setVertices(new Float32Array(vertices));
    batchedMesh.setIndices(new Uint16Array(indices));

    return batchedMesh;
  }

  private getElementMesh(element: Graphic): MeshData {
    const rectTransform = element.GetComponent(RectTransform);
    const size = rectTransform.sizeDelta;
    const position = rectTransform.anchoredPosition;

    // 简化的矩形网格生成
    const halfWidth = size.x / 2;
    const halfHeight = size.y / 2;

    const vertices = [
      position.x - halfWidth, position.y - halfHeight, 0, 0, 1,  // 左下
      position.x + halfWidth, position.y - halfHeight, 1, 0, 1,  // 右下
      position.x + halfWidth, position.y + halfHeight, 1, 1, 1,  // 右上
      position.x - halfWidth, position.y + halfHeight, 0, 1, 1   // 左上
    ];

    const indices = [0, 1, 2, 2, 3, 0];

    return { vertices, indices, vertexCount: vertices.length / 5, indexCount: indices.length };
  }
}
```

### Canvas分割

```typescript
class CanvasSplitter {
  private static MAX_VERTICES_PER_CANVAS = 65535; // 16位索引限制
  private canvasPool: UICanvas[] = [];

  splitCanvas(originalCanvas: UICanvas): UICanvas[] {
    const uiElements = this.getAllUIElements(originalCanvas);
    const totalVertexCount = this.calculateTotalVertices(uiElements);

    if (totalVertexCount <= CanvasSplitter.MAX_VERTICES_PER_CANVAS) {
      return [originalCanvas];
    }

    // 计算需要分割的Canvas数量
    const canvasCount = Math.ceil(totalVertexCount / CanvasSplitter.MAX_VERTICES_PER_CANVAS);
    const canvases: UICanvas[] = [];

    // 创建新的Canvas
    for (let i = 0; i < canvasCount; i++) {
      const newCanvas = this.createCanvas(i);
      canvases.push(newCanvas);
    }

    // 分配UI元素到各个Canvas
    this.distributeElements(uiElements, canvases);

    return canvases;
  }

  private createCanvas(index: number): UICanvas {
    const canvasEntity = scene.createRootEntity(`Split Canvas ${index}`);
    const canvas = canvasEntity.AddComponent(UICanvas);

    canvas.sortingOrder = index;
    canvas.renderMode = CanvasRenderMode.ScreenSpaceOverlay;

    return canvas;
  }

  private distributeElements(elements: UIElement[], canvases: UICanvas[]): void {
    let currentCanvas = 0;
    let currentVertexCount = 0;

    elements.forEach(element => {
      const elementVertexCount = this.getElementVertexCount(element);

      // 如果当前Canvas放不下，切换到下一个
      if (currentVertexCount + elementVertexCount > CanvasSplitter.MAX_VERTICES_PER_CANVAS) {
        currentCanvas++;
        currentVertexCount = 0;
      }

      // 将元素移动到目标Canvas
      const targetCanvas = canvases[currentCanvas];
      element.SetParent(targetCanvas.entity);

      currentVertexCount += elementVertexCount;
    });
  }

  private getAllUIElements(canvas: UICanvas): UIElement[] {
    const elements: UIElement[] = [];

    // 递归遍历所有UI元素
    const traverse = (entity: Entity) => {
      const graphic = entity.GetComponent(Graphic);
      if (graphic) {
        elements.push(graphic);
      }

      entity.children.forEach(child => traverse(child));
    };

    traverse(canvas.entity);
    return elements;
  }

  private calculateTotalVertices(elements: UIElement[]): number {
    return elements.reduce((total, element) => {
      return total + this.getElementVertexCount(element);
    }, 0);
  }

  private getElementVertexCount(element: UIElement): number {
    // 根据元素类型计算顶点数
    if (element instanceof Image) {
      return 4; // 四边形
    } else if (element instanceof Text) {
      // 文本的顶点数取决于字符数量
      return element.characterCount * 4;
    }
    return 4; // 默认值
  }
}
```

### UI对象池

```typescript
class UIObjectPool<T extends Entity> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(createFn: () => T, resetFn: (obj: T) => void) {
    this.createFn = createFn;
    this.resetFn = resetFn;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      obj.SetActive(true);
      return obj;
    }

    return this.createFn();
  }

  release(obj: T): void {
    this.resetFn(obj);
    obj.SetActive(false);
    this.pool.push(obj);
  }

  preWarm(count: number): void {
    for (let i = 0; i < count; i++) {
      const obj = this.createFn();
      obj.SetActive(false);
      this.pool.push(obj);
    }
  }
}

// UI对象池管理器
class UIPoolManager {
  private pools: Map<string, UIObjectPool<any>> = new Map();

  registerPool<T extends Entity>(
    name: string,
    createFn: () => T,
    resetFn: (obj: T) => void
  ): void {
    this.pools.set(name, new UIObjectPool(createFn, resetFn));
  }

  acquire<T extends Entity>(poolName: string): T {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool not found: ${poolName}`);
    }
    return pool.acquire();
  }

  release<T extends Entity>(poolName: string, obj: T): void {
    const pool = this.pools.get(poolName);
    if (pool) {
      pool.release(obj);
    }
  }
}

// 使用示例
// 注册对象池
const poolManager = new UIPoolManager();

poolManager.registerPool(
  'button',
  () => {
    const button = canvasEntity.createChild('Button');
    button.AddComponent(Button);
    const image = button.AddComponent(Image);
    image.sprite = buttonSprite;
    return button;
  },
  (button) => {
    button.GetComponent(Button).interactable = true;
    button.GetComponent(RectTransform).anchoredPosition = Vector2.zero;
  }
);

// 使用对象池
const button = poolManager.acquire<Button>('button');
// 使用按钮...
poolManager.release('button', button);
```

## 最佳实践

### 1. UI架构设计

```typescript
// UI管理器
class UIManager {
  private panels: Map<string, UIPanel> = new Map();
  private canvas: UICanvas;

  constructor(canvas: UICanvas) {
    this.canvas = canvas;
    this.setupEventSystem();
  }

  registerPanel(name: string, panel: UIPanel): void {
    this.panels.set(name, panel);
    panel.Initialize(this.canvas);
  }

  showPanel(name: string): void {
    const panel = this.panels.get(name);
    if (panel) {
      panel.Show();
    }
  }

  hidePanel(name: string): void {
    const panel = this.panels.get(name);
    if (panel) {
      panel.Hide();
    }
  }

  private setupEventSystem(): void {
    const eventSystem = scene.createRootEntity('EventSystem');
    eventSystem.AddComponent(EventSystem);
  }
}

// UI面板基类
abstract class UIPanel {
  protected root: Entity;
  protected canvas: UICanvas;

  abstract Initialize(canvas: UICanvas): void;
  abstract Show(): void;
  abstract Hide(): void;

  protected createUIElement<T extends Component>(
    parent: Entity,
    name: string,
    componentType: new () => T
  ): T {
    const entity = parent.createChild(name);
    return entity.AddComponent(componentType);
  }
}
```

### 2. 性能优化建议

- **避免频繁的Canvas重建**: 使用Canvas分割功能
- **批处理相同材质的UI元素**: 减少Draw Call
- **使用对象池**: 避免频繁创建和销毁UI对象
- **优化文本渲染**: 使用动态字体池
- **减少透明度变化**: 使用Mask代替Alpha
- **合理使用Layout组件**: 避免每帧计算布局

### 3. 响应式设计

```typescript
// 响应式UI系统
class ResponsiveUISystem {
  private breakpoints: Breakpoint[] = [
    { width: 480, preset: 'mobile' },
    { width: 768, preset: 'tablet' },
    { width: 1024, preset: 'desktop' }
  ];

  private presets: Map<string, UIPreset> = new Map();

  constructor() {
    this.setupPresets();
    this.setupResizeListener();
  }

  private setupPresets(): void {
    // 移动端预设
    this.presets.set('mobile', {
      fontSize: { small: 14, medium: 16, large: 18 },
      spacing: { small: 5, medium: 10, large: 15 },
      padding: { small: 8, medium: 12, large: 16 }
    });

    // 平板预设
    this.presets.set('tablet', {
      fontSize: { small: 16, medium: 18, large: 20 },
      spacing: { small: 8, medium: 12, large: 16 },
      padding: { small: 12, medium: 16, large: 20 }
    });

    // 桌面预设
    this.presets.set('desktop', {
      fontSize: { small: 18, medium: 20, large: 24 },
      spacing: { small: 10, medium: 15, large: 20 },
      padding: { small: 16, medium: 20, large: 24 }
    });
  }

  private setupResizeListener(): void {
    window.addEventListener('resize', () => {
      this.applyResponsiveLayout();
    });
  }

  private applyResponsiveLayout(): void {
    const currentPreset = this.getCurrentPreset();
    this.applyPreset(currentPreset);
  }

  private getCurrentPreset(): string {
    const width = window.innerWidth;
    let preset = 'mobile';

    for (let i = this.breakpoints.length - 1; i >= 0; i--) {
      if (width >= this.breakpoints[i].width) {
        preset = this.breakpoints[i].preset;
        break;
      }
    }

    return preset;
  }

  private applyPreset(presetName: string): void {
    const preset = this.presets.get(presetName);
    if (!preset) return;

    // 应用预设到所有UI元素
    const textElements = Object.values(uiElements).filter(el => el.hasText);
    textElements.forEach(element => {
      const text = element.GetComponent(Text);
      if (text) {
        text.fontSize = preset.fontSize.medium;
      }
    });
  }
}
```

通过遵循这些UI开发指南，你可以创建出响应迅速、视觉精美、易于维护的用户界面。