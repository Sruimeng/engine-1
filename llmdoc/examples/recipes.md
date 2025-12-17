---
id: "examples-recipes"
type: "reference"
title: "Galacean Engine 实用代码片段集合"
description: "收集了 Galacean Engine 开发中的实用代码片段和解决方案，包括场景管理、动画、UI、输入处理和数学工具等"
tags: ["examples", "code-snippets", "recipes", "tools", "utilities"]
context_dependency: ["common-patterns", "coding-conventions"]
related_ids: ["common-patterns", "performance-patterns", "troubleshooting"]
---

本文档收集了 Galacean Engine 开发中的实用代码片段和解决方案，可以直接在项目中使用。

## 1. 场景管理

### 1.1 场景切换管理器

```typescript
class SceneManager {
  private _engine: Engine;
  private _currentScene: Scene | null = null;
  private _loadingScene: Scene | null = null;
  private _sceneCache: Map<string, Scene> = new Map();

  constructor(engine: Engine) {
    this._engine = engine;
    this._loadingScene = this.createLoadingScene();
  }

  async loadScene(sceneName: string, options: SceneLoadOptions = {}): Promise<void> {
    // 显示加载场景
    if (options.showLoading !== false) {
      this._engine.runScene(this._loadingScene);
    }

    try {
      // 检查缓存
      let scene = this._sceneCache.get(sceneName);
      if (!scene || options.forceReload) {
        scene = await this._engine.resourceManager.load<Scene>(`scenes/${sceneName}.json`);
        this._sceneCache.set(sceneName, scene);
      }

      // 预加载场景资源
      if (options.preloadAssets) {
        await this.preloadSceneAssets(scene);
      }

      // 切换场景
      this._currentScene = scene;
      this._engine.runScene(scene);

      // 触发场景加载完成事件
      this._engine.emit("sceneLoaded", sceneName, scene);

      // 清理旧场景（如果不缓存）
      if (!options.cacheScene) {
        this.cleanupOldScenes();
      }
    } catch (error) {
      console.error(`Failed to load scene: ${sceneName}`, error);
      this._engine.emit("sceneLoadError", sceneName, error);
      throw error;
    }
  }

  private async preloadSceneAssets(scene: Scene): Promise<void> {
    const assets = this.collectSceneAssets(scene);
    const loadPromises = assets.map(asset =>
      this._engine.resourceManager.load(asset)
    );
    await Promise.all(loadPromises);
  }

  private collectSceneAssets(scene: Scene): string[] {
    const assets: Set<string> = new Set();

    scene.findComponents(MeshRenderer).forEach(renderer => {
      const material = renderer.material;
      if (material) {
        material.shaderData.getProperties().forEach(prop => {
          if (prop.type === "Texture2D" && prop.value) {
            assets.add((prop.value as Texture2D).name);
          }
        });
      }
    });

    return Array.from(assets);
  }

  private createLoadingScene(): Scene {
    const scene = new Scene(this._engine, "Loading");

    // 创建简单的加载界面
    const cameraEntity = new Entity(scene);
    const camera = cameraEntity.addComponent(Camera);
    camera.isOrthographic = true;
    camera.orthographicSize = 1;

    // 可以添加加载动画等
    return scene;
  }
}
```

### 1.2 场景对象查找器

```typescript
class SceneObjectFinder {
  private _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  // 通过路径查找对象
  findByPath(path: string): Entity | null {
    const parts = path.split('/');
    let current = this._scene.rootEntities;

    for (const part of parts) {
      const found = current.find(entity => entity.name === part);
      if (!found) return null;

      if (part === parts[parts.length - 1]) {
        return found;
      }

      current = found.children;
    }

    return null;
  }

  // 通过组件类型查找
  findByComponent<T extends Component>(
    componentType: ComponentConstructor<T>
  ): Entity[] {
    return this._scene.findComponents(componentType).map(comp => comp.entity);
  }

  // 通过标签查找
  findByTag(tag: string): Entity[] {
    return this._scene.rootEntities.filter(entity =>
      this.hasTag(entity, tag)
    );
  }

  private hasTag(entity: Entity, tag: string): boolean {
    // 假设实体有tags属性
    return (entity as any).tags?.includes(tag) || false;
  }
}

// 使用示例
const finder = new SceneObjectFinder(scene);
const player = finder.findByPath("Environment/Characters/Player");
const cameras = finder.findByComponent(Camera);
const enemies = finder.findByTag("Enemy");
```

