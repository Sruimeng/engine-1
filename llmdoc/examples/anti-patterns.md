# Galacean Engine 反模式和需要避免的做法

本文档列出了 Galacean Engine 开发中的常见反模式和错误实践，帮助开发者避免这些问题，编写更高质量的代码。

## 1. 架构反模式

### 1.1 单体组件反模式

**反模式**: 创建包含过多职责的巨型组件

```typescript
// ❌ 反模式：单体组件
class PlayerEverythingComponent extends Component {
  // 移动相关
  moveSpeed: number = 5;
  jumpForce: number = 10;

  // 生命值相关
  health: number = 100;
  maxHealth: number = 100;

  // 动画相关
  animator: Animator;
  currentAnimation: string;

  // 音效相关
  audioSource: AudioSource;
  footstepSound: AudioClip;
  jumpSound: AudioClip;

  // 武器相关
  weapon: Weapon;
  ammo: number = 30;

  // UI相关
  healthBar: Entity;
  ammoDisplay: Entity;

  // 网络相关
  networkId: string;
  isLocalPlayer: boolean;

  onUpdate(): void {
    this.handleMovement();
    this.handleAnimation();
    this.updateHealthBar();
    this.syncNetworkPosition();
    this.checkAmmo();
    // ... 100+ 行代码
  }
}
```

**正确做法**: 遵循单一职责原则，拆分为多个专注的组件

```typescript
// ✅ 正确：单一职责组件
class PlayerMovement extends Component {
  @serializable
  moveSpeed: number = 5;

  private _characterController: CharacterController;

  onUpdate(): void {
    this.handleMovement();
  }
}

class PlayerHealth extends Component {
  @serializable
  maxHealth: number = 100;

  private _currentHealth: number;

  onDamage(damage: number): void {
    this._currentHealth -= damage;
    this.scene.emit("playerHealthChanged", this._currentHealth);
  }
}

class PlayerAnimator extends Component {
  private _animator: Animator;
  private _movement: PlayerMovement;

  onUpdate(): void {
    this.updateAnimationState();
  }
}

// 组合使用
const player = new Entity(scene);
player.addComponent(PlayerMovement);
player.addComponent(PlayerHealth);
player.addComponent(PlayerAnimator);
```

### 1.2 深层继承反模式

**反模式**: 创建过深的继承链

```typescript
// ❌ 反模式：深层继承
class GameObject extends Entity {}
class LivingObject extends GameObject {}
class Character extends LivingObject {}
class Player extends Character {}
class WarriorPlayer extends Player {}
class MageWarriorPlayer extends WarriorPlayer {}
```

**正确做法**: 使用组件组合

```typescript
// ✅ 正确：组合模式
class Player extends Entity {
  constructor(scene: Scene) {
    super(scene);
    this.addComponent(CharacterController);
    this.addComponent(PlayerInventory);
    this.addComponent(ClassSelector); // 选择战士/法师等
  }
}
```

## 2. 性能反模式

### 2.1 每帧分配内存

**反模式**: 在update中频繁创建对象

```typescript
// ❌ 反模式：每帧创建对象
class BadPerformance extends Component {
  onUpdate(): void {
    // 每帧创建新的Vector3 - 会造成GC压力
    const position = new Vector3(0, 0, 0);
    const direction = new Vector3(1, 0, 0);
    const result = position.add(direction);

    // 每帧创建数组
    const enemies = this.scene.findComponents(Enemy);

    // 每帧创建临时字符串
    const debugText = `Position: ${this.entity.transform.position.toString()}`;
  }
}
```

**正确做法**: 复用对象和缓存结果

```typescript
// ✅ 正确：对象复用
class GoodPerformance extends Component {
  private _tempVector1: Vector3 = new Vector3();
  private _tempVector2: Vector3 = new Vector3();
  private _tempVector3: Vector3 = new Vector3();

  private _enemies: Enemy[] = [];
  private _lastEnemyCheck: number = 0;

  private _debugText: string = "";

  onUpdate(): void {
    // 复用Vector3对象
    this._tempVector1.set(0, 0, 0);
    this._tempVector2.set(1, 0, 0);
    Vector3.add(this._tempVector1, this._tempVector2, this._tempVector3);

    // 缓存敌人列表，只在必要时更新
    const currentTime = Date.now();
    if (currentTime - this._lastEnemyCheck > 1000) { // 每秒更新一次
      this._enemies = this.scene.findComponents(Enemy);
      this._lastEnemyCheck = currentTime;
    }

    // 使用预分配的字符串缓冲区
    if (this.engine.debugMode) {
      this._debugText = `Position: ${this.entity.transform.position.toString()}`;
    }
  }
}
```

