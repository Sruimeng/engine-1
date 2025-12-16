# 数据模型与ECS架构

本文档详细描述了Galacean Engine的ECS（Entity Component System）架构设计，包括核心组件、场景管理、资源管理和系统接口。

## 1. Entity组件系统

### 1.1 Entity类作为容器

`Entity`类是ECS架构中的核心容器类，负责管理组件的生命周期和层次结构。

#### 核心特性：
- **组件容器**：每个Entity包含多个组件（`Component[]`）的集合
- **层次结构**：支持父子关系的实体树结构
- **生命周期管理**：管理实体的激活状态和组件的生命周期
- **事件分发**：提供修改事件的监听机制

#### 关键属性：
```typescript
class Entity {
    // 实体名称
    name: string;

    // 所属层级
    layer: Layer;

    // 激活状态
    isActive: boolean;
    isActiveInHierarchy: boolean;

    // 父子关系
    parent: Entity;
    children: Readonly<Entity[]>;

    // Transform组件（每个Entity默认包含）
    transform: Transform;

    // 所属场景
    scene: Scene;
}
```

#### 核心方法：
```typescript
// 组件管理
addComponent<T>(type: ComponentConstructor<T>): InstanceType<T>
getComponent<T>(type: ComponentConstructor<T>): T | null
getComponents<T>(type: ComponentConstructor<T>, results: T[]): T[]

// 层次结构管理
addChild(child: Entity): void
removeChild(child: Entity): void
createChild(name?: string): Entity

// 查找功能
findByName(name: string): Entity
findByPath(path: string): Entity
```

### 1.2 组件激活机制

Entity实现了复杂的激活状态管理系统：

- **本地激活**：`isActive`属性控制实体的本地激活状态
- **层级激活**：`isActiveInHierarchy`考虑父实体的激活状态
- **场景激活**：`_isActiveInScene`考虑场景的激活状态
- **激活标志**：使用`ActiveChangeFlag`枚举控制激活变化的传播范围

## 2. 核心组件

### 2.1 Transform组件

`Transform`组件负责管理实体的位置、旋转和缩放信息。

#### 核心特性：
- **本地变换**：position、rotation（欧拉角和四元数）、scale
- **世界变换**：worldPosition、worldRotation、worldMatrix
- **脏标记系统**：使用`TransformModifyFlags`优化性能
- **坐标空间转换**：支持本地和世界坐标系的相互转换

#### 关键属性：
```typescript
class Transform {
    // 本地变换
    position: Vector3;
    rotation: Vector3;          // 欧拉角（度）
    rotationQuaternion: Quaternion;
    scale: Vector3;

    // 世界变换
    worldPosition: Vector3;
    worldRotation: Vector3;
    worldRotationQuaternion: Quaternion;
    lossyWorldScale: Vector3;

    // 矩阵
    localMatrix: Matrix;
    worldMatrix: Matrix;

    // 方向向量
    worldForward: Vector3;
    worldRight: Vector3;
    worldUp: Vector3;
}
```

#### 变换操作：
```typescript
// 位置变换
translate(translation: Vector3, relativeToLocal?: boolean): void
setPosition(x: number, y: number, z: number): void
setWorldPosition(x: number, y: number, z: number): void

// 旋转变换
rotate(rotation: Vector3, relativeToLocal?: boolean): void
rotateByAxis(axis: Vector3, angle: number, relativeToLocal?: boolean): void
lookAt(targetPosition: Vector3, worldUp?: Vector3): void

// 缩放变换
setScale(x: number, y: number, z: number): void
```

### 2.2 Renderer组件

`Renderer`组件是所有渲染组件的基类，负责材质管理和渲染管线集成。

#### 核心特性：
- **材质管理**：支持多材质和材质实例化
- **渲染属性**：控制阴影接收、渲染优先级等
- **着色器数据**：管理渲染相关的着色器变量
- **包围盒**：提供世界空间的包围盒计算

#### 关键属性：
```typescript
class Renderer {
    // 材质管理
    materialCount: number;
    shaderData: ShaderData;

    // 渲染属性
    receiveShadows: boolean;
    castShadows: boolean;
    priority: number;

    // 状态
    isCulled: boolean;
    bounds: BoundingBox;
}
```