## 2. 动画系统

### 2.1 动画状态机

```typescript
enum AnimationState {
  Idle = "Idle",
  Walk = "Walk",
  Run = "Run",
  Jump = "Jump",
  Attack = "Attack"
}

enum AnimationParameter {
  Speed = "Speed",
  IsGrounded = "IsGrounded",
  IsAttacking = "IsAttacking"
}

class AnimationStateMachine {
  private _animator: Animator;
  private _currentState: AnimationState = AnimationState.Idle;
  private _parameters: Map<AnimationParameter, number | boolean> = new Map();
  private _stateTransitions: Map<AnimationState, AnimationState[]> = new Map();

  constructor(animator: Animator) {
    this._animator = animator;
    this.setupTransitions();
  }

  private setupTransitions(): void {
    this._stateTransitions.set(AnimationState.Idle, [
      AnimationState.Walk,
      AnimationState.Jump,
      AnimationState.Attack
    ]);

    this._stateTransitions.set(AnimationState.Walk, [
      AnimationState.Idle,
      AnimationState.Run,
      AnimationState.Jump
    ]);

    // ... 设置其他状态转换
  }

  setParameter(name: AnimationParameter, value: number | boolean): void {
    this._parameters.set(name, value);
    this.updateState();
  }

  private updateState(): void {
    let newState = this._currentState;

    const speed = this._parameters.get(AnimationParameter.Speed) as number || 0;
    const isGrounded = this._parameters.get(AnimationParameter.IsGrounded) as boolean || true;
    const isAttacking = this._parameters.get(AnimationParameter.IsAttacking) as boolean || false;

    // 状态转换逻辑
    if (isAttacking) {
      newState = AnimationState.Attack;
    } else if (!isGrounded) {
      newState = AnimationState.Jump;
    } else if (speed > 5) {
      newState = AnimationState.Run;
    } else if (speed > 0.1) {
      newState = AnimationState.Walk;
    } else {
      newState = AnimationState.Idle;
    }

    // 执行状态转换
    if (newState !== this._currentState && this.canTransitionTo(newState)) {
      this.transitionTo(newState);
    }
  }

  private canTransitionTo(newState: AnimationState): boolean {
    const allowedTransitions = this._stateTransitions.get(this._currentState);
    return allowedTransitions?.includes(newState) || false;
  }

  private transitionTo(newState: AnimationState): void {
    // 淡出当前动画
    if (this._currentState) {
      const currentClip = this._animator.findAnimatorState(this._currentState);
      if (currentClip) {
        currentClip.exit();
      }
    }

    // 淡入新动画
    this._currentState = newState;
    const newClip = this._animator.findAnimatorState(newState);
    if (newClip) {
      newClip.enter();
      this._animator.crossFade(newState, 0.2); // 0.2秒过渡
    }
  }
}

// 使用示例
class PlayerController extends Script {
  private _animator: Animator;
  private _stateMachine: AnimationStateMachine;

  onStart(): void {
    this._animator = this.entity.getComponent(Animator);
    this._stateMachine = new AnimationStateMachine(this._animator);
  }

  onUpdate(): void {
    const speed = this.calculateSpeed();
    const isGrounded = this.checkGrounded();
    const isAttacking = this.engine.input.getKeyDown("Space");

    this._stateMachine.setParameter(AnimationParameter.Speed, speed);
    this._stateMachine.setParameter(AnimationParameter.IsGrounded, isGrounded);
    this._stateMachine.setParameter(AnimationParameter.IsAttacking, isAttacking);
  }
}
```