### 2.2 过度的物理计算

**反模式**: 对所有物体进行物理计算

```typescript
// ❌ 反模式：为静态物体添加刚体
class SceneSetup {
  createStaticEnvironment(): void {
    // 地面 - 不需要物理但添加了刚体
    const ground = new Entity(scene);
    ground.addComponent(RigidBody);
    ground.addComponent(BoxCollider);

    // 建筑物 - 不需要物理但添加了刚体
    for (const building of buildings) {
      building.addComponent(RigidBody);
      building.addComponent(MeshCollider);
    }

    // 装饰品 - 不需要物理但添加了刚体
    for (const prop of props) {
      prop.addComponent(RigidBody);
      prop.addComponent(SphereCollider);
    }
  }
}
```

**正确做法**: 只对需要物理的物体使用物理组件

```typescript
// ✅ 正确：选择性使用物理
class OptimizedSceneSetup {
  createStaticEnvironment(): void {
    // 地面 - 只需要碰撞器
    const ground = new Entity(scene);
    const groundCollider = ground.addComponent(BoxCollider);
    groundCollider.isTrigger = true; // 如果不需要物理响应

    // 建筑物 - 使用简化的碰撞体
    for (const building of buildings) {
      const collider = building.addComponent(BoxCollider);
      // 不添加RigidBody，只用于碰撞检测
    }

    // 动态物体 - 才添加刚体
    for (const dynamicObject of dynamicObjects) {
      const rigidBody = dynamicObject.addComponent(RigidBody);
      const collider = dynamicObject.addComponent(MeshCollider);
    }
  }
}
```

### 2.3 渲染状态频繁切换

**反模式**: 不考虑渲染队列的材质设置

```typescript
// ❌ 反模式：随机渲染顺序
class UnoptimizedRenderer {
  renderObjects(objects: Entity[]): void {
    // 随机顺序渲染，导致频繁的材质切换
    for (const obj of objects) {
      const renderer = obj.getComponent(MeshRenderer);
      renderer.material = this.getRandomMaterial(); // 每个物体不同材质
      renderer.render();
    }
  }
}
```

**正确做法**: 按材质排序，最小化状态切换

```typescript
// ✅ 正确：按材质排序渲染
class OptimizedRenderer {
  renderObjects(objects: Entity[]): void {
    // 按材质分组
    const materialGroups: Map<Material, Entity[]> = new Map();

    for (const obj of objects) {
      const renderer = obj.getComponent(MeshRenderer);
      const material = renderer.material;

      if (!materialGroups.has(material)) {
        materialGroups.set(material, []);
      }
      materialGroups.get(material)!.push(obj);
    }

    // 按材质组渲染
    for (const [material, group] of materialGroups) {
      this.renderer.setMaterial(material); // 只切换一次材质

      for (const obj of group) {
        obj.getComponent(MeshRenderer).render();
      }
    }
  }
}
```

## 3. 内存管理反模式

### 3.1 事件监听器泄漏

**反模式**: 添加事件监听器但不移除

```typescript
// ❌ 反模式：事件监听器泄漏
class EventLeak extends Component {
  onStart(): void {
    // 添加监听器但从未移除
    this.scene.on("playerDied", this.onPlayerDied);
    this.engine.on("levelChanged", this.onLevelChanged);
    this.entity.on("collision", this.onCollision);

    // 在循环中添加监听器
    for (let i = 0; i < 100; i++) {
      this.engine.on(`event${i}`, () => console.log(i));
    }
  }

  onDestroy(): void {
    // 忘记移除监听器！
  }
}
```

**正确做法**: 确保移除所有事件监听器

```typescript
// ✅ 正确：清理事件监听器
class NoEventLeak extends Component {
  private _listeners: Array<() => void> = [];

  onStart(): void {
    // 保存取消函数
    this._listeners.push(
      this.scene.on("playerDied", this.onPlayerDied),
      this.engine.on("levelChanged", this.onLevelChanged),
      this.entity.on("collision", this.onCollision)
    );

    // 避免在循环中添加监听器
  }

  onDestroy(): void {
    // 移除所有监听器
    this._listeners.forEach(unsubscribe => unsubscribe());
    this._listeners.length = 0;
  }
}
```