#### 材质操作：
```typescript
// 材质获取
getMaterial(index?: number): Material | null
getInstanceMaterial(index?: number): Material | null
getMaterials(): Readonly<Material[]>
getInstanceMaterials(): Readonly<Material[]>

// 材质设置
setMaterial(material: Material): void
setMaterial(index: number, material: Material): void
setMaterials(materials: Material[]): void
```

### 2.3 Script组件

`Script`组件提供游戏逻辑编写的框架，包含完整的生命周期回调。

#### 生命周期方法：
```typescript
class Script {
    // 生命周期回调
    onAwake(): void;           // 首次启用时调用，仅一次
    onEnable(): void;          // 启用时调用
    onStart(): void;           // 首次帧循环前调用，仅一次
    onUpdate(deltaTime: number): void;      // 每帧调用
    onLateUpdate(deltaTime: number): void;  // 每帧更新后调用
    onDisable(): void;         // 禁用时调用
    onDestroy(): void;         // 销毁时调用

    // 物理回调
    onPhysicsUpdate(): void;
    onCollisionEnter(other: Collision): void;
    onCollisionExit(other: Collision): void;
    onCollisionStay(other: Collision): void;
    onTriggerEnter(other: ColliderShape): void;
    onTriggerExit(other: ColliderShape): void;
    onTriggerStay(other: ColliderShape): void;

    // 指针交互回调
    onPointerDown(eventData: PointerEventData): void;
    onPointerUp(eventData: PointerEventData): void;
    onPointerClick(eventData: PointerEventData): void;
    onPointerEnter(eventData: PointerEventData): void;
    onPointerExit(eventData: PointerEventData): void;
    onPointerBeginDrag(eventData: PointerEventData): void;
    onPointerDrag(eventData: PointerEventData): void;
    onPointerEndDrag(eventData: PointerEventData): void;
    onPointerDrop(eventData: PointerEventData): void;

    // 渲染回调
    onBeginRender(camera: Camera): void;
    onEndRender(camera: Camera): void;
}
```

## 3. Scene管理系统

### 3.1 Scene类

`Scene`类是场景管理的核心，负责实体管理、渲染设置和物理场景。

#### 核心特性：
- **根实体管理**：管理场景的根实体列表
- **渲染设置**：背景、光照、雾效、阴影等
- **物理场景**：集成物理模拟
- **着色器数据**：管理场景级别的着色器变量

#### 关键属性：
```typescript
class Scene {
    // 基本属性
    name: string;
    isActive: boolean;

    // 根实体
    rootEntitiesCount: number;
    rootEntities: Readonly<Entity[]>;

    // 渲染设置
    background: Background;
    ambientLight: AmbientLight;
    fogMode: FogMode;
    fogColor: Color;
    castShadows: boolean;
    shadowResolution: ShadowResolution;

    // 物理场景
    physics: PhysicsScene;

    // 后处理
    postProcessManager: PostProcessManager;

    // 着色器数据
    shaderData: ShaderData;
}
```

#### 实体管理：
```typescript
// 根实体操作
createRootEntity(name?: string): Entity
addRootEntity(entity: Entity): void
removeRootEntity(entity: Entity): void
getRootEntity(index?: number): Entity | null

// 实体查找
findEntityByName(name: string): Entity | null
findEntityByPath(path: string): Entity | null
```

### 3.2 SceneManager

`SceneManager`负责多个场景的管理和切换，提供场景的加载、卸载和激活控制。

## 4. 资源管理

### 4.1 ResourceManager

`ResourceManager`是引擎的资源管理中心，负责资源的加载、缓存和引用计数管理。

#### 核心特性：
- **异步加载**：支持单个和批量资源的异步加载
- **缓存管理**：自动缓存已加载的资源
- **引用计数**：基于引用计数的自动内存管理
- **加载器系统**：可扩展的资源加载器架构

#### 关键属性：
```typescript
class ResourceManager {
    // 加载配置
    retryCount: number;
    retryInterval: number;
    timeout: number;
    baseUrl: string | null;
}
```

