---
id: "examples-troubleshooting"
type: "reference"
title: "Galacean Engine 问题排查指南"
description: "收集了开发过程中的常见问题、错误和解决方案，帮助开发者快速定位和解决渲染、性能、资源、物理和音频等问题"
tags: ["examples", "troubleshooting", "debugging", "diagnostics", "errors", "solutions"]
context_dependency: ["architecture-overview", "performance-patterns"]
related_ids: ["anti-patterns", "performance-patterns", "migration-guide"]
---

本文档收集了 Galacean Engine 开发过程中的常见问题、错误和解决方案，帮助开发者快速定位和解决问题。

## 1. 渲染问题

### 1.1 模型不显示

**症状**: 加载的模型在场景中不可见

**可能原因**:
```typescript
// ❌ 常见错误：忘记添加 MeshRenderer
const entity = new Entity(scene);
const meshFilter = entity.addComponent(MeshFilter);
meshFilter.mesh = loadedMesh;
// 缺少 MeshRenderer，模型不会显示

// ✅ 正确做法：添加 MeshRenderer
const entity = new Entity(scene);
const meshFilter = entity.addComponent(MeshFilter);
meshFilter.mesh = loadedMesh;
const meshRenderer = entity.addComponent(MeshRenderer);
meshRenderer.material = material;
```

**调试步骤**:
```typescript
// 1. 检查实体是否激活
console.log("Entity active:", entity.isActive);
console.log("Entity in scene:", entity.scene === scene);

// 2. 检查组件是否正确添加
const meshFilter = entity.getComponent(MeshFilter);
const meshRenderer = entity.getComponent(MeshRenderer);
console.log("Has MeshFilter:", !!meshFilter);
console.log("Has MeshRenderer:", !!meshRenderer);
console.log("Material:", meshRenderer?.material);

// 3. 检查相机设置
const camera = scene.activeCamera;
console.log("Camera exists:", !!camera);
console.log("Camera frustum:", camera?.fieldOfView, camera?.nearClipPlane, camera?.farClipPlane);
```

### 1.2 纹理显示异常

**症状**: 纹理显示为黑色、紫色或不正确

**可能原因及解决方案**:
```typescript
// ❌ 错误：路径错误或资源未正确加载
const texture = await engine.resourceManager.load<Texture2D>("wrong/path.jpg");

// ✅ 正确：检查资源路径和加载状态
async function loadTextureSafely(engine: Engine, path: string): Promise<Texture2D | null> {
  try {
    const texture = await engine.resourceManager.load<Texture2D>(path);
    if (!texture) {
      console.error(`Texture not found: ${path}`);
      return null;
    }

    // 检查纹理是否正确加载
    console.log(`Texture loaded: ${path}, size: ${texture.width}x${texture.height}`);
    return texture;
  } catch (error) {
    console.error(`Failed to load texture ${path}:`, error);

    // 返回默认纹理
    const defaultTexture = new Texture2D(engine, 1, 1);
    defaultTexture.setPixelData(new Uint8Array([255, 0, 255, 255])); // 紫色
    return defaultTexture;
  }
}

// 使用示例
const texture = await loadTextureSafely(engine, "textures/diffuse.jpg");
if (texture) {
  material.setTexture("mainTexture", texture);
}
```

### 1.3 透明渲染问题

**症状**: 透明物体渲染顺序错误，显示不正常

**解决方案**:
```typescript
// ✅ 正确设置透明材质
const transparentMaterial = new Material(engine, shader);
transparentMaterial.isTransparent = true;
transparentMaterial.renderQueueType = RenderQueueType.Transparent;

// 设置混合模式
transparentMaterial.setBlendMode(BlendMode.Alpha);

// 设置深度写入
transparentMaterial.depthWrite = false;

// ✅ 确保透明物体在正确的渲染队列
class TransparentRenderer extends Script {
  onUpdate() {
    // 获取所有透明渲染器
    const transparentRenderers = this.scene.findComponents(MeshRenderer)
      .filter(renderer => renderer.material.isTransparent);

    // 按距离相机远到近排序
    const cameraPos = this.scene.activeCamera.entity.transform.position;
    transparentRenderers.sort((a, b) => {
      const distA = Vector3.distance(a.entity.transform.position, cameraPos);
      const distB = Vector3.distance(b.entity.transform.position, cameraPos);
      return distB - distA; // 远到近
    });

    // 设置渲染顺序
    transparentRenderers.forEach((renderer, index) => {
      renderer.renderOrder = index;
    });
  }
}
```

## 2. 性能问题

### 2.1 帧率过低

**症状**: 应用运行缓慢，FPS低于预期