### 3.2 资源未释放

**反模式**: 加载资源但不释放

```typescript
// ❌ 反模式：资源泄漏
class ResourceLeak {
  async loadLevels(): Promise<void> {
    for (let i = 0; i < 100; i++) {
      // 加载但从未释放
      const level = await this.engine.resourceManager.load(`level${i}.json`);
      const texture = await this.engine.resourceManager.load(`texture${i}.jpg`);
      const sound = await this.engine.resourceManager.load(`sound${i}.mp3`);

      // 资源累积在内存中
    }
  }
}
```

**正确做法**: 及时释放不再使用的资源

```typescript
// ✅ 正确：资源管理
class ResourceManagement {
  private _loadedAssets: Set<any> = new Set();
  private _maxLoadedAssets: number = 20;

  async loadLevel(levelIndex: number): Promise<void> {
    // 检查是否需要释放旧资源
    if (this._loadedAssets.size >= this._maxLoadedAssets) {
      this.releaseOldestAssets();
    }

    const level = await this.engine.resourceManager.load(`level${levelIndex}.json`);
    this._loadedAssets.add(level);

    // 使用资源...
  }

  private releaseOldestAssets(): void {
    // 释放最旧的资源（简化示例）
    const assetsToRelease = Array.from(this._loadedAssets).slice(0, 10);
    assetsToRelease.forEach(asset => {
      if (asset.destroy) {
        asset.destroy();
      }
      this._loadedAssets.delete(asset);
    });
  }

  onDestroy(): void {
    // 清理所有加载的资源
    this._loadedAssets.forEach(asset => {
      if (asset.destroy) {
        asset.destroy();
      }
    });
    this._loadedAssets.clear();
  }
}
```

## 4. 渲染反模式

### 4.1 过度绘制

**反模式**: 渲染不可见的物体

```typescript
// ❌ 反模式：渲染所有物体而不考虑可见性
class OverdrawRenderer {
  render(): void {
    const allObjects = this.scene.rootEntities;

    for (const obj of allObjects) {
      const renderer = obj.getComponent(MeshRenderer);
      if (renderer) {
        // 不管物体是否在视锥内都渲染
        renderer.render();
      }
    }
  }
}
```

**正确做法**: 实现视锥剔除

```typescript
// ✅ 正确：视锥剔除
class FrustumCullingRenderer {
  private _camera: Camera;

  render(): void {
    const frustum = this._camera.frustum;
    const allObjects = this.scene.rootEntities;

    for (const obj of allObjects) {
      const renderer = obj.getComponent(MeshRenderer);
      if (!renderer) continue;

      // 检查是否在视锥内
      if (this.isInFrustum(obj, frustum)) {
        renderer.render();
      } else {
        renderer.entity.isActive = false; // 或跳过渲染
      }
    }
  }

  private isInFrustum(entity: Entity, frustum: Frustum): boolean {
    const bounds = entity.getComponent(Bounds);
    return bounds ? frustum.intersects(bounds) : false;
  }
}
```

### 4.2 过度的后期处理

**反模式**: 链式使用大量后期处理效果

```typescript
// ❌ 反模式：过度后期处理
class OverkillPostProcessing {
  setupEffects(): void {
    // 链式添加10+个效果
    this.camera.addPostProcess(BloomEffect);
    this.camera.addPostProcess(MotionBlurEffect);
    this.camera.addPostProcess(DepthOfFieldEffect);
    this.camera.addPostProcess(AntiAliasingEffect);
    this.camera.addPostProcess(VignetteEffect);
    this.camera.addPostProcess(ColorGradingEffect);
    this.camera.addPostProcess(ScreenSpaceReflectionEffect);
    this.camera.addPostProcess(AmbientOcclusionEffect);
    this.camera.addPostProcess(GlobalFogEffect);
    this.camera.addPostProcess(FilmGrainEffect);
    this.camera.addPostProcess(ChromaticAberrationEffect);
  }
}
```

**正确做法**: 根据需求选择必要的效果

```typescript
// ✅ 正确：选择性后期处理
class OptimizedPostProcessing {
  setupEffects(): void {
    // 根据设备性能调整效果
    const deviceInfo = this.engine.deviceInfo;

    if (deviceInfo.isHighEnd) {
      this.camera.addPostProcess(BloomEffect);
      this.camera.addPostProcess(DepthOfFieldEffect);
      this.camera.addPostProcess(AmbientOcclusionEffect);
    } else if (deviceInfo.isMidRange) {
      this.camera.addPostProcess(BloomEffect);
    } else {
      // 低端设备不使用后期处理
    }

    // 允许用户在设置中关闭效果
    if (this.settings.bloomEnabled) {
      this.enableEffect(BloomEffect);
    }
  }
}
```