### 2.2 程序化动画

```typescript
class ProceduralAnimator extends Script {
  @serializable
  amplitude: number = 0.1;

  @serializable
  frequency: number = 2;

  @serializable
  useSineWave: boolean = true;

  private _originalPosition: Vector3 = new Vector3();
  private _time: number = 0;

  onStart(): void {
    this._originalPosition.copyFrom(this.entity.transform.position);
  }

  onUpdate(): void {
    this._time += this.engine.time.deltaTime;

    if (this.useSineWave) {
      this.sineWaveAnimation();
    } else {
      this.perlinNoiseAnimation();
    }
  }

  private sineWaveAnimation(): void {
    const offset = Math.sin(this._time * this.frequency * Math.PI * 2) * this.amplitude;
    this.entity.transform.position.y = this._originalPosition.y + offset;
  }

  private perlinNoiseAnimation(): void {
    // 简化的Perlin噪声实现
    const noise = this.simplexNoise(this._time * this.frequency);
    const offset = noise * this.amplitude;
    this.entity.transform.position.y = this._originalPosition.y + offset;
  }

  private simplexNoise(x: number): number {
    // 简化的噪声函数，实际项目中可以使用库
    return Math.sin(x) * 0.5 + Math.sin(x * 2.1) * 0.25;
  }
}

// 骨骼动画混合
class BoneMixer extends Script {
  @serializable
  mixRatio: number = 0.5;

  @serializable
  sourceAnimator1: Entity;

  @serializable
  sourceAnimator2: Entity;

  private _targetAnimator: Animator;
  private _sourceAnim1: Animator;
  private _sourceAnim2: Animator;

  onStart(): void {
    this._targetAnimator = this.entity.getComponent(Animator);
    this._sourceAnim1 = this.sourceAnimator1.getComponent(Animator);
    this._sourceAnim2 = this.sourceAnimator2.getComponent(Animator);
  }

  onUpdate(): void {
    // 混合两个动画的骨骼变换
    this.mixBones();
  }

  private mixBones(): void {
    const targetPose = this._targetAnimator.currentPose;
    const pose1 = this._sourceAnim1.currentPose;
    const pose2 = this._sourceAnim2.currentPose;

    // 对每个骨骼进行混合
    for (let i = 0; i < targetPose.bones.length; i++) {
      const targetBone = targetPose.bones[i];
      const bone1 = pose1.bones[i];
      const bone2 = pose2.bones[i];

      // 混合位置
      Vector3.lerp(bone1.position, bone2.position, this.mixRatio, targetBone.position);

      // 混合旋转
      Quaternion.slerp(bone1.rotation, bone2.rotation, this.mixRatio, targetBone.rotation);

      // 混合缩放
      Vector3.lerp(bone1.scale, bone2.scale, this.mixRatio, targetBone.scale);
    }
  }
}
```

## 3. UI系统

### 3.1 健康条UI