**诊断工具**:
```typescript
// 性能监控器
class PerformanceMonitor extends Script {
  private _frameCount: number = 0;
  private _lastTime: number = 0;
  private _fps: number = 0;

  onUpdate() {
    this._frameCount++;
    const currentTime = performance.now();

    if (currentTime - this._lastTime >= 1000) {
      this._fps = this._frameCount;
      this._frameCount = 0;
      this._lastTime = currentTime;

      console.log(`FPS: ${this._fps}`);

      // 检查性能瓶颈
      if (this._fps < 30) {
        this.analyzePerformance();
      }
    }
  }

  private analyzePerformance() {
    console.log("=== Performance Analysis ===");

    // 检查Draw Call数量
    const renderer = this.engine.renderer;
    console.log(`Draw Calls: ${renderer.drawCalls}`);
    console.log(`Triangles: ${renderer.triangles}`);

    // 检查实体数量
    const entityCount = this.scene.rootEntities.reduce((count, entity) => {
      return count + this.countEntities(entity);
    }, 0);
    console.log(`Total Entities: ${entityCount}`);

    // 检查内存使用
    if (performance.memory) {
      console.log(`Memory: ${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  private countEntities(entity: Entity): number {
    let count = 1;
    for (const child of entity.children) {
      count += this.countEntities(child);
    }
    return count;
  }
}
```

**常见优化策略**:
```typescript
// 1. 检查是否有过多的Draw Call
if (renderer.drawCalls > 1000) {
  console.warn("Too many draw calls! Consider using instancing or mesh combining.");
}

// 2. 检查是否有过多的实体
if (entityCount > 10000) {
  console.warn("Too many entities! Consider object pooling or LOD.");
}

// 3. 检查渲染状态
const stats = renderer.renderStats;
console.log("Render Stats:", {
  drawCalls: stats.drawCalls,
  triangles: stats.triangles,
  lines: stats.lines,
  points: stats.points
});
```

### 2.2 内存泄漏

**症状**: 内存使用持续增长，最终导致崩溃

**检测方法**:
```typescript
class MemoryLeakDetector {
  private _snapshots: MemorySnapshot[] = [];

  takeSnapshot(label: string): void {
    const snapshot: MemorySnapshot = {
      label,
      timestamp: Date.now(),
      entities: this.countEntities(),
      components: this.countComponents(),
      textures: this.countTextures(),
      meshes: this.countMeshes()
    };

    this._snapshots.push(snapshot);

    // 保留最近10个快照
    if (this._snapshots.length > 10) {
      this._snapshots.shift();
    }

    this.analyzeLeaks();
  }

  private analyzeLeaks(): void {
    if (this._snapshots.length < 2) return;

    const current = this._snapshots[this._snapshots.length - 1];
    const previous = this._snapshots[this._snapshots.length - 2];

    const entityGrowth = current.entities - previous.entities;
    const componentGrowth = current.components - previous.components;

    if (entityGrowth > 100) {
      console.warn(`Entity count increased by ${entityGrowth} in snapshot "${current.label}"`);
    }

    if (componentGrowth > 200) {
      console.warn(`Component count increased by ${componentGrowth} in snapshot "${current.label}"`);
    }

    // 检查是否有对象未正确释放
    this.checkOrphanedObjects();
  }

  private checkOrphanedObjects(): void {
    // 检查是否有组件的entity为null（可能未正确移除）
    const allComponents = this.getAllComponents();
    const orphanedComponents = allComponents.filter(comp => !comp.entity);

    if (orphanedComponents.length > 0) {
      console.warn(`Found ${orphanedComponents.length} orphaned components`);
    }
  }
}

// 定期检查
const detector = new MemoryLeakDetector();
setInterval(() => {
  detector.takeSnapshot("periodic");
}, 30000); // 每30秒检查一次
```

## 3. 资源加载问题

### 3.1 资源加载失败

**症状**: 资源加载失败或返回null

**健壮的加载实现**:
```typescript
class RobustAssetLoader {
  private _retryConfig = {
    maxRetries: 3,
    retryDelay: 1000
  };