#### 资源操作：
```typescript
// 资源加载
load<T>(path: string): AssetPromise<T>
load(paths: string[]): AssetPromise<Object[]>
load<T>(assetItem: LoadItem): AssetPromise<T>

// 缓存操作
getFromCache<T>(url: string): T
findResourcesByType<T>(type: new (...args) => T): T[]
getAssetPath(instanceId: number): string

// 加载控制
cancelNotLoaded(): void
gc(): void
```

### 4.2 引用计数系统

资源管理基于引用计数机制：

- **ReferResource**：可引用资源的基类
- **GraphicsResource**：图形资源的基类，支持设备丢失恢复
- **ContentRestorer**：内容恢复器，用于设备丢失后的资源恢复

## 5. UI系统接口

### 5.1 IElement接口

`IElement`接口定义了UI元素的基本规范。

```typescript
interface IElement {
    entity: Entity;
    _rootCanvas: UICanvas;
    _indexInRootCanvas: number;
    _rootCanvasListeningEntities: Entity[];
    _isRootCanvasDirty: boolean;

    _getRootCanvas(): UICanvas;
    _rootCanvasListener: (flag: number, param?: any) => void;
    _onRootCanvasModify?(flag: RootCanvasModifyFlags): void;
}
```

### 5.2 IGraphics接口

`IGraphics`接口定义了图形元素的规范，主要用于射线检测。

```typescript
interface IGraphics extends IGroupAble {
    raycastEnabled: boolean;
    raycastPadding: Vector4;

    _raycast(ray: Ray, out: UIHitResult, distance: number): boolean;
}
```

## 6. 物理系统接口

### 6.1 PhysicsScene

`PhysicsScene`类提供物理模拟的核心功能，包括碰撞检测、射线检测和形状查询。

#### 核心特性：
- **物理模拟**：固定时间步长的物理更新
- **碰撞检测**：支持触发器和碰撞器
- **射线检测**：raycast、boxCast、sphereCast、capsuleCast
- **形状查询**：overlapBoxAll、overlapSphereAll、overlapCapsuleAll

#### 关键属性：
```typescript
class PhysicsScene {
    gravity: Vector3;
    fixedTimeStep: number;
}
```

#### 检测方法：
```typescript
// 射线检测
raycast(ray: Ray, distance?: number, layerMask?: Layer, outHitResult?: HitResult): boolean

// 形状投射
boxCast(center: Vector3, halfExtents: Vector3, direction: Vector3, ...): boolean
sphereCast(center: Vector3, radius: number, direction: Vector3, ...): boolean
capsuleCast(center: Vector3, radius: number, height: number, direction: Vector3, ...): boolean

// 重叠检测
overlapBoxAll(center: Vector3, halfExtents: Vector3, ...): ColliderShape[]
overlapSphereAll(center: Vector3, radius: number, ...): ColliderShape[]
overlapCapsuleAll(center: Vector3, radius: number, height: number, ...): ColliderShape[]
```

### 6.2 碰撞器系统

物理系统包含多种碰撞器类型：

- **Collider**：碰撞器基类
- **StaticCollider**：静态碰撞器
- **DynamicCollider**：动态碰撞器
- **CharacterController**：角色控制器
- **ColliderShape**：碰撞形状（Box、Sphere、Capsule、Plane等）

## 7. 设计原则

### 7.1 组件化设计
- 每个组件专注于单一职责
- 组件之间通过Entity进行通信
- 支持组件的动态添加和移除

### 7.2 性能优化
- 脏标记系统避免不必要的计算
- 引用计数管理内存生命周期
- 批量操作减少函数调用开销

### 7.3 扩展性
- 基于接口的设计支持多种实现
- 插件式的加载器系统
- 事件驱动的架构支持自定义扩展

### 7.4 一致性
- 统一的组件生命周期管理
- 一致的命名约定和API设计
- 标准化的错误处理机制

这个ECS架构为Galacean Engine提供了灵活、高效、可扩展的基础框架，支持复杂的3D应用开发需求。