```typescript
class HealthBar extends Script {
  @serializable
  maxValue: number = 100;

  @serializable
  currentValue: number = 100;

  @serializable
  barColor: Color = Color.red;

  @serializable
  backgroundColor: Color = Color.black;

  private _backgroundEntity: Entity;
  private _barEntity: Entity;
  private _textRenderer: TextRenderer;

  onStart(): void {
    this.createHealthBar();
  }

  private createHealthBar(): void {
    // 背景
    this._backgroundEntity = new Entity(this.entity.scene, "HealthBar_BG");
    this._backgroundEntity.transform.parent = this.entity.transform;

    const bgRenderer = this._backgroundEntity.addComponent(MeshRenderer);
    const bgMesh = new Entity(this.entity.scene).addComponent(MeshFilter);
    bgMesh.mesh = PrimitiveMesh.createPlane(this.engine, 1, 0.1);
    bgRenderer.material = this.createSolidMaterial(this.backgroundColor);

    // 血条
    this._barEntity = new Entity(this.entity.scene, "HealthBar_Bar");
    this._barEntity.transform.parent = this.entity.transform;
    this._barEntity.transform.position.x = -0.45; // 居中

    const barRenderer = this._barEntity.addComponent(MeshRenderer);
    const barMesh = new Entity(this.entity.scene).addComponent(MeshFilter);
    barMesh.mesh = PrimitiveMesh.createPlane(this.engine, 0.9, 0.08);
    barRenderer.material = this.createSolidMaterial(this.barColor);

    // 文本
    const textEntity = new Entity(this.entity.scene, "HealthBar_Text");
    textEntity.transform.parent = this.entity.transform;
    textEntity.transform.position.z = -0.01;

    this._textRenderer = textEntity.addComponent(TextRenderer);
    this._textRenderer.text = `${this.currentValue}/${this.maxValue}`;
    this._textRenderer.color = Color.white;
    this._textRenderer.fontSize = 24;
  }

  setHealth(value: number): void {
    this.currentValue = Math.max(0, Math.min(value, this.maxValue));
    this.updateDisplay();
  }

  private updateDisplay(): void {
    const ratio = this.currentValue / this.maxValue;

    // 更新血条宽度
    const scale = this._barEntity.transform.localScale;
    scale.x = ratio * 0.9;
    this._barEntity.transform.localScale = scale;

    // 更新位置（左对齐）
    this._barEntity.transform.position.x = -0.45 + (1 - ratio) * 0.45;

    // 更新文本
    this._textRenderer.text = `${Math.round(this.currentValue)}/${this.maxValue}`;

    // 根据血量改变颜色
    if (ratio < 0.3) {
      this._barEntity.getComponent(MeshRenderer).material.color = Color.red;
    } else if (ratio < 0.6) {
      this._barEntity.getComponent(MeshRenderer).material.color = Color.yellow;
    }
  }

  private createSolidMaterial(color: Color): Material {
    const material = new Material(this.engine, Shader.find("unlit"));
    material.shaderData.setColor("mainColor", color);
    return material;
  }
}
```

### 3.2 对话框系统