  async loadAssetWithRetry<T>(
    path: string,
    type: new (...args: any[]) => T
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this._retryConfig.maxRetries; attempt++) {
      try {
        const asset = await this.engine.resourceManager.load<T>(path);

        if (!asset) {
          throw new Error(`Asset not found: ${path}`);
        }

        console.log(`Successfully loaded: ${path} (attempt ${attempt + 1})`);
        return asset;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Load failed (attempt ${attempt + 1}): ${path}`, error);

        if (attempt < this._retryConfig.maxRetries) {
          await this.delay(this._retryConfig.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    // 所有重试都失败了
    throw lastError || new Error(`Failed to load asset: ${path}`);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 预加载关键资源
  async preloadCriticalAssets(assetList: string[]): Promise<void> {
    console.log(`Preloading ${assetList.length} assets...`);

    const loadPromises = assetList.map(async (path, index) => {
      try {
        await this.loadAssetWithRetry(path);
        console.log(`✓ ${index + 1}/${assetList.length}: ${path}`);
      } catch (error) {
        console.error(`✗ Failed to load: ${path}`, error);
      }
    });

    await Promise.all(loadPromises);
    console.log("Preloading completed");
  }
}

// 使用示例
const loader = new RobustAssetLoader();
try {
  const model = await loader.loadAssetWithRetry<Model>("models/character.glb");
  // 使用模型...
} catch (error) {
  console.error("Failed to load character model:", error);
  // 使用备用模型或显示错误提示
}
```

### 3.2 加载进度跟踪

```typescript
// 加载进度管理器
class LoadingProgressManager {
  private _totalAssets: number = 0;
  private _loadedAssets: number = 0;
  private _progressCallbacks: ((progress: number) => void)[] = [];

  registerAsset(): number {
    const assetId = this._totalAssets++;
    return assetId;
  }

  markAssetLoaded(assetId: number): void {
    this._loadedAssets++;
    this.notifyProgress();
  }

  onProgress(callback: (progress: number) => void): void {
    this._progressCallbacks.push(callback);
  }

  private notifyProgress(): void {
    const progress = this._loadedAssets / this._totalAssets;
    this._progressCallbacks.forEach(callback => callback(progress));
  }
}

// 使用示例
class SceneLoader {
  private _progressManager = new LoadingProgressManager();

  async loadScene(sceneConfig: SceneConfig): Promise<void> {
    // 注册所有需要加载的资源
    const assetIds = sceneConfig.assets.map(asset =>
      this._progressManager.registerAsset()
    );

    this._progressManager.onProgress((progress) => {
      console.log(`Loading: ${(progress * 100).toFixed(1)}%`);
      // 更新UI进度条
      this.updateLoadingUI(progress);
    });

    // 并行加载资源
    const loadPromises = sceneConfig.assets.map(async (asset, index) => {
      try {
        const loadedAsset = await this.engine.resourceManager.load(asset.path);
        this._progressManager.markAssetLoaded(assetIds[index]);
        return loadedAsset;
      } catch (error) {
        console.error(`Failed to load ${asset.path}:`, error);
        this._progressManager.markAssetLoaded(assetIds[index]); // 也要标记为完成
        return null;
      }
    });

    const assets = await Promise.all(loadPromises);
    this.buildScene(assets.filter(asset => asset !== null));
  }

  private updateLoadingUI(progress: number): void {
    const loadingBar = document.getElementById("loading-bar");
    if (loadingBar) {
      loadingBar.style.width = `${progress * 100}%`;
    }
  }
}
```

## 4. 物理问题

### 4.1 物理碰撞失效

**症状**: 物理对象不碰撞或穿透

**检查清单**:
```typescript
function debugPhysicsCollision(entityA: Entity, entityB: Entity): void {
  const colliderA = entityA.getComponent(Collider);
  const colliderB = entityB.getComponent(Collider);

  console.log("=== Physics Debug ===");

  // 检查碰撞器
  if (!colliderA) console.error("Entity A missing Collider");
  if (!colliderB) console.error("Entity B missing Collider");

  // 检查刚体
  const rigidBodyA = entityA.getComponent(RigidBody);
  const rigidBodyB = entityB.getComponent(RigidBody);

  if (!rigidBodyA) console.warn("Entity A missing RigidBody (may be static)");
  if (!rigidBodyB) console.warn("Entity B missing RigidBody (may be static)");

  // 检查碰撞层
  if (colliderA && colliderB) {
    console.log("Layer A:", colliderA.layer);
    console.log("Layer B:", colliderB.layer);

    const canCollide = (colliderA.layer & colliderB.layer) !== 0;
    console.log("Can collide:", canCollide);

    if (!canCollide) {
      console.error("Collision layers do not match!");
    }
  }

  // 检查变换
  console.log("Position A:", entityA.transform.position);
  console.log("Position B:", entityB.transform.position);

  const distance = Vector3.distance(
    entityA.transform.position,
    entityB.transform.position
  );
  console.log("Distance:", distance);

  // 可视化碰撞体
  this.visualizeCollider(colliderA);
  this.visualizeCollider(colliderB);
}

// 碰撞体可视化
function visualizeCollider(collider: Collider): void {
  // 创建线框渲染器来显示碰撞体边界
  const helper = new ColliderHelper(collider);
  helper.show();
}
```

### 4.2 性能问题

```typescript
// 物理性能分析
class PhysicsProfiler extends Script {
  private _physicsTime: number = 0;
  private _collisionCount: number = 0;

  onUpdate(): void {
    const startTime = performance.now();

    // 物理更新在这里执行
    this.physicsWorld.simulate(this.engine.time.deltaTime);

    this._physicsTime = performance.now() - startTime;
    this._collisionCount = this.physicsWorld.collisionCount;

    // 检测性能问题
    if (this._physicsTime > 16.67) { // 超过一帧时间
      console.warn(`Physics simulation took ${this._physicsTime.toFixed(2)}ms`);
      this.suggestOptimizations();
    }
  }

  private suggestOptimizations(): void {
    console.log("=== Physics Optimization Suggestions ===");

    // 检查碰撞体数量
    const colliderCount = this.scene.findComponents(Collider).length;
    if (colliderCount > 1000) {
      console.log("Too many colliders. Consider:");
      console.log("- Using simplified collision shapes");
      console.log("- Implementing spatial partitioning");
      console.log("- Disabling physics for distant objects");
    }

    // 检查碰撞检测频率
    if (this._collisionCount > 1000) {
      console.log("Too many collisions. Consider:");
      console.log("- Using collision layers");
      console.log("- Optimizing broad phase collision");
      console.log("- Reducing object count in collision zones");
    }

    // 检查物理步骤设置
    const physicsSettings = this.physicsWorld.settings;
    if (physicsSettings.velocityIterations > 10) {
      console.log("High velocity iterations. Consider reducing for better performance.");
    }
  }
}
```

## 5. 音频问题

### 5.1 音频播放失败

```typescript
class RobustAudioPlayer {
  private _audioEngine: AudioEngine;

  async playSoundSafely(soundPath: string, options: AudioPlayOptions = {}): Promise<boolean> {
    try {
      // 检查音频引擎状态
      if (!this._audioEngine.isInitialized) {
        await this._audioEngine.initialize();
      }

      // 检查用户交互
      if (!this._audioEngine.canPlay) {
        console.warn("Audio playback requires user interaction");
        return false;
      }

      // 加载音频
      const audioClip = await this.loadAudioClip(soundPath);
      if (!audioClip) {
        return false;
      }

      // 播放音频
      const source = this._audioEngine.play(audioClip, options);

      // 监听播放状态
      source.onEnded = () => {
        console.log(`Audio finished: ${soundPath}`);
      };

      source.onError = (error) => {
        console.error(`Audio playback error: ${soundPath}`, error);
      };

      return true;
    } catch (error) {
      console.error(`Failed to play audio: ${soundPath}`, error);
      return false;
    }
  }

  private async loadAudioClip(path: string): Promise<AudioClip | null> {
    try {
      return await this.engine.resourceManager.load<AudioClip>(path);
    } catch (error) {
      console.error(`Failed to load audio clip: ${path}`, error);

      // 尝试加载备用音频
      const fallbackPath = this.getFallbackAudioPath(path);
      if (fallbackPath) {
        console.log(`Trying fallback audio: ${fallbackPath}`);
        return await this.engine.resourceManager.load<AudioClip>(fallbackPath);
      }

      return null;
    }
  }

  private getFallbackAudioPath(originalPath: string): string | null {
    // 实现音频备用路径逻辑
    return null;
  }
}
```

## 6. 调试工具和技巧

### 6.1 可视化调试

```typescript
// 调试渲染器
class DebugRenderer {
  private _debugLines: DebugLine[] = [];
  private _debugSpheres: DebugSphere[] = [];

  drawLine(start: Vector3, end: Vector3, color: Color = Color.red): void {
    const line = new DebugLine(start, end, color);
    this._debugLines.push(line);
  }

  drawSphere(center: Vector3, radius: number, color: Color = Color.green): void {
    const sphere = new DebugSphere(center, radius, color);
    this._debugSpheres.push(sphere);
  }

  drawBounds(bounds: BoundingBox, color: Color = Color.blue): void {
    const min = bounds.min;
    const max = bounds.max;

    // 绘制包围盒的8条边
    this.drawLine(new Vector3(min.x, min.y, min.z), new Vector3(max.x, min.y, min.z), color);
    this.drawLine(new Vector3(max.x, min.y, min.z), new Vector3(max.x, max.y, min.z), color);
    this.drawLine(new Vector3(max.x, max.y, min.z), new Vector3(min.x, max.y, min.z), color);
    this.drawLine(new Vector3(min.x, max.y, min.z), new Vector3(min.x, min.y, min.z), color);

    this.drawLine(new Vector3(min.x, min.y, max.z), new Vector3(max.x, min.y, max.z), color);
    this.drawLine(new Vector3(max.x, min.y, max.z), new Vector3(max.x, max.y, max.z), color);
    this.drawLine(new Vector3(max.x, max.y, max.z), new Vector3(min.x, max.y, max.z), color);
    this.drawLine(new Vector3(min.x, max.y, max.z), new Vector3(min.x, min.y, max.z), color);

    this.drawLine(new Vector3(min.x, min.y, min.z), new Vector3(min.x, min.y, max.z), color);
    this.drawLine(new Vector3(max.x, min.y, min.z), new Vector3(max.x, min.y, max.z), color);
    this.drawLine(new Vector3(max.x, max.y, min.z), new Vector3(max.x, max.y, max.z), color);
    this.drawLine(new Vector3(min.x, max.y, min.z), new Vector3(min.x, max.y, max.z), color);
  }

  render(): void {
    // 渲染所有调试图形
    for (const line of this._debugLines) {
      this.renderLine(line);
    }

    for (const sphere of this._debugSpheres) {
      this.renderSphere(sphere);
    }

    // 清除旧的调试数据
    this._debugLines.length = 0;
    this._debugSpheres.length = 0;
  }
}

// 使用示例
const debugRenderer = new DebugRenderer();

// 调试场景边界
const sceneBounds = this.scene.calculateBounds();
debugRenderer.drawBounds(sceneBounds, Color.yellow);

// 调试实体位置
entities.forEach(entity => {
  debugRenderer.drawSphere(entity.transform.position, 0.5, Color.red);
});
```

### 6.2 日志系统

```typescript
// 增强的日志系统
class Logger {
  private static _logLevel: LogLevel = LogLevel.Info;
  private static _categories: Set<string> = new Set();

  static setLogLevel(level: LogLevel): void {
    this._logLevel = level;
  }

  static enableCategory(category: string): void {
    this._categories.add(category);
  }

  static info(category: string, message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.Info)) {
      console.log(`[${this.getTimeStamp()}] [INFO] [${category}] ${message}`, ...args);
    }
  }

  static warn(category: string, message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.Warn)) {
      console.warn(`[${this.getTimeStamp()}] [WARN] [${category}] ${message}`, ...args);
    }
  }

  static error(category: string, message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.Error)) {
      console.error(`[${this.getTimeStamp()}] [ERROR] [${category}] ${message}`, ...args);

      // 错误时堆栈跟踪
      if (args.length === 0) {
        console.trace();
      }
    }
  }

  private static shouldLog(level: LogLevel): boolean {
    return level >= this._logLevel;
  }

  private static getTimeStamp(): string {
    return new Date().toISOString();
  }
}

// 使用示例
Logger.enableCategory("Rendering");
Logger.enableCategory("Physics");

Logger.info("Rendering", "Scene rendered successfully");
Logger.warn("Physics", "Collision detected at high velocity");
Logger.error("Asset", "Failed to load texture", texturePath);
```

## 总结

有效的问题排查需要：

1. **系统性诊断**: 使用工具和方法逐步排除问题
2. **日志记录**: 记录关键操作和错误信息
3. **可视化调试**: 使用图形化工具理解问题
4. **性能监控**: 持续监控性能指标
5. **错误处理**: 实现健壮的错误恢复机制

记住：**可复现的问题才能被修复**。详细记录问题出现的步骤、环境和数据，这是解决问题的第一步。

## ⚠️ 禁止事项

### 关键约束
- 🚫 **凭猜测调试**: 始终基于日志和数据进行问题定位
- 🚫 **忽略环境因素**: 检查运行环境、配置和依赖版本
- 🚫 **单一排查路径**: 同时从多个角度分析问题
- 🚫 **跳过最小复现**: 不要直接修改大量代码，先构造最小复现案例

### 常见错误
- ❌ 不记录复现步骤，导致问题无法重现
- ❌ 只在生产环境调试，没有开发环境验证
- ❌ 忽略控制台警告和错误信息
- ❌ 同时修改多处代码，导致无法定位真正原因
- ❌ 不检查第三方库和依赖的版本兼容性

### 最佳实践提醒
- ✅ 建立系统性的调试流程和检查清单
- ✅ 使用调试工具和日志系统收集详细信息
- ✅ 构造最小可复现案例验证问题假设
- ✅ 记录所有发现的问题根因和解决方案
- ✅ 建立预防机制，避免类似问题重复发生