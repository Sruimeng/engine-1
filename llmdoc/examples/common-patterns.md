---
id: "examples-common-patterns"
type: "reference"
title: "Galacean Engine 常见设计模式示例"
description: "ECS架构、组件通信、资源管理、状态机等核心模式的代码示例和最佳实践"
tags: ["examples", "patterns", "ecs", "best-practices", "architecture"]
context_dependency: ["coding-conventions"]
related_ids: ["anti-patterns", "performance-patterns", "recipes"]
---

本文档总结了 Galacean Engine 开发中的常见设计模式和最佳实践，帮助开发者编写更优雅、高效的代码。

## 1. ECS 架构模式

### 1.1 实体-组件组合模式

```typescript
// ✅ 推荐：通过组件组合功能
class PlayerController extends Script {
  @serializable
  moveSpeed: number = 5;

  private _transform: Transform;
  private _animator: Animator;

  onStart() {
    this._transform = this.entity.transform;
    this._animator = this.entity.getComponent(Animator);
  }

  onUpdate() {
    const { x, y } = this.engine.input.inputManager.pointer.position;
    const moveVector = new Vector3(x, 0, y).normalize.scale(this.moveSpeed);
    this._transform.position = this._transform.position.add(moveVector);

    if (moveVector.length() > 0.01) {
      this._animator.play("Run");
    }
  }
}

// ❌ 避免：继承过多的类
class Player extends Entity {
  // 避免在Entity中直接添加功能
}
```

### 1.2 组件通信模式

```typescript
// ✅ 推荐：通过事件系统通信
class HealthComponent extends Component {
  private _currentHealth: number = 100;

  onDamage(damage: number) {
    this._currentHealth -= damage;
    this.entity.getScene().emit("healthChanged", this.entity, this._currentHealth);

    if (this._currentHealth <= 0) {
      this.entity.getScene().emit("entityDied", this.entity);
    }
  }
}

// 监听事件
class UIManager extends Script {
  onStart() {
    this.scene.on("healthChanged", (entity, health) => {
      this.updateHealthUI(entity, health);
    });
  }
}
```

## 2. 资源管理模式

### 2.1 对象池模式

```typescript
// ✅ 推荐：使用对象池避免频繁创建销毁
class BulletPool {
  private _pool: Entity[] = [];
  private _prefab: Entity;
  private _scene: Scene;

  constructor(prefab: Entity, scene: Scene) {
    this._prefab = prefab;
    this._scene = scene;
  }

  get(): Entity {
    let bullet = this._pool.pop();
    if (!bullet) {
      bullet = this._prefab.clone();
    }
    return bullet;
  }

  release(bullet: Entity) {
    bullet.isActive = false;
    this._pool.push(bullet);
  }
}

// 使用示例
class WeaponSystem extends Script {
  private _bulletPool: BulletPool;

  async onStart() {
    const bulletPrefab = await this.engine.resourceManager.load<Entity>("bullet.prefab");
    this._bulletPool = new BulletPool(bulletPrefab, this.scene);
  }

  fire(direction: Vector3) {
    const bullet = this._bulletPool.get();
    bullet.isActive = true;
    bullet.transform.position = this.entity.transform.position;

    // 设置速度...

    // 设置回收
    setTimeout(() => {
      this._bulletPool.release(bullet);
    }, 3000);
  }
}
```

### 2.2 资源预加载模式

```typescript
// ✅ 推荐：预加载关键资源
class LoadingManager {
  private _loadingPromises: Promise<any>[] = [];
  private _loadedAssets: Map<string, any> = new Map();

  preloadAssets(assetList: string[]): Promise<void> {
    const resourceManager = this.engine.resourceManager;

    assetList.forEach(assetPath => {
      const promise = resourceManager.load(assetPath).then(asset => {
        this._loadedAssets.set(assetPath, asset);
      });
      this._loadingPromises.push(promise);
    });

    return Promise.all(this._loadingPromises).then(() => {});
  }

  getAsset<T>(assetPath: string): T {
    return this._loadedAssets.get(assetPath) as T;
  }
}

// 使用示例
const loadingManager = new LoadingManager();
await loadingManager.preloadAssets([
  "models/player.glb",
  "textures/diffuse.jpg",
  "animations/run.anim"
]);
```

## 3. 渲染优化模式

### 3.1 批量渲染模式

```typescript
// ✅ 推荐：合并相似材质的渲染
class InstancedRenderer extends Script {
  private _meshRenderer: MeshRenderer;
  private _instancedData: Float32Array;
  private _maxInstances: number = 100;

  onStart() {
    this._meshRenderer = this.entity.getComponent(MeshRenderer);
    this._meshRenderer.enableInstancing = true;
    this._instancedData = new Float32Array(this._maxInstances * 16);
  }

  addInstance(position: Vector3, rotation: Quaternion, scale: Vector3, index: number) {
    const matrix = new Matrix();
    MatrixTRS.fromTranslationRotationScale(position, rotation, scale, matrix);

    const offset = index * 16;
    matrix.elements.forEach((value, i) => {
      this._instancedData[offset + i] = value;
    });

    this._meshRenderer.setInstancedMatrixArray(this._instancedData);
  }
}
```