```typescript
class DialogSystem extends Script {
  private _dialogQueue: DialogItem[] = [];
  private _currentDialog: DialogItem | null = null;
  private _dialogUI: Entity;
  private _textRenderer: TextRenderer;
  private _choices: ChoiceButton[] = [];

  onStart(): void {
    this.createDialogUI();
  }

  showDialog(dialog: DialogItem): void {
    this._dialogQueue.push(dialog);
    if (!this._currentDialog) {
      this.showNextDialog();
    }
  }

  private createDialogUI(): void {
    // 创建对话框背景
    this._dialogUI = new Entity(this.entity.scene, "DialogUI");

    const background = new Entity(this._dialogUI.scene, "DialogBackground");
    background.transform.parent = this._dialogUI.transform;

    const bgRenderer = background.addComponent(MeshRenderer);
    const bgMesh = background.addComponent(MeshFilter);
    bgMesh.mesh = PrimitiveMesh.createPlane(this.engine, 2, 0.5);
    bgRenderer.material = this.createSemiTransparentMaterial();

    // 创建文本显示
    const textEntity = new Entity(this._dialogUI.scene, "DialogText");
    textEntity.transform.parent = this._dialogUI.transform;
    textEntity.transform.position.z = -0.01;

    this._textRenderer = textEntity.addComponent(TextRenderer);
    this._textRenderer.text = "";
    this._textRenderer.fontSize = 32;
    this._textRenderer.color = Color.white;
    this._textRenderer.alignment = TextAlignment.Center;

    // 初始隐藏
    this._dialogUI.isActive = false;
  }

  private showNextDialog(): void {
    if (this._dialogQueue.length === 0) {
      this.hideDialog();
      return;
    }

    this._currentDialog = this._dialogQueue.shift()!;
    this._dialogUI.isActive = true;

    // 打字机效果显示文本
    this.typewriterEffect(this._currentDialog.text);

    // 显示选择按钮
    if (this._currentDialog.choices && this._currentDialog.choices.length > 0) {
      this.showChoices(this._currentDialog.choices);
    } else {
      this.hideChoices();
    }
  }

  private async typewriterEffect(text: string, speed: number = 50): Promise<void> {
    this._textRenderer.text = "";

    for (let i = 0; i < text.length; i++) {
      this._textRenderer.text += text[i];
      await this.delay(speed);
    }

    // 显示继续提示
    if (!this._currentDialog?.choices?.length) {
      this.showContinuePrompt();
    }
  }

  private showChoices(choices: DialogChoice[]): void {
    this.clearChoices();

    choices.forEach((choice, index) => {
      const button = this.createChoiceButton(choice, index);
      this._choices.push(button);
    });
  }

  private createChoiceButton(choice: DialogChoice, index: number): ChoiceButton {
    const buttonEntity = new Entity(this._dialogUI.scene, `Choice_${index}`);
    buttonEntity.transform.parent = this._dialogUI.transform;
    buttonEntity.transform.position.y = -0.3 - index * 0.15;

    const buttonRenderer = buttonEntity.addComponent(MeshRenderer);
    const buttonMesh = buttonEntity.addComponent(MeshFilter);
    buttonMesh.mesh = PrimitiveMesh.createPlane(this.engine, 1.5, 0.1);
    buttonRenderer.material = this.createButtonMaterial();

    const buttonText = new Entity(buttonEntity.scene, `ChoiceText_${index}`);
    buttonText.transform.parent = buttonEntity.transform;
    buttonText.transform.position.z = -0.01;

    const textRenderer = buttonText.addComponent(TextRenderer);
    textRenderer.text = choice.text;
    textRenderer.fontSize = 24;
    textRenderer.color = Color.black;
    textRenderer.alignment = TextAlignment.Center;

    const button = new ChoiceButton(buttonEntity, choice);

    // 添加点击事件
    const collider = buttonEntity.addComponent(Collider);
    collider.onPointerClick = () => {
      this.onChoiceSelected(choice);
    };

    return button;
  }

  private onChoiceSelected(choice: DialogChoice): void {
    // 执行选择的回调
    if (choice.callback) {
      choice.callback();
    }

    // 显示下一个对话框或选择后的对话框
    if (choice.nextDialog) {
      this.showDialog(choice.nextDialog);
    } else {
      this.showNextDialog();
    }
  }

  private hideDialog(): void {
    this._dialogUI.isActive = false;
    this._currentDialog = null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createSemiTransparentMaterial(): Material {
    const material = new Material(this.engine, Shader.find("unlit"));
    const color = new Color(0, 0, 0, 0.8);
    material.shaderData.setColor("mainColor", color);
    material.isTransparent = true;
    return material;
  }
}

interface DialogItem {
  text: string;
  choices?: DialogChoice[];
  onComplete?: () => void;
}

interface DialogChoice {
  text: string;
  callback?: () => void;
  nextDialog?: DialogItem;
}

class ChoiceButton {
  entity: Entity;
  choice: DialogChoice;

  constructor(entity: Entity, choice: DialogChoice) {
    this.entity = entity;
    this.choice = choice;
  }
}
```

## 4. 输入系统

### 4.1 输入管理器

