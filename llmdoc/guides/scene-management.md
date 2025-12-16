# 场景管理指南

场景管理是3D应用开发的核心，本文档详细介绍如何在Galacean Engine中创建、管理和切换场景。

## 目录
- [场景基础](#场景基础)
- [场景创建与销毁](#场景创建与销毁)
- [场景切换](#场景切换)
- [实体管理](#实体管理)
- [场景设置](#场景设置)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

## 场景基础

### 什么是场景

场景（Scene）是3D世界中所有游戏对象的容器，包括：
- 实体（Entity）层次结构
- 渲染设置（背景、光照、雾效）
- 物理环境
- 相机和渲染配置

### 核心概念

```typescript
import { Scene, Entity, Engine } from '@galacean/engine';

// 创建引擎实例
const engine = await Engine.init({
  canvas: document.getElementById('canvas') as HTMLCanvasElement
});

// 创建场景
const scene = new Scene(engine);
```

## 场景创建与销毁

### 1. 创建场景

#### 基本创建
```typescript
// 创建空场景
const scene = new Scene(engine);

// 命名场景
scene.name = 'MainScene';
```

#### 场景初始化
```typescript
import { Background, SkyboxMaterial, TextureCube } from '@galacean/engine';

async function createSceneWithSkybox(engine: Engine): Promise<Scene> {
  const scene = new Scene(engine);

  // 设置天空盒
  const skyMaterial = new SkyboxMaterial(engine);
  skyMaterial.texture = await engine.resourceManager.load<TextureCube>('skybox.env');

  scene.background = new Background();
  scene.background.mode = BackgroundMode.Skybox;
  scene.background.skyboxMaterial = skyMaterial;

  return scene;
}
```

### 2. 场景销毁

```typescript
// 销毁场景和所有资源
function destroyScene(scene: Scene): void {
  // 销毁所有根实体
  while (scene.rootEntitiesCount > 0) {
    const rootEntity = scene.getRootEntity(0);
    scene.removeRootEntity(rootEntity);
    rootEntity.destroy();
  }

  // 销毁场景
  scene.destroy();
}
```

## 场景切换

### 1. 简单场景切换

```typescript
class SceneManager {
  private currentScene: Scene | null = null;
  private engine: Engine;

  constructor(engine: Engine) {
    this.engine = engine;
  }

  async loadScene(sceneName: string): Promise<void> {
    // 卸载当前场景
    if (this.currentScene) {
      this.destroyCurrentScene();
    }

    // 加载新场景
    switch (sceneName) {
      case 'main':
        this.currentScene = await createMainScene(this.engine);
        break;
      case 'menu':
        this.currentScene = await createMenuScene(this.engine);
        break;
      default:
        throw new Error(`Unknown scene: ${sceneName}`);
    }

    // 设置活动场景
    this.engine.sceneManager.activeScene = this.currentScene;
  }

  private destroyCurrentScene(): void {
    if (this.currentScene) {
      this.currentScene.destroy();
      this.currentScene = null;
    }
  }
}
```

### 2. 带进度条的异步加载

```typescript
async function loadSceneWithProgress(
  engine: Engine,
  sceneData: SceneData,
  onProgress: (progress: number) => void
): Promise<Scene> {
  const scene = new Scene(engine);

  // 模拟资源加载进度
  const totalAssets = sceneData.assets.length;
  let loadedAssets = 0;

  // 并行加载资源
  const loadPromises = sceneData.assets.map(async (asset) => {
    const resource = await engine.resourceManager.load(asset.path);
    loadedAssets++;
    onProgress(loadedAssets / totalAssets);
    return { resource, id: asset.id };
  });

  const loadedResources = await Promise.all(loadPromises);

  // 创建场景对象
  await createSceneObjects(scene, sceneData, loadedResources);

  return scene;
}

// 使用示例
const loadingManager = new SceneManager(engine);

loadingManager.loadSceneWithProgress('gameScene', (progress) => {
  updateProgressBar(progress);
}).then((scene) => {
  engine.sceneManager.activeScene = scene;
  hideLoadingScreen();
});
```

### 3. 场景过渡效果

```typescript
class SceneTransition {
  private fadeCanvas: HTMLCanvasElement;
  private fadeCtx: CanvasRenderingContext2D;

  constructor() {
    this.fadeCanvas = document.createElement('canvas');
    this.fadeCanvas.width = window.innerWidth;
    this.fadeCanvas.height = window.innerHeight;
    this.fadeCtx = this.fadeCanvas.getContext('2d')!;
    document.body.appendChild(this.fadeCanvas);
  }

  async fadeOut(duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      let opacity = 0;
      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        opacity = Math.min(elapsed / duration, 1);

        this.fadeCtx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        this.fadeCtx.fillRect(0, 0, this.fadeCanvas.width, this.fadeCanvas.height);

        if (opacity < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  async fadeIn(duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      let opacity = 1;
      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        opacity = Math.max(1 - elapsed / duration, 0);

        this.fadeCtx.clearRect(0, 0, this.fadeCanvas.width, this.fadeCanvas.height);

        if (opacity > 0) {
          this.fadeCtx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
          this.fadeCtx.fillRect(0, 0, this.fadeCanvas.width, this.fadeCanvas.height);
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  destroy(): void {
    document.body.removeChild(this.fadeCanvas);
  }
}

// 使用过渡效果切换场景
const transition = new SceneTransition();

await transition.fadeOut();
await loadNewScene();
await transition.fadeIn();
transition.destroy();
```

## 实体管理

### 1. 根实体管理

```typescript
// 创建根实体
const rootEntity = scene.createRootEntity('Root');
const childEntity = rootEntity.createChild('Child');

// 手动添加根实体
const customEntity = new Entity(engine, 'Custom');
scene.addRootEntity(customEntity);

// 移除根实体
scene.removeRootEntity(rootEntity);

// 获取根实体
const firstRoot = scene.getRootEntity(0);
const allRoots = scene.rootEntities;
```

### 2. 实体查找

```typescript
// 按名称查找（全局搜索）
const entity = scene.findEntityByName('Player');

// 按路径查找
const child = scene.findEntityByPath('Root/Child/Grandchild');

// 递归查找所有匹配的实体
function findAllByName(scene: Scene, name: string): Entity[] {
  const results: Entity[] = [];

  function search(entity: Entity) {
    if (entity.name === name) {
      results.push(entity);
    }

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

### 3. 实体批量操作

```typescript
// 批量创建实体
function createEntityGrid(scene: Scene, rows: number, cols: number, spacing: number): Entity[] {
  const entities: Entity[] = [];
  const root = scene.createRootEntity('Grid');

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const entity = root.createChild(`Grid_${row}_${col}`);
      entity.transform.position.set(
        col * spacing,
        0,
        row * spacing
      );
      entities.push(entity);
    }
  }

  return entities;
}

// 批量销毁实体
function destroyEntities(entities: Entity[]): void {
  // 先从父节点移除
  entities.forEach(entity => {
    if (entity.parent) {
      entity.parent.removeChild(entity);
    }
  });

  // 再销毁
  entities.forEach(entity => entity.destroy());
}
```

## 场景设置

### 1. 背景设置

```typescript
import { Background, BackgroundMode, Color, SkyboxMaterial } from '@galacean/engine';

// 纯色背景
scene.background.mode = BackgroundMode.SolidColor;
scene.background.color = new Color(0.2, 0.3, 0.5, 1.0);

// 天空盒背景
async function setupSkybox(scene: Scene, envTexturePath: string): Promise<void> {
  const skyMaterial = new SkyboxMaterial(engine);
  skyMaterial.texture = await engine.resourceManager.load<TextureCube>(envTexturePath);
  skyMaterial.rotation = 0;
  skyMaterial.tint = new Color(1, 1, 1, 1);

  scene.background.mode = BackgroundMode.Skybox;
  scene.background.skyboxMaterial = skyMaterial;
}
```

### 2. 环境光设置

```typescript
import { AmbientLight, Color } from '@galacean/engine';

// 设置环境光
scene.ambientLight.diffuse = new Color(0.3, 0.3, 0.3, 1.0);
scene.ambientLight.diffuseIntensity = 0.5;
scene.ambientLight.specularIntensity = 0.2;

// 环境光探针
async function setupEnvironmentLighting(scene: Scene, envPath: string): Promise<void> {
  const envTexture = await engine.resourceManager.load<TextureCube>(envPath);
  scene.ambientLight.diffuseCubeMap = envTexture;
  scene.ambientLight.specularCubeMap = envTexture;
}
```

### 3. 雾效设置

```typescript
import { FogMode, Color } from '@galacean/engine';

// 线性雾
scene.fogMode = FogMode.Linear;
scene.fogColor = new Color(0.7, 0.8, 0.9, 1.0);
scene.fogStart = 10;
scene.fogEnd = 100;

// 指数雾
scene.fogMode = FogMode.Exponential;
scene.fogDensity = 0.02;

// 指数平方雾
scene.fogMode = FogMode.ExponentialSquared;
scene.fogDensity = 0.01;
```

### 4. 阴影设置

```typescript
import { ShadowResolution } from '@galacean/engine';

// 启用场景阴影
scene.castShadows = true;
scene.shadowResolution = ShadowResolution.Medium;

// 阴影质量设置
scene.shadowResolution = ShadowResolution.Low;    // 512x512
scene.shadowResolution = ShadowResolution.Medium; // 1024x1024
scene.shadowResolution = ShadowResolution.High;   // 2048x2048
scene.shadowResolution = ShadowResolution.VeryHigh; // 4096x4096
```

## 最佳实践

### 1. 场景组织

```typescript
// 使用场景管理器统一管理
class GameSceneManager {
  private scenes: Map<string, Scene> = new Map();
  private engine: Engine;

  constructor(engine: Engine) {
    this.engine = engine;
  }

  // 预加载场景
  async preloadScenes(sceneNames: string[]): Promise<void> {
    const promises = sceneNames.map(async (name) => {
      const scene = await this.createScene(name);
      this.scenes.set(name, scene);
    });

    await Promise.all(promises);
  }

  // 切换到预加载的场景
  switchToScene(name: string): void {
    const scene = this.scenes.get(name);
    if (scene) {
      this.engine.sceneManager.activeScene = scene;
    }
  }
}
```

### 2. 资源管理

```typescript
// 场景资源管理
class SceneResourceTracker {
  private scene: Scene;
  private resources: ReferResource[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  trackResource(resource: ReferResource): void {
    this.resources.push(resource);
  }

  cleanup(): void {
    // 释放资源引用
    this.resources.forEach(resource => {
      if (resource.referenceCount === 0) {
        resource.destroy();
      }
    });
    this.resources.length = 0;
  }
}
```

### 3. 性能优化

```typescript
// 使用对象池管理实体
class EntityPool {
  private pool: Entity[] = [];
  private engine: Engine;

  constructor(engine: Engine) {
    this.engine = engine;
  }

  acquire(): Entity {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return new Entity(this.engine);
  }

  release(entity: Entity): void {
    // 重置实体状态
    entity.parent = null;
    entity.transform.position.set(0, 0, 0);
    entity.transform.rotation.set(0, 0, 0);
    entity.transform.scale.set(1, 1, 1);

    this.pool.push(entity);
  }
}
```

## 常见问题

### Q1: 场景切换时内存泄漏怎么办？

**A:** 确保正确清理所有资源：
```typescript
function cleanupScene(scene: Scene): void {
  // 1. 停止所有动画
  scene.findComponents(Animator).forEach(animator => {
    animator.stop();
  });

  // 2. 销毁所有实体
  const entities = [];
  for (let i = 0; i < scene.rootEntitiesCount; i++) {
    entities.push(scene.getRootEntity(i)!);
  }

  entities.forEach(entity => {
    scene.removeRootEntity(entity);
    entity.destroy();
  });

  // 3. 执行垃圾回收
  engine.resourceManager.gc();
}
```

### Q2: 如何在场景间传递数据？

**A:** 使用全局数据管理器：
```typescript
class SceneDataStore {
  private data: Map<string, any> = new Map();

  set(key: string, value: any): void {
    this.data.set(key, value);
  }

  get<T>(key: string): T | undefined {
    return this.data.get(key);
  }

  clear(): void {
    this.data.clear();
  }
}

// 全局实例
const globalData = new SceneDataStore();

// 在场景A中保存数据
globalData.set('playerScore', 1000);

// 在场景B中读取数据
const score = globalData.get<number>('playerScore');
```

### Q3: 如何实现场景的异步加载？

**A:** 使用Promise和加载状态管理：
```typescript
interface SceneLoadTask {
  name: string;
  loader: () => Promise<Scene>;
  onProgress?: (progress: number) => void;
}

class AsyncSceneLoader {
  private engine: Engine;
  private loadingQueue: SceneLoadTask[] = [];
  private isLoading = false;

  constructor(engine: Engine) {
    this.engine = engine;
  }

  async loadScene(task: SceneLoadTask): Promise<Scene> {
    if (this.isLoading) {
      this.loadingQueue.push(task);
      return Promise.reject(new Error('Another scene is loading'));
    }

    this.isLoading = true;

    try {
      const scene = await task.loader();
      this.engine.sceneManager.activeScene = scene;
      return scene;
    } finally {
      this.isLoading = false;

      // 处理队列中的下一个任务
      if (this.loadingQueue.length > 0) {
        const nextTask = this.loadingQueue.shift()!;
        this.loadScene(nextTask);
      }
    }
  }
}
```

### Q4: 场景太大导致加载缓慢怎么办？

**A:** 实现场景分块和流式加载：
```typescript
class StreamingSceneManager {
  private engine: Engine;
  private loadedChunks: Map<string, Entity> = new Map();

  constructor(engine: Engine) {
    this.engine = engine;
  }

  async loadChunk(chunkName: string, position: Vector3): Promise<Entity> {
    if (this.loadedChunks.has(chunkName)) {
      return this.loadedChunks.get(chunkName)!;
    }

    // 异步加载场景块
    const chunkData = await this.loadChunkData(chunkName);
    const chunkEntity = await this.createChunkEntity(chunkData);

    chunkEntity.transform.position = position;
    scene.addRootEntity(chunkEntity);

    this.loadedChunks.set(chunkName, chunkEntity);
    return chunkEntity;
  }

  unloadChunk(chunkName: string): void {
    const chunk = this.loadedChunks.get(chunkName);
    if (chunk) {
      scene.removeRootEntity(chunk);
      chunk.destroy();
      this.loadedChunks.delete(chunkName);
    }
  }
}
```

### Q5: 如何调试场景层次结构？

**A:** 添加场景调试工具：
```typescript
function debugSceneHierarchy(scene: Scene): void {
  console.group('Scene Hierarchy:', scene.name);

  function printEntity(entity: Entity, indent: string = ''): void {
    console.log(`${indent}${entity.name} (${entity.children.length} children)`);

    entity.getComponents(Component).forEach(component => {
      console.log(`${indent}  - ${component.constructor.name}`);
    });

    entity.children.forEach(child => {
      printEntity(child, indent + '  ');
    });
  }

  for (let i = 0; i < scene.rootEntitiesCount; i++) {
    printEntity(scene.getRootEntity(i)!);
  }

  console.groupEnd();
}
```

通过遵循这些指南和最佳实践，你可以有效地管理Galacean Engine中的场景，创建流畅的3D应用体验。