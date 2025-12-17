---
id: "guide-component-system"
type: "guide"
title: "ECS组件系统使用指南"
description: "详细介绍ECS架构、组件管理、实体操作和自定义组件开发"
tags: ["guide", "ecs", "component", "entity", "system"]
context_dependency: ["coding-conventions"]
related_ids: ["guide-scene-management", "guide-quick-start"]
---

Galacean Engine采用Entity Component System (ECS)架构，提供灵活、高效的组件管理系统。本指南详细介绍如何使用ECS组件系统构建3D应用。

## 目录
- [ECS架构概述](#ecs架构概述)
- [组件基础](#组件基础)
- [实体管理](#实体管理)
- [常用组件](#常用组件)
- [自定义组件](#自定义组件)
- [组件通信](#组件通信)
- [性能优化](#性能优化)
- [最佳实践](#最佳实践)

## ECS架构概述

### 什么是ECS

ECS (Entity Component System) 是一种架构模式，包含三个核心概念：

- **Entity (实体)**: 组件的容器，本身不包含数据或逻辑
- **Component (组件)**: 数据容器，定义实体的属性
- **System (系统)**: 处理具有特定组件的实体（在Galacean中通过脚本组件实现）

### 核心优势

- **灵活性**: 可以动态添加/移除组件
- **可重用性**: 组件可以在多个实体间共享
- **扩展性**: 易于添加新组件类型
- **性能**: 优化的组件存储和访问

## 组件基础

### 1. 组件类型

```typescript
import { Component, Entity, Transform, Renderer, Script } from '@galacean/engine';

// 基础组件类
abstract class Component {
  entity: Entity;     // 所属实体
  enabled: boolean;   // 是否启用
}

// 核心组件
class Transform extends Component {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
}

class Renderer extends Component {
  material: Material;
  castShadows: boolean;
  receiveShadows: boolean;
}

class Script extends Component {
  onAwake(): void {}
  onUpdate(deltaTime: number): void {}
  onDestroy(): void {}
}
```

### 2. 组件生命周期

```typescript
class MyScript extends Script {
  // 组件创建时调用（仅一次）
  onAwake(): void {
    console.log('Component awaked');
    // 初始化操作
  }

  // 组件启用时调用
  onEnable(): void {
    console.log('Component enabled');
  }

  // 第一次更新前调用（仅一次）
  onStart(): void {
    console.log('Component started');
  }

  // 每帧更新
  onUpdate(deltaTime: number): void {
    // 游戏逻辑
  }

  // 每帧物理更新
  onPhysicsUpdate(): void {
    // 物理逻辑
  }

  // 每帧更新后调用
  onLateUpdate(deltaTime: number): void {
    // 延迟逻辑
  }

  // 组件禁用时调用
  onDisable(): void {
    console.log('Component disabled');
  }

  // 组件销毁时调用
  onDestroy(): void {
    console.log('Component destroyed');
    // 清理资源
  }
}
```

## 实体管理

### 1. 创建实体

```typescript
import { Entity, Engine } from '@galacean/engine';

const engine = await Engine.init({ canvas: canvas });
const scene = new Scene(engine);

// 创建空实体
const entity = new Entity(engine, 'MyEntity');

// 创建带Transform的实体（推荐）
const entityWithTransform = scene.createRootEntity('RootEntity');

// 创建子实体
const child = entityWithTransform.createChild('ChildEntity');
```

### 2. 组件操作

```typescript
// 添加组件
const transform = entity.addComponent(Transform);
const renderer = entity.addComponent(MeshRenderer);
const script = entity.addComponent(MyScript);

// 获取组件
const foundTransform = entity.getComponent(Transform);
const foundScript = entity.getComponent(MyScript);

// 获取多个组件
const scripts: MyScript[] = [];
entity.getComponents(MyScript, scripts);

// 检查是否有组件
const hasRenderer = entity.getComponent(MeshRenderer) !== null;

// 移除组件
entity.removeComponent(MyScript);

// 销毁组件
const component = entity.getComponent(MyScript);
component?.destroy();
```

### 3. 组件查找

```typescript
// 递归查找组件
function findComponentInChildren<T extends Component>(
  entity: Entity,
  type: ComponentConstructor<T>
): T | null {
  let component = entity.getComponent(type);
  if (component) return component;

  for (let i = 0; i < entity.children.length; i++) {
    component = findComponentInChildren(entity.children[i], type);
    if (component) return component;
  }

  return null;
}

// 查找所有匹配组件
function findComponentsInScene<T extends Component>(
  scene: Scene,
  type: ComponentConstructor<T>
): T[] {
  const results: T[] = [];

  function search(entity: Entity) {
    const component = entity.getComponent(type);
    if (component) results.push(component);

    for (let i = 0; i < entity.children.length; i++) {
      search(entity.children[i]);
    }
  }

  for (let i = 0; i < scene.rootEntitiesCount; i++) {
    search(scene.getRootEntity(i)!);
  }

  return results;
}
```

## 常用组件

### 1. Transform组件

```typescript
import { Transform, Vector3, Quaternion } from '@galacean/engine';

const transform = entity.transform;

// 位置操作
transform.position.set(0, 1, 0);
const position = transform.position.clone();

// 旋转操作（欧拉角 - 度）
transform.rotation.set(0, 45, 0);

// 旋转操作（四元数）
const quaternion = new Quaternion();
quaternion.fromEulerAngles(0, Math.PI / 4, 0);
transform.rotationQuaternion = quaternion;

// 缩放操作
transform.scale.set(2, 2, 2);

// 世界变换
const worldPosition = transform.worldPosition;
const worldRotation = transform.worldRotation;

// 变换矩阵
const worldMatrix = transform.worldMatrix;

// 坐标转换
const localPoint = new Vector3(1, 0, 0);
const worldPoint = transform.transformPoint(localPoint);
const localPointBack = transform.inverseTransformPoint(worldPoint);

// 相对变换
transform.translate(new Vector3(1, 0, 0), false); // 世界空间
transform.translate(new Vector3(0, 1, 0), true);  // 本地空间

transform.rotate(new Vector3(0, 0, 45), true); // 本地旋转

// 查看目标
transform.lookAt(new Vector3(0, 0, 10), Vector3.UP);
```

### 2. Renderer组件

```typescript
import { MeshRenderer, Mesh, Material, BlinnPhongMaterial } from '@galacean/engine';

// 创建渲染器
const renderer = entity.addComponent(MeshRenderer);

// 设置网格
const mesh = new Mesh(engine);
renderer.mesh = mesh;

// 设置材质
const material = new BlinnPhongMaterial(engine);
material.baseColor = new Color(1, 0, 0, 1);
renderer.setMaterial(material);

// 多材质
const materials: Material[] = [material1, material2];
renderer.setMaterials(materials);

// 渲染属性
renderer.castShadows = true;
renderer.receiveShadows = true;
renderer.priority = 0;
```

### 3. 相机组件

```typescript
import { Camera, CameraType, Color } from '@galacean/engine';

const cameraEntity = scene.createRootEntity('Camera');
const camera = cameraEntity.addComponent(Camera);

// 相机类型
camera.type = CameraType.Perspective;  // 透视相机
// camera.type = CameraType.Orthographic; // 正交相机

// 透视相机设置
camera.fieldOfView = 60;  // 视野角度
camera.nearClipPlane = 0.1;
camera.farClipPlane = 1000;
camera.aspectRatio = canvas.width / canvas.height;

// 正交相机设置
camera.type = CameraType.Orthographic;
camera.orthographicSize = 10;

// 相机位置和方向
cameraEntity.transform.position.set(0, 2, 10);
cameraEntity.transform.lookAt(new Vector3(0, 0, 0));

// 视口和背景
camera.viewport = new Viewport(0, 0, 1, 1);
camera.backgroundColor = new Color(0.2, 0.2, 0.2, 1);

// 渲染目标
const renderTexture = new RenderTexture(engine, 1024, 1024);
camera.renderTarget = renderTexture;

// 后处理效果
const postProcessManager = camera.postProcessManager;
const bloomEffect = postProcessManager.addEffect(BloomEffect);
bloomEffect.intensity = 1.5;
```

### 4. 光源组件

```typescript
import { DirectLight, PointLight, SpotLight, Color } from '@galacean/engine';

// 平行光（太阳光）
const lightEntity = scene.createRootEntity('DirectLight');
const directLight = lightEntity.addComponent(DirectLight);
directLight.color.set(1, 1, 1, 1);
directLight.intensity = 1;
lightEntity.transform.rotation.set(45, -45, 0);

// 点光源
const pointLightEntity = scene.createRootEntity('PointLight');
const pointLight = pointLightEntity.addComponent(PointLight);
pointLight.color.set(1, 1, 0, 1);
pointLight.intensity = 2;
pointLight.distance = 20;
pointLightEntity.transform.position.set(5, 5, 0);

// 聚光灯
const spotLightEntity = scene.createRootEntity('SpotLight');
const spotLight = spotLightEntity.addComponent(SpotLight);
spotLight.color.set(1, 1, 1, 1);
spotLight.intensity = 3;
spotLight.distance = 30;
spotLight.angle = Math.PI / 6; // 30度
spotLight.penumbra = 0.1;      // 衰减
spotLightEntity.transform.position.set(0, 5, 5);
spotLightEntity.transform.lookAt(new Vector3(0, 0, 0));
```

### 5. 物理组件

```typescript
import {
  StaticCollider, DynamicCollider,
  BoxColliderShape, SphereColliderShape,
  RigidBody
} from '@galacean/engine';

// 静态碰撞器
const floorEntity = scene.createRootEntity('Floor');
const floorCollider = floorEntity.addComponent(StaticCollider);
const floorShape = new BoxColliderShape();
floorShape.size = new Vector3(10, 0.1, 10);
floorCollider.addShape(floorShape);

// 动态碰撞器
const boxEntity = scene.createRootEntity('Box');
const boxRigidbody = boxEntity.addComponent(RigidBody);
const boxCollider = boxEntity.addComponent(DynamicCollider);
const boxShape = new BoxColliderShape();
boxShape.size = new Vector3(1, 1, 1);
boxCollider.addShape(boxShape);

// 球体碰撞器
const sphereEntity = scene.createRootEntity('Sphere');
const sphereCollider = sphereEntity.addComponent(DynamicCollider);
const sphereShape = new SphereColliderShape();
sphereShape.radius = 0.5;
sphereCollider.addShape(sphereShape);

// 物理属性
boxRigidbody.mass = 1;
boxRigidbody.friction = 0.5;
boxRigidbody.restitution = 0.8; // 弹性
boxRigidbody.linearDamping = 0.1; // 线性阻尼
boxRigidbody.angularDamping = 0.1; // 角阻尼
```

## 自定义组件

### 1. 基础自定义组件

```typescript
import { Script, Entity } from '@galacean/engine';

class HealthComponent extends Script {
  private _health: number = 100;
  private _maxHealth: number = 100;

  // 属性访问器
  get health(): number {
    return this._health;
  }

  set health(value: number) {
    this._health = Math.max(0, Math.min(value, this._maxHealth));

    if (this._health <= 0) {
      this.onDeath();
    }
  }

  get maxHealth(): number {
    return this._maxHealth;
  }

  get healthPercentage(): number {
    return this._health / this._maxHealth;
  }

  // 生命周期方法
  onAwake(): void {
    console.log(`Entity ${this.entity.name} initialized with ${this._health} health`);
  }

  // 自定义方法
  takeDamage(amount: number): void {
    this.health -= amount;
    console.log(`Entity ${this.entity.name} takes ${amount} damage, remaining health: ${this._health}`);
  }

  heal(amount: number): void {
    this.health += amount;
    console.log(`Entity ${this.entity.name} healed by ${amount}, current health: ${this._health}`);
  }

  private onDeath(): void {
    console.log(`Entity ${this.entity.name} died`);
    this.entity.destroy();
  }
}

// 使用自定义组件
const playerEntity = scene.createRootEntity('Player');
const health = playerEntity.addComponent(HealthComponent);
health.takeDamage(25);
health.heal(10);
```

### 2. 可配置的自定义组件

```typescript
interface MovementConfig {
  speed: number;
  rotationSpeed: number;
  jumpHeight: number;
}

class MovementController extends Script {
  // 可序列化的配置
  public config: MovementConfig = {
    speed: 5,
    rotationSpeed: 180,
    jumpHeight: 2
  };

  private _velocity: Vector3 = new Vector3();
  private _isGrounded: boolean = false;

  onAwake(): void {
    // 验证配置
    this.config.speed = Math.max(0.1, this.config.speed);
    this.config.rotationSpeed = Math.max(0.1, this.config.rotationSpeed);
  }

  onUpdate(deltaTime: number): void {
    this.handleInput(deltaTime);
    this.updatePosition(deltaTime);
  }

  private handleInput(deltaTime: number): void {
    // 示例：键盘输入处理
    const moveSpeed = this.config.speed * deltaTime;
    const rotSpeed = this.config.rotationSpeed * deltaTime;

    // 旋转
    if (engine.inputManager.isKeyDown('KeyA')) {
      this.entity.transform.rotate(new Vector3(0, -rotSpeed, 0), true);
    }
    if (engine.inputManager.isKeyDown('KeyD')) {
      this.entity.transform.rotate(new Vector3(0, rotSpeed, 0), true);
    }

    // 移动
    if (engine.inputManager.isKeyDown('KeyW')) {
      this.entity.transform.translate(new Vector3(0, 0, moveSpeed), true);
    }
    if (engine.inputManager.isKeyDown('KeyS')) {
      this.entity.transform.translate(new Vector3(0, 0, -moveSpeed), true);
    }

    // 跳跃
    if (engine.inputManager.isKeyDown('Space') && this._isGrounded) {
      this.jump();
    }
  }

  private updatePosition(deltaTime: number): void {
    // 更新位置
    this.entity.transform.translate(this._velocity.clone().scale(deltaTime), false);
  }

  private jump(): void {
    this._velocity.y = Math.sqrt(2 * 9.8 * this.config.jumpHeight);
    this._isGrounded = false;
  }
}

// 使用可配置组件
const player = scene.createRootEntity('Player');
const movement = player.addComponent(MovementController);
movement.config.speed = 8;
movement.config.jumpHeight = 3;
```

### 3. 组件装饰器

```typescript
import { serializable } from '@galacean/engine';

class PlayerStats extends Script {
  @serializable
  public level: number = 1;

  @serializable
  public experience: number = 0;

  @serializable
  public skillPoints: number = 0;

  // 不序列化的运行时数据
  private _totalDamageDealt: number = 0;

  onAwake(): void {
    console.log(`Player Level ${this.level} initialized`);
  }

  addExperience(amount: number): void {
    this.experience += amount;

    // 检查升级
    const expNeeded = this.level * 100;
    if (this.experience >= expNeeded) {
      this.levelUp();
    }
  }

  private levelUp(): void {
    this.level++;
    this.experience = 0;
    this.skillPoints += 2;
    console.log(`Level up! Now level ${this.level}`);
  }
}
```

## 组件通信

### 1. 通过实体通信

```typescript
// 获取同一实体的其他组件
class InputController extends Script {
  private movement: MovementController;
  private health: HealthComponent;

  onAwake(): void {
    this.movement = this.entity.getComponent(MovementController);
    this.health = this.entity.getComponent(HealthComponent);
  }

  onUpdate(deltaTime: number): void {
    if (this.health.health > 0) {
      this.movement.processInput(deltaTime);
    }
  }
}
```

### 2. 父子实体通信

```typescript
class WeaponSystem extends Script {
  private owner: Entity;

  onAwake(): void {
    // 获取父实体
    this.owner = this.entity.parent;
  }

  fire(): void {
    if (!this.owner) return;

    const ownerTransform = this.owner.transform;
    const firePosition = ownerTransform.worldPosition.clone();

    // 创建子弹
    const bullet = this.entity.scene.createRootEntity('Bullet');
    bullet.transform.position = firePosition;

    // 设置子弹方向
    bullet.transform.rotationQuaternion = ownerTransform.worldRotationQuaternion.clone();
  }
}
```

### 3. 事件系统通信

```typescript
import { EventDispatcher } from '@galacean/engine';

// 全局事件管理器
class GlobalEventManager extends EventDispatcher {
  private static instance: GlobalEventManager;

  static getInstance(): GlobalEventManager {
    if (!GlobalEventManager.instance) {
      GlobalEventManager.instance = new GlobalEventManager();
    }
    return GlobalEventManager.instance;
  }
}

// 发送事件的组件
class DamageSource extends Script {
  dealDamage(target: Entity, amount: number): void {
    const event = {
      source: this.entity,
      target: target,
      amount: amount
    };

    GlobalEventManager.getInstance().dispatch('damage', event);
  }
}

// 接收事件的组件
class DamageReceiver extends Script {
  onAwake(): void {
    GlobalEventManager.getInstance().on('damage', this.onDamageReceived.bind(this));
  }

  onDestroy(): void {
    GlobalEventManager.getInstance().off('damage', this.onDamageReceived);
  }

  private onDamageReceived(event: any): void {
    if (event.target === this.entity) {
      const health = this.entity.getComponent(HealthComponent);
      if (health) {
        health.takeDamage(event.amount);
      }
    }
  }
}
```

### 4. 服务定位器模式

```typescript
// 游戏管理器
class GameManager {
  private static instance: GameManager;
  private player: Entity;
  private enemies: Entity[] = [];
  private score: number = 0;

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  setPlayer(player: Entity): void {
    this.player = player;
  }

  getPlayer(): Entity | null {
    return this.player;
  }

  addEnemy(enemy: Entity): void {
    this.enemies.push(enemy);
  }

  removeEnemy(enemy: Entity): void {
    const index = this.enemies.indexOf(enemy);
    if (index >= 0) {
      this.enemies.splice(index, 1);
    }
  }

  addScore(points: number): void {
    this.score += points;
    console.log(`Score: ${this.score}`);
  }
}

// 使用游戏管理器
class Enemy extends Script {
  onDestroy(): void {
    GameManager.getInstance().removeEnemy(this.entity);
    GameManager.getInstance().addScore(100);
  }
}
```

## 性能优化

### 1. 组件缓存

```typescript
class OptimizedScript extends Script {
  private _transform: Transform;
  private _renderer: Renderer;

  onAwake(): void {
    // 缓存组件引用
    this._transform = this.entity.transform;
    this._renderer = this.entity.getComponent(Renderer);
  }

  onUpdate(deltaTime: number): void {
    // 使用缓存的引用
    this._transform.rotate(new Vector3(0, 45 * deltaTime, 0), true);
    this._renderer.enabled = this._renderer.enabled;
  }
}
```

### 2. 对象池

```typescript
class BulletPool {
  private pool: Entity[] = [];
  private scene: Scene;
  private engine: Engine;

  constructor(scene: Scene, engine: Engine, initialSize: number = 10) {
    this.scene = scene;
    this.engine = engine;

    // 预创建子弹
    for (let i = 0; i < initialSize; i++) {
      this.createBullet();
    }
  }

  private createBullet(): Entity {
    const bullet = new Entity(this.engine, 'Bullet');
    const renderer = bullet.addComponent(MeshRenderer);
    // 设置子弹外观...

    bullet.isActive = false;
    this.pool.push(bullet);
    return bullet;
  }

  getBullet(): Entity {
    let bullet = this.pool.find(b => !b.isActive);

    if (!bullet) {
      bullet = this.createBullet();
    }

    bullet.isActive = true;
    return bullet;
  }

  returnBullet(bullet: Entity): void {
    bullet.isActive = false;
    // 重置子弹状态
    bullet.transform.position.set(0, 0, 0);
    bullet.transform.rotation.set(0, 0, 0);
  }
}
```

### 3. 批量操作

```typescript
class BatchProcessor {
  private entities: Set<Entity> = new Set();

  addEntity(entity: Entity): void {
    this.entities.add(entity);
  }

  removeEntity(entity: Entity): void {
    this.entities.delete(entity);
  }

  processAll(): void {
    // 批量处理
    this.entities.forEach(entity => {
      const health = entity.getComponent(HealthComponent);
      if (health && health.health <= 0) {
        entity.destroy();
      }
    });
  }
}
```

## 最佳实践

### 1. 组件职责分离

```typescript
// ❌ 错误：一个组件做太多事
class BadComponent extends Script {
  // 处理移动、动画、渲染、声音...
}

// ✅ 正确：职责分离
class MovementController extends Script {
  // 只负责移动逻辑
}

class AnimationController extends Script {
  // 只负责动画控制
}

class SoundManager extends Script {
  // 只负责音频管理
}
```

### 2. 组件组合优于继承

```typescript
// ❌ 错误：深度继承
class FlyingMovingCharacter extends GroundMovingCharacter { }

class SwimmingMovingCharacter extends GroundMovingCharacter { }

// ✅ 正确：组件组合
class Character extends Script {
  private movement: MovementController;
  private flying: FlyingAbility;
  private swimming: SwimmingAbility;

  onAwake(): void {
    this.movement = this.entity.getComponent(MovementController);
    this.flying = this.entity.getComponent(FlyingAbility);
    this.swimming = this.entity.getComponent(SwimmingAbility);
  }
}
```

### 3. 避免频繁的组件查找

```typescript
// ❌ 错误：每帧查找组件
class InefficientUpdate extends Script {
  onUpdate(deltaTime: number): void {
    const transform = this.entity.transform;
    const renderer = this.entity.getComponent(Renderer);
    // ...
  }
}

// ✅ 正确：缓存组件引用
class EfficientUpdate extends Script {
  private transform: Transform;
  private renderer: Renderer;

  onAwake(): void {
    this.transform = this.entity.transform;
    this.renderer = this.entity.getComponent(Renderer);
  }

  onUpdate(deltaTime: number): void {
    // 使用缓存的引用
  }
}
```

### 4. 合理使用enabled属性

```typescript
class ConditionalLogic extends Script {
  private isPaused: boolean = false;

  setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.enabled = !paused; // 禁用组件会停止onUpdate调用
  }

  onUpdate(deltaTime: number): void {
    // 不需要检查isPaused，因为组件被禁用时不会调用
    // 正常更新逻辑
  }
}
```

### 5. 组件生命周期管理

```typescript
class ResourceAwareComponent extends Script {
  private resource: ReferResource;
  private animation: AnimationClip;

  onAwake(): void {
    // 加载资源
    this.loadResources();
  }

  onDestroy(): void {
    // 清理资源
    this.cleanup();
  }

  private async loadResources(): Promise<void> {
    this.resource = await this.engine.resourceManager.load('resource.asset');
    this.animation = await this.engine.resourceManager.load('animation.anim');
  }

  private cleanup(): void {
    if (this.resource) {
      this.resource.release();
    }
    if (this.animation) {
      this.animation.release();
    }
  }
}
```

通过遵循这些指南，你可以充分利用Galacean Engine的ECS组件系统，构建可维护、高性能的3D应用。

## ⚠️ 禁止事项

### 关键约束
- **组件所有权**: 组件必须由实体唯一所有，不可在多个实体间共享同一个组件实例
- **生命周期顺序**: 组件的 `onAwake` 在实体创建时调用，`onStart` 在下一帧调用，不可依赖执行时序
- **类型安全**: 自定义组件必须继承 `Component` 或 `Script` 基类，不可使用普通类替代
- **依赖注入**: 组件间的依赖必须通过实体查找或事件系统，不可直接持有其他组件的强引用

### 常见错误
- **循环依赖**: 组件A依赖组件B，同时组件B依赖组件A，导致初始化死锁
- **空指针异常**: 在 `onAwake` 中访问可能未初始化的组件，应使用 `getComponent` 配合空值检查
- **重复添加**: 尝试向同一实体添加相同类型的组件，应先检查 `getComponent` 结果
- **内存泄漏**: 组件中注册的事件监听器在销毁时未移除，导致回调异常

### 最佳实践
- **组件单一职责**: 每个组件只负责一个功能，避免创建"万能组件"
- **依赖最小化**: 组件间尽量减少直接依赖，使用事件系统进行通信
- **状态机模式**: 复杂的行为逻辑使用状态机组件，避免在 `onUpdate` 中写大量 `if-else`
- **缓存复用**: 在 `onAwake` 中缓存常用组件引用，避免每帧 `getComponent` 查找
- **条件编译**: 使用 `@if` 装饰器或环境变量控制调试代码，减少发布包体积