```typescript
class InputManager {
  private _keyStates: Map<string, boolean> = new Map();
  private _keyDownStates: Map<string, boolean> = new Map();
  private _keyUpStates: Map<string, boolean> = new Map();
  private _mousePosition: Vector2 = new Vector2();
  private _mouseDelta: Vector2 = new Vector2();
  private _lastMousePosition: Vector2 = new Vector2();
  private _touchStates: Map<number, TouchInfo> = new Map();

  constructor(engine: Engine) {
    this.setupEventListeners(engine);
  }

  private setupEventListeners(engine: Engine): void {
    const canvas = engine.canvas;

    // 键盘事件
    window.addEventListener('keydown', (e) => {
      const key = e.code;
      this._keyStates.set(key, true);
      this._keyDownStates.set(key, true);
    });

    window.addEventListener('keyup', (e) => {
      const key = e.code;
      this._keyStates.set(key, false);
      this._keyUpStates.set(key, true);
    });

    // 鼠标事件
    canvas.addEventListener('mousemove', (e) => {
      this._lastMousePosition.copyFrom(this._mousePosition);
      this._mousePosition.set(e.clientX, e.clientY);
      Vector2.subtract(this._mousePosition, this._lastMousePosition, this._mouseDelta);
    });

    // 触摸事件
    canvas.addEventListener('touchstart', (e) => {
      for (const touch of e.changedTouches) {
        this._touchStates.set(touch.identifier, {
          position: new Vector2(touch.clientX, touch.clientY),
          startTime: Date.now()
        });
      }
    });

    canvas.addEventListener('touchend', (e) => {
      for (const touch of e.changedTouches) {
        this._touchStates.delete(touch.identifier);
      }
    });

    // 每帧清理状态
    engine.on('update', () => {
      this._keyDownStates.clear();
      this._keyUpStates.clear();
      this._mouseDelta.set(0, 0);
    });
  }

  getKey(key: string): boolean {
    return this._keyStates.get(key) || false;
  }

  getKeyDown(key: string): boolean {
    return this._keyDownStates.get(key) || false;
  }

  getKeyUp(key: string): boolean {
    return this._keyUpStates.get(key) || false;
  }

  getMousePosition(): Vector2 {
    return this._mousePosition.clone();
  }

  getMouseDelta(): Vector2 {
    return this._mouseDelta.clone();
  }

  getTouch(touchId: number): TouchInfo | null {
    return this._touchStates.get(touchId) || null;
  }

  getTouchCount(): number {
    return this._touchStates.size;
  }
}

interface TouchInfo {
  position: Vector2;
  startTime: number;
}

// 输入映射配置
class InputMapping {
  private _actions: Map<string, string[]> = new Map();

  constructor() {
    this.setupDefaultMappings();
  }

  private setupDefaultMappings(): void {
    // 动作映射
    this._actions.set("Jump", ["Space", "KeyW"]);
    this._actions.set("Fire", ["MouseLeft", "KeyF"]);
    this._actions.set("MoveLeft", ["KeyA", "ArrowLeft"]);
    this._actions.set("MoveRight", ["KeyD", "ArrowRight"]);
    this._actions.set("MoveUp", ["KeyW", "ArrowUp"]);
    this._actions.set("MoveDown", ["KeyS", "ArrowDown"]);
  }

  getAction(action: string): string[] {
    return this._actions.get(action) || [];
  }

  addAction(action: string, keys: string[]): void {
    this._actions.set(action, keys);
  }
}

// 增强的输入控制器
class EnhancedPlayerController extends Script {
  private _inputManager: InputManager;
  private _inputMapping: InputMapping;
  private _moveSpeed: number = 5;
  private _rotationSpeed: number = 2;

  onStart(): void {
    this._inputManager = new InputManager(this.engine);
    this._inputMapping = new InputMapping();

    // 可以自定义输入映射
    this._inputMapping.addAction("CustomAction", ["KeyX", "MouseRight"]);
  }

  onUpdate(): void {
    this.handleMovement();
    this.handleActions();
  }

  private handleMovement(): void {
    let moveVector = Vector3.zero;

    // 使用动作映射处理移动
    if (this.isActionPressed("MoveUp")) {
      moveVector.z += 1;
    }
    if (this.isActionPressed("MoveDown")) {
      moveVector.z -= 1;
    }
    if (this.isActionPressed("MoveLeft")) {
      moveVector.x -= 1;
    }
    if (this.isActionPressed("MoveRight")) {
      moveVector.x += 1;
    }

    // 应用移动
    if (moveVector.length() > 0) {
      moveVector.normalize();
      moveVector.scale(this._moveSpeed * this.engine.time.deltaTime);

      const currentPos = this.entity.transform.position;
      currentPos.add(moveVector);
      this.entity.transform.position = currentPos;
    }

    // 处理旋转
    const mouseDelta = this._inputManager.getMouseDelta();
    if (mouseDelta.length() > 0) {
      const rotation = this.entity.transform.rotation;
      const yawRotation = Quaternion.rotationY(mouseDelta.x * this._rotationSpeed * 0.001);
      Quaternion.multiply(rotation, yawRotation, rotation);
    }
  }

  private handleActions(): void {
    // 跳跃
    if (this.isActionDown("Jump")) {
      this.jump();
    }

    // 开火
    if (this.isActionPressed("Fire")) {
      this.fire();
    }

    // 自定义动作
    if (this.isActionDown("CustomAction")) {
      this.performCustomAction();
    }
  }

  private isActionPressed(action: string): boolean {
    const keys = this._inputMapping.getAction(action);
    return keys.some(key => this._inputManager.getKey(key));
  }

  private isActionDown(action: string): boolean {
    const keys = this._inputMapping.getAction(action);
    return keys.some(key => this._inputManager.getKeyDown(key));
  }

  private jump(): void {
    // 实现跳跃逻辑
    console.log("Jump!");
  }

  private fire(): void {
    // 实现开火逻辑
    console.log("Fire!");
  }

  private performCustomAction(): void {
    // 实现自定义动作
    console.log("Custom Action!");
  }
}
```