### 3.2 LOD (Level of Detail) 模式

```typescript
// ✅ 推荐：根据距离切换模型精度
class LODManager extends Script {
  @serializable
  lodLevels: Entity[] = [];

  @serializable
  lodDistances: number[] = [10, 30, 50];

  private _camera: Camera;
  private _currentLOD: number = 0;

  onStart() {
    this._camera = this.scene.activeEntities.find(
      e => e.getComponent(Camera)
    ).getComponent(Camera);

    // 初始化LOD状态
    this.lodLevels.forEach((lod, index) => {
      lod.isActive = index === 0;
    });
  }

  onUpdate() {
    const distance = Vector3.distance(
      this.entity.transform.position,
      this._camera.entity.transform.position
    );

    let newLOD = 0;
    for (let i = 0; i < this.lodDistances.length; i++) {
      if (distance > this.lodDistances[i]) {
        newLOD = i + 1;
      }
    }

    if (newLOD !== this._currentLOD) {
      this.switchLOD(newLOD);
    }
  }

  private switchLOD(newLOD: number) {
    this.lodLevels[this._currentLOD].isActive = false;
    this.lodLevels[newLOD].isActive = true;
    this._currentLOD = newLOD;
  }
}
```

## 4. 状态管理模式

### 4.1 状态机模式

```typescript
// ✅ 推荐：使用状态机管理复杂行为
enum PlayerState {
  Idle,
  Running,
  Jumping,
  Attacking
}

class PlayerController extends Script {
  private _currentState: PlayerState = PlayerState.Idle;
  private _stateHandlers: Map<PlayerState, () => void>;

  onStart() {
    this._stateHandlers = new Map([
      [PlayerState.Idle, this.handleIdle.bind(this)],
      [PlayerState.Running, this.handleRunning.bind(this)],
      [PlayerState.Jumping, this.handleJumping.bind(this)],
      [PlayerState.Attacking, this.handleAttacking.bind(this)]
    ]);
  }

  onUpdate() {
    const handler = this._stateHandlers.get(this._currentState);
    if (handler) {
      handler();
    }
  }

  changeState(newState: PlayerState) {
    if (this.canTransitionTo(newState)) {
      this.onExitState(this._currentState);
      this._currentState = newState;
      this.onEnterState(newState);
    }
  }

  private handleIdle() {
    if (this.isMoving()) {
      this.changeState(PlayerState.Running);
    }
  }

  private handleRunning() {
    this.movePlayer();
    if (!this.isMoving()) {
      this.changeState(PlayerState.Idle);
    }
  }
}
```

### 4.2 观察者模式

```typescript
// ✅ 推荐：使用观察者模式响应变化
class ObservableValue<T> {
  private _value: T;
  private _observers: Set<(value: T) => void> = new Set();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get value(): T {
    return this._value;
  }

  set value(newValue: T) {
    if (newValue !== this._value) {
      this._value = newValue;
      this.notify();
    }
  }

  subscribe(observer: (value: T) => void) {
    this._observers.add(observer);
    return () => this._observers.delete(observer);
  }

  private notify() {
    this._observers.forEach(observer => observer(this._value));
  }
}

// 使用示例
class PlayerHealth {
  public health = new ObservableValue(100);

  constructor() {
    this.health.subscribe(value => {
      if (value <= 0) {
        this.onDeath();
      }
      if (value < 30) {
        this.showLowHealthWarning();
      }
    });
  }
}
```

## 5. 性能优化模式

### 5.1 延迟初始化模式

```typescript
// ✅ 推荐：延迟初始化非关键组件
class LazyComponentManager {
  private _components: Map<string, Component> = new Map();
  private _factories: Map<string, () => Component> = new Map();

  register<T extends Component>(
    name: string,
    factory: () => T
  ) {
    this._factories.set(name, factory);
  }

  get<T extends Component>(name: string): T {
    let component = this._components.get(name);
    if (!component) {
      const factory = this._factories.get(name);
      if (factory) {
        component = factory();
        this._components.set(name, component);
      }
    }
    return component as T;
  }
}

// 使用示例
class GameManager extends Script {
  private _componentManager = new LazyComponentManager();

  onStart() {
    // 注册组件工厂
    this._componentManager.register("audio", () => new AudioManager());
    this._componentManager.register("network", () => new NetworkManager());

    // 组件将在首次使用时创建
  }

  playSound(soundName: string) {
    const audioManager = this._componentManager.get<AudioManager>("audio");
    audioManager.play(soundName);
  }
}
```