## 5. 物理反模式

### 5.1 过于复杂的碰撞体

**反模式**: 对复杂模型使用精确网格碰撞

```typescript
// ❌ 反模式：过度复杂的碰撞体
class ComplexColliders {
  setupCharacter(): void {
    const character = new Entity(scene);
    const renderer = character.addComponent(MeshRenderer);
    renderer.mesh = this.detailedCharacterMesh; // 10000+ 三角形

    // 使用相同的高精度网格作为碰撞体
    const collider = character.addComponent(MeshCollider);
    collider.mesh = this.detailedCharacterMesh;
  }
}
```

**正确做法**: 使用简化的碰撞体

```typescript
// ✅ 正确：简化碰撞体
class SimpleColliders {
  setupCharacter(): void {
    const character = new Entity(scene);

    // 渲染使用高精度模型
    const renderer = character.addComponent(MeshRenderer);
    renderer.mesh = this.detailedCharacterMesh;

    // 碰撞使用简化形状
    const capsuleCollider = character.addComponent(CapsuleCollider);
    capsuleCollider.radius = 0.5;
    capsuleCollider.height = 2;

    // 或者使用多个基础形状组合
    this.addCompositeCollider(character);
  }

  private addCompositeCollider(entity: Entity): void {
    // 身体
    const bodyCollider = entity.addComponent(BoxCollider);
    bodyCollider.size = new Vector3(1, 1.5, 0.5);

    // 头部
    const headCollider = new Entity();
    headCollider.transform.parent = entity.transform;
    headCollider.transform.position.y = 0.9;
    const headShape = headCollider.addComponent(SphereCollider);
    headShape.radius = 0.3;
  }
}
```

### 5.2 物理更新频率过高

**反模式**: 不必要的高频率物理更新

```typescript
// ❌ 反模式：过高频率物理更新
class HighFrequencyPhysics {
  setupPhysics(): void {
    // 设置过高的物理更新频率
    this.physicsWorld.fixedTimeStep = 1/120; // 120 FPS物理
    this.physicsWorld.velocityIterations = 20;
    this.physicsWorld.positionIterations = 20;
  }
}
```

**正确做法**: 合理设置物理参数

```typescript
// ✅ 正确：合理的物理设置
class OptimizedPhysics {
  setupPhysics(): void {
    // 根据游戏类型调整
    if (this.gameType === "fighting") {
      this.physicsWorld.fixedTimeStep = 1/60; // 60 FPS足够
      this.physicsWorld.velocityIterations = 10;
      this.physicsWorld.positionIterations = 10;
    } else if (this.gameType === "racing") {
      this.physicsWorld.fixedTimeStep = 1/30; // 30 FPS即可
      this.physicsWorld.velocityIterations = 6;
      this.physicsWorld.positionIterations = 6;
    }
  }
}
```

## 6. 动画反模式

### 6.1 过度混合动画

**反模式**: 同时混合太多动画

```typescript
// ❌ 反模式：过度动画混合
class AnimationOverkill {
  updateAnimation(): void {
    const animator = this.getComponent(Animator);

    // 同时混合10+个动画
    animator.setLayerWeight("Walk", 0.5);
    animator.setLayerWeight("Run", 0.3);
    animator.setLayerWeight("Jump", 0.2);
    animator.setLayerWeight("Attack", 0.4);
    animator.setLayerWeight("Block", 0.3);
    animator.setLayerWeight("Dance", 0.1);
    animator.setLayerWeight("Wave", 0.2);
    animator.setLayerWeight("Point", 0.1);
    animator.setLayerWeight("Salute", 0.1);
    animator.setLayerWeight("Sit", 0.2);
  }
}
```

**正确做法**: 使用状态机管理动画状态

```typescript
// ✅ 正确：动画状态机
class AnimationStateMachine {
  private _currentState: AnimationState = AnimationState.Idle;

  updateAnimation(): void {
    const newState = this.calculateState();

    if (newState !== this._currentState) {
      this.transitionTo(newState);
      this._currentState = newState;
    }
  }

  private transitionTo(state: AnimationState): void {
    const animator = this.getComponent(Animator);

    // 只激活当前状态的动画
    animator.crossFade(state.toString(), 0.2);
  }

  private calculateState(): AnimationState {
    // 基于输入计算应该的状态
    if (this.isAttacking()) return AnimationState.Attack;
    if (this.isJumping()) return AnimationState.Jump;
    if (this.isMoving()) return this.isRunning() ? AnimationState.Run : AnimationState.Walk;
    return AnimationState.Idle;
  }
}
```