## 5. 工具类

### 5.1 数学工具

```typescript
class MathUtils {
  // 线性插值（带缓动）
  static lerpWithEasing(start: number, end: number, t: number, easing: EasingFunction = Easing.Linear): number {
    return start + (end - start) * easing(t);
  }

  // 向量插值
  static vectorLerp(start: Vector3, end: Vector3, t: number): Vector3 {
    return new Vector3(
      start.x + (end.x - start.x) * t,
      start.y + (end.y - start.y) * t,
      start.z + (end.z - start.z) * t
    );
  }

  // 球面线性插值
  static slerp(start: Quaternion, end: Quaternion, t: number): Quaternion {
    return Quaternion.slerp(start, end, t);
  }

  // 限制角度在 -180 到 180 之间
  static normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }

  // 平滑阻尼
  static smoothDamp(current: number, target: number, velocity: { value: number }, smoothTime: number, deltaTime: number): number {
    const maxSpeed = Infinity;
    const epsilon = 0.0001;

    smoothTime = Math.max(0.0001, smoothTime);
    const omega = 2 / smoothTime;

    const x = omega * deltaTime;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

    let change = current - target;
    const originalTo = target;

    const maxChange = maxSpeed * smoothTime;
    change = MathUtils.clamp(change, -maxChange, maxChange);
    target = current - change;

    const temp = (velocity.value + omega * change) * deltaTime;
    velocity.value = (velocity.value - omega * temp) * exp;

    let output = target + (change + temp) * exp;

    if (originalTo - current > 0 === output > originalTo) {
      output = originalTo;
      velocity.value = (output - originalTo) / deltaTime;
    }

    return output;
  }

  // 震动效果
  static shake(value: number, time: number, frequency: number = 10, amplitude: number = 1): number {
    const shake = Math.sin(time * frequency * Math.PI * 2) * amplitude;
    return value * (1 - Math.abs(shake));
  }

  // 随机数生成
  static randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  static randomInSphere(out: Vector3): void {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = Math.cbrt(Math.random());

    out.x = radius * Math.sin(phi) * Math.cos(theta);
    out.y = radius * Math.sin(phi) * Math.sin(theta);
    out.z = radius * Math.cos(phi);
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

enum EasingFunction {
  Linear,
  EaseIn,
  EaseOut,
  EaseInOut,
  Bounce
}

// 使用示例
class Tweener {
  private static _activeTweens: Tween[] = [];

  static to(
    target: any,
    duration: number,
    properties: Record<string, number>,
    easing: EasingFunction = Easing.Linear,
    onComplete?: () => void
  ): Tween {
    const tween = new Tween(target, duration, properties, easing, onComplete);
    this._activeTweens.push(tween);
    return tween;
  }

  static update(deltaTime: number): void {
    for (let i = this._activeTweens.length - 1; i >= 0; i--) {
      const tween = this._activeTweens[i];
      tween.update(deltaTime);

      if (tween.isComplete) {
        this._activeTweens.splice(i, 1);
      }
    }
  }
}

class Tween {
  private _startValues: Record<string, number> = {};
  private _changeValues: Record<string, number> = {};
  private _currentTime: number = 0;

  constructor(
    private _target: any,
    private _duration: number,
    private _properties: Record<string, number>,
    private _easing: EasingFunction,
    private _onComplete?: () => void
  ) {
    // 保存起始值
    for (const key in _properties) {
      this._startValues[key] = _target[key] || 0;
      this._changeValues[key] = _properties[key] - this._startValues[key];
    }
  }

  update(deltaTime: number): void {
    this._currentTime += deltaTime;
    const t = Math.min(this._currentTime / this._duration, 1);
    const easedT = this.applyEasing(t);

    for (const key in this._properties) {
      const value = this._startValues[key] + this._changeValues[key] * easedT;
      this._target[key] = value;
    }

    if (t >= 1 && this._onComplete) {
      this._onComplete();
    }
  }

  get isComplete(): boolean {
    return this._currentTime >= this._duration;
  }

  private applyEasing(t: number): number {
    switch (this._easing) {
      case EasingFunction.Linear:
        return t;
      case EasingFunction.EaseIn:
        return t * t;
      case EasingFunction.EaseOut:
        return t * (2 - t);
      case EasingFunction.EaseInOut:
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case EasingFunction.Bounce:
        if (t < 1 / 2.75) {
          return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
          return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
          return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
          return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
      default:
        return t;
    }
  }
}

// 使用示例
// Tweener.to(entity.transform.position, 1, { x: 10, y: 5 }, EasingFunction.EaseInOut);
```