### 5.2 缓存计算结果模式

```typescript
// ✅ 推荐：缓存昂贵的计算
class CachedCalculator {
  private _cache: Map<string, any> = new Map();
  private _dirtyFlags: Map<string, boolean> = new Map();

  markDirty(key: string) {
    this._dirtyFlags.set(key, true);
  }

  getCachedValue<T>(key: string, calculator: () => T): T {
    if (this._dirtyFlags.get(key) || !this._cache.has(key)) {
      this._cache.set(key, calculator());
      this._dirtyFlags.set(key, false);
    }
    return this._cache.get(key);
  }

  // 矩阵计算缓存示例
  getWorldMatrix(): Matrix {
    return this.getCachedValue("worldMatrix", () => {
      const matrix = new Matrix();
      // 执行昂贵的矩阵计算
      this.calculateWorldMatrix(matrix);
      return matrix;
    });
  }

  invalidateTransform() {
    this.markDirty("worldMatrix");
    this.markDirty("inverseWorldMatrix");
    this.markDirty("boundingBox");
  }
}
```

## 6. 异步操作模式

### 6.1 Promise 链式操作

```typescript
// ✅ 推荐：链式异步操作
class AssetLoader {
  async loadSceneAsync(scenePath: string): Promise<Scene> {
    try {
      // 1. 加载场景配置
      const sceneConfig = await this.engine.resourceManager.load<SceneConfig>(
        `${scenePath}/config.json`
      );

      // 2. 加载环境贴图
      const skybox = await this.loadSkybox(sceneConfig.skyboxPath);

      // 3. 加载模型
      const models = await Promise.all(
        sceneConfig.modelPaths.map(path => this.loadModel(path))
      );

      // 4. 创建场景
      const scene = this.createScene(sceneConfig, skybox, models);

      return scene;
    } catch (error) {
      console.error(`Failed to load scene: ${scenePath}`, error);
      throw error;
    }
  }

  private async loadSkybox(path: string): Promise<TextureCube> {
    const texture = await this.engine.resourceManager.load<TextureCube>(path);
    return texture;
  }

  private async loadModel(path: string): Promise<Entity> {
    const model = await this.engine.resourceManager.load<Entity>(path);
    return model;
  }
}
```

### 6.2 并发操作控制

```typescript
// ✅ 推荐：控制并发数量
class ConcurrencyController {
  private _runningCount: number = 0;
  private _maxConcurrent: number;
  private _queue: Array<() => Promise<any>> = [];

  constructor(maxConcurrent: number = 5) {
    this._maxConcurrent = maxConcurrent;
  }

  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this._queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this._runningCount >= this._maxConcurrent || this._queue.length === 0) {
      return;
    }

    this._runningCount++;
    const task = this._queue.shift();

    try {
      await task();
    } finally {
      this._runningCount--;
      this.processQueue();
    }
  }
}

// 使用示例：并发加载资源
const concurrencyController = new ConcurrencyController(3);
const loadPromises = assetPaths.map(path =>
  concurrencyController.execute(() => loadAsset(path))
);
const assets = await Promise.all(loadPromises);
```

## 总结

这些设计模式是 Galacean Engine 开发中的最佳实践总结：

1. **ECS架构**：充分利用组件化设计，避免深层次继承
2. **资源管理**：使用对象池、预加载、缓存等优化资源使用
3. **渲染优化**：通过实例化、LOD等技术提升渲染性能
4. **状态管理**：使用状态机和观察者模式管理复杂逻辑
5. **性能优化**：延迟初始化、缓存计算结果等优化策略
6. **异步操作**：合理控制并发，避免资源竞争

遵循这些模式可以编写出更清晰、高效、可维护的代码。

## ⚠️ 禁止事项

### 关键约束
- 🚫 **违反ECS原则**: 不应在Entity类中直接添加业务逻辑
- 🚫 **过度继承**: 避免深层继承链，优先使用组合
- 🚫 **资源泄漏**: 所有异步操作和资源加载必须有错误处理
- 🚫 **硬编码依赖**: 组件间应通过事件通信，避免直接引用

### 常见错误
- ❌ 在Entity类中添加业务方法而非使用Component
- ❌ 组件密耦合，直接访问其他组件的具体实现
- ❌ 事件监听器不清理，场景切换时造成内存泄漏
- ❌ 阻塞式资源加载导致UI卡顿
- ❌ 忽略并发控制，导致资源竞争和状态不一致

### 最佳实践提醒
- ✅ 严格遵守ECS架构，Entity只负责组件管理
- ✅ 使用事件系统进行组件间通信
- ✅ 异步操作使用Promise，正确处理错误和超时
- ✅ 对象池管理频繁创建销毁的对象
- ✅ 合理使用缓存，避免重复计算