## 7. 通用编程反模式

### 7.1 魔法数字

**反模式**: 使用未定义的常量

```typescript
// ❌ 反模式：魔法数字
class MagicNumbers {
  onUpdate(): void {
    // 这些数字代表什么？
    this.entity.transform.position.x += 0.5;
    this.entity.transform.rotation.y += 1.57;
    this.health -= 10;

    if (this.distance > 100) {
      this.explode();
    }
  }
}
```

**正确做法**: 使用有意义的常量

```typescript
// ✅ 正确：命名常量
class NamedConstants {
  private static readonly MOVE_SPEED = 0.5;
  private static readonly ROTATION_SPEED = Math.PI / 2; // 90度
  private static readonly DAMAGE_AMOUNT = 10;
  private static readonly EXPLOSION_DISTANCE = 100;

  onUpdate(): void {
    this.entity.transform.position.x += NamedConstants.MOVE_SPEED;
    this.entity.transform.rotation.y += NamedConstants.ROTATION_SPEED;
    this.health -= NamedConstants.DAMAGE_AMOUNT;

    if (this.distance > NamedConstants.EXPLOSION_DISTANCE) {
      this.explode();
    }
  }
}
```

### 7.2 忽略错误处理

**反模式**: 不处理异步操作错误

```typescript
// ❌ 反模式：忽略错误
class IgnoreErrors {
  loadAssets(): void {
    // 没有错误处理
    this.engine.resourceManager.load("model.glb").then(model => {
      this.entity.addComponent(MeshRenderer).mesh = model;
    });

    // 没有try-catch
    const texture = await this.engine.resourceManager.load("texture.jpg");
    material.setTexture(texture);
  }
}
```

**正确做法**: 完善的错误处理

```typescript
// ✅ 正确：错误处理
class ProperErrorHandling {
  async loadAssets(): Promise<void> {
    try {
      const model = await this.engine.resourceManager.load("model.glb");
      this.entity.addComponent(MeshRenderer).mesh = model;
    } catch (error) {
      console.error("Failed to load model:", error);
      // 使用备用模型或显示错误提示
      this.loadFallbackModel();
    }

    try {
      const texture = await this.engine.resourceManager.load("texture.jpg");
      material.setTexture(texture);
    } catch (error) {
      console.error("Failed to load texture:", error);
      // 使用默认纹理
      material.setTexture(this.getDefaultTexture());
    }
  }

  private loadFallbackModel(): void {
    const fallback = this.engine.resourceManager.getFallbackModel();
    this.entity.addComponent(MeshRenderer).mesh = fallback;
  }
}
```

## 检查清单

### 代码质量检查

- [ ] 组件职责单一，不超过200行代码
- [ ] 避免深层继承，使用组合
- [ ] 复用对象，避免每帧分配
- [ ] 缓存计算结果，避免重复计算
- [ ] 事件监听器正确清理
- [ ] 资源及时释放

### 性能检查

- [ ] Draw Call数量合理（<1000）
- [ ] 三角形数量适中（<100万）
- [ ] 物理对象数量合理
- [ ] 避免过度绘制
- [ ] 合理的LOD设置

### 内存检查

- [ ] 没有内存泄漏
- [ ] 对象池使用正确
- [ ] 纹理和模型资源适当压缩
- [ ] 音频资源合理使用

### 可维护性检查

- [ ] 代码有清晰的注释
- [ ] 变量和函数命名有意义
- [ ] 没有魔法数字
- [ ] 错误处理完善
- [ ] 代码结构清晰

## 总结

避免这些反模式可以帮助你：

1. **提高性能**: 减少CPU和GPU负担
2. **节省内存**: 避免内存泄漏和过度分配
3. **提升可维护性**: 代码更清晰，更易修改
4. **增强稳定性**: 减少崩溃和错误
5. **改善用户体验**: 更流畅的运行效果

记住：**预防胜于治疗**。在编码阶段就避免这些反模式，比后期修复要容易得多。定期进行代码审查，使用性能分析工具，持续优化代码质量。