## 总结

这些代码片段涵盖了 Galacean Engine 开发的常见场景：

1. **场景管理**: 场景切换、对象查找
2. **动画系统**: 状态机、程序化动画
3. **UI系统**: 健康条、对话框
4. **输入系统**: 输入管理、动作映射
5. **工具类**: 数学工具、插值、缓动

将这些代码集成到项目中可以大大提高开发效率。记得根据具体需求调整参数和实现细节。

## ⚠️ 禁止事项

### 关键约束
- 🚫 **直接复制粘贴**: 理解代码逻辑后再集成到项目中
- 🚫 **忽略依赖关系**: 确保所需的基础类和库已正确引入
- 🚫 **过度使用**: 不要为了简单功能引入复杂的代码片段
- 🚫 **修改核心代码**: 对示例代码的修改应在项目代码中进行，不要修改原文件

### 常见错误
- ❌ 未调整参数直接使用，导致不符合项目需求
- ❌ 忽略错误处理和边界条件
- ❌ 集成后不测试，导致隐藏bug
- ❌ 重复造轮子，已有类似功能仍添加新代码
- ❌ 代码风格与项目整体不一致

### 最佳实践提醒
- ✅ 先理解代码原理和适用场景
- ✅ 根据项目需求调整参数和实现细节
- ✅ 添加必要的错误处理和参数验证
- ✅ 保持代码风格与项目整体一致
- ✅ 编写测试用例验证集成后的正确性