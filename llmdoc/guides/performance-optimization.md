# 性能优化指南

性能优化是3D应用开发的关键环节，本指南详细介绍Galacean Engine的性能优化策略和最佳实践，帮助开发者创建流畅、高效的3D应用。

## 目录
- [性能分析](#性能分析)
- [渲染优化](#渲染优化)
- [内存管理](#内存管理)
- [批处理优化](#批处理优化)
- [LOD系统](#lod系统)
- [异步加载](#异步加载)
- [物理优化](#物理优化)
- [平台特定优化](#平台特定优化)

## 性能分析

### 性能监控工具

```typescript
import { Engine, Profiler } from '@galacean/engine';

// 启用性能分析器
engine.enableProfiler = true;

// 自定义性能监控器
class PerformanceMonitor {
  private frameTimes: number[] = [];
  private maxSamples: number = 60;
  private lastTime: number = 0;

  update(): void {
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }

    // 更新统计信息
    this.updateStats();
  }

  private updateStats(): void {
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = 1000 / avgFrameTime;

    // 显示性能信息
    console.log(`FPS: ${fps.toFixed(1)}, Frame Time: ${avgFrameTime.toFixed(2)}ms`);
  }

  getPerformanceReport(): PerformanceReport {
    return {
      averageFPS: 1000 / this.getAverageFrameTime(),
      frameTimeStats: this.getFrameTimeStats(),
      memoryUsage: this.getMemoryUsage(),
      renderStats: this.getRenderStats()
    };
  }

  private getAverageFrameTime(): number {
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  private getFrameTimeStats(): FrameTimeStats {
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      percentile95: sorted[Math.floor(sorted.length * 0.95)]
    };
  }

  private getMemoryUsage(): MemoryStats {
    return {
      geometryMemory: this.getGeometryMemory(),
      textureMemory: this.getTextureMemory(),
      totalMemory: this.getTotalMemory()
    };
  }

  private getRenderStats(): RenderStats {
    return {
      drawCalls: engine.renderer.drawCalls,
      triangles: engine.renderer.triangles,
      vertices: engine.renderer.vertices,
      frameTime: this.getAverageFrameTime()
    };
  }
}
```

### 性能瓶颈检测

```typescript
class PerformanceProfiler {
  private samplePoints: Map<string, number[]> = new Map();

  startSample(name: string): void {
    if (!this.samplePoints.has(name)) {
      this.samplePoints.set(name, []);
    }
    this.samplePoints.get(name)!.push(performance.now());
  }

  endSample(name: string): void {
    const samples = this.samplePoints.get(name);
    if (samples && samples.length > 0) {
      const startTime = samples.pop()!;
      const duration = performance.now() - startTime;

      if (!this.samplePoints.has(`${name}_durations`)) {
        this.samplePoints.set(`${name}_durations`, []);
      }
      this.samplePoints.get(`${name}_durations`)!.push(duration);
    }
  }

  getSampleAverage(name: string): number {
    const durations = this.samplePoints.get(`${name}_durations`) || [];
    return durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
  }

  generateReport(): void {
    console.log('=== Performance Report ===');
    this.samplePoints.forEach((samples, name) => {
      if (name.endsWith('_durations')) {
        const baseName = name.replace('_durations', '');
        const avg = this.getSampleAverage(baseName);
        const max = Math.max(...samples);
        const min = Math.min(...samples);

        console.log(`${baseName}:`);
        console.log(`  Average: ${avg.toFixed(2)}ms`);
        console.log(`  Min: ${min.toFixed(2)}ms`);
        console.log(`  Max: ${max.toFixed(2)}ms`);
        console.log(`  Samples: ${samples.length}`);
      }
    });
  }
}

// 使用示例
const profiler = new PerformanceProfiler();

// 在关键代码段使用
function updateGameLoop(): void {
  profiler.startSample('update');

  profiler.startSample('physics');
  updatePhysics();
  profiler.endSample('physics');

  profiler.startSample('animation');
  updateAnimations();
  profiler.endSample('animation');

  profiler.startSample('render');
  renderFrame();
  profiler.endSample('render');

  profiler.endSample('update');
}
```

## 渲染优化

### 视锥剔除优化

```typescript
class OptimizedFrustumCulling {
  private frustum: Frustum;
  private cullingResults: Map<Renderer, boolean> = new Map();

  constructor(camera: Camera) {
    this.frustum = camera.frustum;
  }

  performCulling(renderers: Renderer[]): void {
    // 批量处理以提高缓存效率
    for (let i = 0; i < renderers.length; i += 4) {
      this.cullBatch(renderers, i);
    }
  }

  private cullBatch(renderers: Renderer[], startIndex: number): void {
    for (let i = 0; i < 4 && startIndex + i < renderers.length; i++) {
      const renderer = renderers[startIndex + i];
      const bounds = renderer.bounds;

      // 优化：先检查距离
      const cameraPos = this.frustum.camera.transform.position;
      const distance = Vector3.distance(cameraPos, bounds.center);

      if (distance > this.maxRenderDistance) {
        renderer.isCulled = true;
        continue;
      }

      // 详细视锥剔除
      renderer.isCulled = !this.frustum.intersects(bounds);
      this.cullingResults.set(renderer, renderer.isCulled);
    }
  }

  // 动态剔除距离调整
  private maxRenderDistance: number = 100;

  adjustCullingDistance(targetFrameTime: number): void {
    const currentFrameTime = engine.frameTime;

    if (currentFrameTime > targetFrameTime * 1.2) {
      this.maxRenderDistance *= 0.9;
    } else if (currentFrameTime < targetFrameTime * 0.8) {
      this.maxRenderDistance = Math.min(this.maxRenderDistance * 1.1, 200);
    }
  }
}
```

### 遮挡剔除

```typescript
class OcclusionCulling {
  private occlusionQueries: OcclusionQuery[] = [];
  private queryPool: OcclusionQuery[] = [];

  performOcclusionCulling(camera: Camera, renderers: Renderer[]): void {
    const potentiallyVisible = this.preFilterRenderers(camera, renderers);

    // 使用查询池管理遮挡查询
    potentiallyVisible.forEach(renderer => {
      const query = this.getQuery();
      this.performOcclusionQuery(renderer, query);
    });
  }

  private preFilterRenderers(camera: Camera, renderers: Renderer[]): Renderer[] {
    // 粗略过滤，只对可能可见的物体进行遮挡查询
    return renderers.filter(renderer => {
      const bounds = renderer.bounds;
      const screenBounds = this.projectBoundsToScreen(bounds, camera);
      return screenBounds.area > this.minScreenArea;
    });
  }

  private performOcclusionQuery(renderer: Renderer, query: OcclusionQuery): void {
    // 渲染包围盒到深度缓冲区
    query.begin();
    this.renderBounds(renderer.bounds);
    query.end();

    // 处理查询结果
    query.once('result', (visible) => {
      renderer.isCulled = !visible;
      this.returnQuery(query);
    });
  }

  private getQuery(): OcclusionQuery {
    return this.queryPool.pop() || new OcclusionQuery();
  }

  private returnQuery(query: OcclusionQuery): void {
    this.queryPool.push(query);
  }
}
```

### 渲染状态优化

```typescript
class RenderStateOptimizer {
  private renderQueue: RenderQueue = new RenderQueue();
  private materialGroups: Map<Material, Renderer[]> = new Map();

  optimizeRenderOrder(renderers: Renderer[]): void {
    // 按材质分组
    this.groupByMaterial(renderers);

    // 按深度排序透明物体
    this.sortTransparentObjects();

    // 生成优化后的渲染队列
    this.generateOptimizedQueue();
  }

  private groupByMaterial(renderers: Renderer[]): void {
    this.materialGroups.clear();

    renderers.forEach(renderer => {
      const material = renderer.material;
      if (!this.materialGroups.has(material)) {
        this.materialGroups.set(material, []);
      }
      this.materialGroups.get(material)!.push(renderer);
    });
  }

  private sortTransparentObjects(): void {
    const camera = this.getActiveCamera();

    this.materialGroups.forEach((renderers, material) => {
      if (material.isTransparent) {
        renderers.sort((a, b) => {
          const distA = Vector3.distance(camera.transform.position, a.entity.transform.position);
          const distB = Vector3.distance(camera.transform.position, b.entity.transform.position);
          return distB - distA; // 从远到近排序
        });
      }
    });
  }

  private generateOptimizedQueue(): void {
    this.renderQueue.clear();

    // 先渲染不透明物体（按材质分组）
    this.materialGroups.forEach((renderers, material) => {
      if (!material.isTransparent) {
        renderers.forEach(renderer => {
          this.renderQueue.add(renderer, material);
        });
      }
    });

    // 再渲染透明物体（按深度排序）
    this.materialGroups.forEach((renderers, material) => {
      if (material.isTransparent) {
        renderers.forEach(renderer => {
          this.renderQueue.add(renderer, material);
        });
      }
    });
  }
}
```

## 内存管理

### 对象池系统

```typescript
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) = () => {},
    maxSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  preWarm(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.createFn());
    }
  }

  clear(): void {
    this.pool.length = 0;
  }

  getStats(): PoolStats {
    return {
      available: this.pool.length,
      maxCapacity: this.maxSize,
      utilization: this.pool.length / this.maxSize
    };
  }
}

// 使用示例
const vector3Pool = new ObjectPool(
  () => new Vector3(),
  (v) => v.set(0, 0, 0),
  1000
);

// 在循环中使用
function processPositions(positions: Vector3[]): void {
  positions.forEach(pos => {
    const temp = vector3Pool.acquire();
    temp.copyFrom(pos);
    temp.normalize();
    // 处理逻辑...
    vector3Pool.release(temp);
  });
}
```

### 纹理内存管理

```typescript
class TextureManager {
  private textureCache: Map<string, Texture> = new Map();
  private referenceCounts: Map<string, number> = new Map();
  private lastUsed: Map<string, number> = new Map();

  async loadTexture(path: string): Promise<Texture> {
    if (this.textureCache.has(path)) {
      this.incrementReference(path);
      return this.textureCache.get(path)!;
    }

    const texture = await engine.resourceManager.load<Texture>(path);
    this.textureCache.set(path, texture);
    this.referenceCounts.set(path, 1);
    this.lastUsed.set(path, performance.now());

    return texture;
  }

  releaseTexture(path: string): void {
    if (!this.referenceCounts.has(path)) return;

    const count = this.referenceCounts.get(path)! - 1;
    this.referenceCounts.set(path, count);

    if (count <= 0) {
      this.unloadTexture(path);
    }
  }

  private unloadTexture(path: string): void {
    const texture = this.textureCache.get(path);
    if (texture) {
      texture.destroy();
      this.textureCache.delete(path);
      this.referenceCounts.delete(path);
      this.lastUsed.delete(path);
    }
  }

  // 定期清理未使用的纹理
  performCleanup(): void {
    const currentTime = performance.now();
    const maxAge = 60000; // 1分钟

    this.lastUsed.forEach((lastUsed, path) => {
      if (currentTime - lastUsed > maxAge) {
        const count = this.referenceCounts.get(path) || 0;
        if (count === 0) {
          this.unloadTexture(path);
        }
      }
    });
  }

  // 压缩纹理以节省内存
  async compressTexture(texture: Texture, format: TextureFormat): Promise<Texture> {
    const compressedTexture = new Texture2D(engine, texture.width, texture.height, format);

    // 执行压缩
    await this.performCompression(texture, compressedTexture);

    return compressedTexture;
  }

  getMemoryUsage(): number {
    let totalMemory = 0;
    this.textureCache.forEach(texture => {
      totalMemory += this.calculateTextureMemory(texture);
    });
    return totalMemory;
  }

  private calculateTextureMemory(texture: Texture): number {
    const bytesPerPixel = this.getBytesPerPixel(texture.format);
    return texture.width * texture.height * bytesPerPixel;
  }
}
```

### 网格内存优化

```typescript
class MeshOptimizer {
  static optimizeMesh(mesh: Mesh): Mesh {
    // 合并重复顶点
    const optimizedVertices = this.deduplicateVertices(mesh.vertices);

    // 优化索引缓冲区
    const optimizedIndices = this.optimizeIndices(optimizedVertices, mesh.indices);

    // 计算切线和副法线
    this.calculateTangents(optimizedVertices, optimizedIndices);

    // 创建优化后的网格
    const optimizedMesh = new Mesh(engine);
    optimizedMesh.setVertices(optimizedVertices);
    optimizedMesh.setIndices(optimizedIndices);

    return optimizedMesh;
  }

  private static deduplicateVertices(vertices: Float32Array): Float32Array {
    const vertexMap = new Map<string, number>();
    const deduplicated: number[] = [];
    const stride = 8; // position(3) + normal(3) + uv(2)

    for (let i = 0; i < vertices.length; i += stride) {
      const key = this.createVertexKey(vertices, i, stride);

      if (!vertexMap.has(key)) {
        vertexMap.set(key, deduplicated.length / stride);

        for (let j = 0; j < stride; j++) {
          deduplicated.push(vertices[i + j]);
        }
      }
    }

    return new Float32Array(deduplicated);
  }

  private static optimizeIndices(
    vertices: Float32Array,
    indices: Uint16Array
  ): Uint16Array {
    const vertexCache = new VertexCache();
    const optimizedIndices: number[] = [];

    for (let i = 0; i < indices.length; i += 3) {
      const tri = [indices[i], indices[i + 1], indices[i + 2]];

      // 尝试找到更优的顶点缓存顺序
      const optimizedTri = vertexCache.optimizeTriangle(tri);

      optimizedIndices.push(...optimizedTri);
    }

    return new Uint16Array(optimizedIndices);
  }
}
```

## 批处理优化

### 静态批处理

```typescript
class StaticBatcher {
  private batchedMeshes: Map<Material, BatchGroup> = new Map();

  addStaticObject(renderer: Renderer): void {
    const material = renderer.material;
    const mesh = renderer.mesh;

    if (!this.batchedMeshes.has(material)) {
      this.batchedMeshes.set(material, new BatchGroup(material));
    }

    const batch = this.batchedMeshes.get(material)!;
    batch.addMesh(mesh, renderer.entity.transform.matrix);
  }

  generateBatches(): void {
    this.batchedMeshes.forEach(batch => {
      batch.generateBatchMesh();
    });
  }
}

class BatchGroup {
  private meshes: Mesh[] = [];
  private transforms: Matrix[] = [];
  private material: Material;
  private batchMesh: Mesh | null = null;

  constructor(material: Material) {
    this.material = material;
  }

  addMesh(mesh: Mesh, transform: Matrix): void {
    this.meshes.push(mesh);
    this.transforms.push(transform);
  }

  generateBatchMesh(): void {
    if (this.meshes.length === 0) return;

    const totalVertices = this.meshes.reduce((sum, mesh) =>
      sum + mesh.vertexCount, 0);

    const totalIndices = this.meshes.reduce((sum, mesh) =>
      sum + mesh.indexCount, 0);

    const batchVertices = new Float32Array(totalVertices * 8);
    const batchIndices = new Uint16Array(totalIndices);

    let vertexOffset = 0;
    let indexOffset = 0;

    this.meshes.forEach((mesh, i) => {
      const transform = this.transforms[i];

      // 变换顶点并复制到批处理缓冲区
      this.transformAndCopyVertices(
        mesh, transform, batchVertices, vertexOffset
      );

      // 复制索引并调整偏移
      this.copyAndAdjustIndices(
        mesh, batchIndices, indexOffset, vertexOffset / 8
      );

      vertexOffset += mesh.vertexCount * 8;
      indexOffset += mesh.indexCount;
    });

    this.batchMesh = new Mesh(engine);
    this.batchMesh.setVertices(batchVertices);
    this.batchMesh.setIndices(batchIndices);
  }
}
```

### 动态批处理

```typescript
class DynamicBatcher {
  private batchSize: number = 100;
  private currentBatch: DynamicBatch;
  private material: Material;

  constructor(material: Material) {
    this.material = material;
    this.currentBatch = new DynamicBatch(this.material, this.batchSize);
  }

  addObject(transform: Matrix, color: Color): void {
    if (!this.currentBatch.canAdd()) {
      this.flushBatch();
      this.currentBatch = new DynamicBatch(this.material, this.batchSize);
    }

    this.currentBatch.add(transform, color);
  }

  flushBatch(): void {
    if (this.currentBatch.count > 0) {
      this.currentBatch.render();
    }
  }

  endFrame(): void {
    this.flushBatch();
  }
}

class DynamicBatch {
  private transforms: Matrix[] = [];
  private colors: Color[] = [];
  private maxCount: number;
  private material: Material;
  private mesh: Mesh;

  constructor(material: Material, maxCount: number) {
    this.material = material;
    this.maxCount = maxCount;
    this.mesh = this.createInstancedMesh();
  }

  add(transform: Matrix, color: Color): void {
    this.transforms.push(transform);
    this.colors.push(color);
  }

  canAdd(): boolean {
    return this.transforms.length < this.maxCount;
  }

  get count(): number {
    return this.transforms.length;
  }

  render(): void {
    // 更新实例数据
    this.updateInstanceData();

    // 渲染实例化网格
    const renderer = engine.renderer;
    renderer.drawInstanced(this.mesh, this.material, this.count);

    // 清空批处理数据
    this.transforms.length = 0;
    this.colors.length = 0;
  }

  private createInstancedMesh(): Mesh {
    // 创建简单的四边形网格用于实例化渲染
    return PrimitiveMesh.createQuad(engine);
  }

  private updateInstanceData(): void {
    // 准备实例数据缓冲区
    const instanceData = new Float32Array(this.count * 20); // 4x4 matrix + 4 color

    for (let i = 0; i < this.count; i++) {
      const transform = this.transforms[i];
      const color = this.colors[i];
      const offset = i * 20;

      // 复制变换矩阵
      const matrixElements = transform.elements;
      for (let j = 0; j < 16; j++) {
        instanceData[offset + j] = matrixElements[j];
      }

      // 复制颜色
      instanceData[offset + 16] = color.r;
      instanceData[offset + 17] = color.g;
      instanceData[offset + 18] = color.b;
      instanceData[offset + 19] = color.a;
    }

    // 更新着色器数据
    this.material.shaderData.setBuffer('u_instanceData', instanceData);
  }
}
```

## LOD系统

### 多细节层次系统

```typescript
class LODGroup extends Script {
  private lods: LODLevel[] = [];
  private currentLOD: number = 0;
  private updateInterval: number = 0.1;
  private lastUpdateTime: number = 0;

  addLOD(screenRelativeHeight: number, renderers: Renderer[]): void {
    this.lods.push({
      screenRelativeHeight,
      renderers
    });

    // 按屏幕高度排序（从高到低）
    this.lods.sort((a, b) => b.screenRelativeHeight - a.screenRelativeHeight);
  }

  onUpdate(deltaTime: number): void {
    this.lastUpdateTime += deltaTime;

    if (this.lastUpdateTime >= this.updateInterval) {
      this.updateLOD();
      this.lastUpdateTime = 0;
    }
  }

  private updateLOD(): void {
    const camera = this.getActiveCamera();
    if (!camera) return;

    const screenHeight = this.calculateScreenRelativeHeight(camera);
    const newLOD = this.selectLOD(screenHeight);

    if (newLOD !== this.currentLOD) {
      this.switchLOD(this.currentLOD, newLOD);
      this.currentLOD = newLOD;
    }
  }

  private calculateScreenRelativeHeight(camera: Camera): number {
    const bounds = this.getComponent(MeshRenderer)?.bounds;
    if (!bounds) return 1.0;

    const distance = Vector3.distance(camera.transform.position, bounds.center);
    const size = bounds.size.y;

    return size / (distance * Math.tan(camera.fieldOfView * Math.PI / 360));
  }

  private selectLOD(screenHeight: number): number {
    for (let i = 0; i < this.lods.length; i++) {
      if (screenHeight > this.lods[i].screenRelativeHeight) {
        return i;
      }
    }
    return this.lods.length - 1;
  }

  private switchLOD(fromLOD: number, toLOD: number): void {
    // 禁用旧LOD的渲染器
    if (this.lods[fromLOD]) {
      this.lods[fromLOD].renderers.forEach(renderer => {
        renderer.enabled = false;
      });
    }

    // 启用新LOD的渲染器
    if (this.lods[toLOD]) {
      this.lods[toLOD].renderers.forEach(renderer => {
        renderer.enabled = true;
      });
    }
  }
}

// LOD渐变系统
class LODCrossFader extends Script {
  private fadeDuration: number = 0.5;
  private fadeTimer: number = 0;
  private isTransitioning: boolean = false;
  private fromLOD: number = 0;
  private toLOD: number = 0;

  startTransition(fromLOD: number, toLOD: number): void {
    if (this.isTransitioning) return;

    this.fromLOD = fromLOD;
    this.toLOD = toLOD;
    this.fadeTimer = 0;
    this.isTransitioning = true;

    this.prepareTransition();
  }

  private prepareTransition(): void {
    // 两个LOD同时启用，通过透明度控制显示
    const lodGroup = this.entity.getComponent(LODGroup);

    // 设置过渡状态
    this.setLODAlpha(this.fromLOD, 1.0);
    this.setLODAlpha(this.toLOD, 0.0);
  }

  onUpdate(deltaTime: number): void {
    if (!this.isTransitioning) return;

    this.fadeTimer += deltaTime;
    const progress = Math.min(this.fadeTimer / this.fadeDuration, 1.0);

    const fromAlpha = 1.0 - progress;
    const toAlpha = progress;

    this.setLODAlpha(this.fromLOD, fromAlpha);
    this.setLODAlpha(this.toLOD, toAlpha);

    if (progress >= 1.0) {
      this.completeTransition();
    }
  }

  private setLODAlpha(lodIndex: number, alpha: number): void {
    const lodGroup = this.entity.getComponent(LODGroup);
    const lod = lodGroup.lods[lodIndex];

    if (lod) {
      lod.renderers.forEach(renderer => {
        const material = renderer.material;
        material.shaderData.setFloat('u_alpha', alpha);
      });
    }
  }

  private completeTransition(): void {
    this.isTransitioning = false;

    // 禁用旧LOD
    const lodGroup = this.entity.getComponent(LODGroup);
    lodGroup.lods[this.fromLOD].renderers.forEach(renderer => {
      renderer.enabled = false;
    });
  }
}
```

## 异步加载

### 流式资源加载

```typescript
class StreamingAssetLoader {
  private loadingQueue: LoadTask[] = [];
  private maxConcurrentLoads: number = 3;
  private currentLoads: number = 0;

  addToQueue(task: LoadTask): void {
    this.loadingQueue.push(task);
    this.processQueue();
  }

  private processQueue(): void {
    while (this.currentLoads < this.maxConcurrentLoads && this.loadingQueue.length > 0) {
      const task = this.loadingQueue.shift()!;
      this.currentLoads++;

      this.executeTask(task).finally(() => {
        this.currentLoads--;
        this.processQueue();
      });
    }
  }

  private async executeTask(task: LoadTask): Promise<void> {
    try {
      task.onStart();

      // 分块加载大文件
      if (task.size > 1024 * 1024) { // 1MB
        await this.loadInChunks(task);
      } else {
        await this.loadComplete(task);
      }

      task.onComplete();
    } catch (error) {
      task.onError(error);
    }
  }

  private async loadInChunks(task: LoadTask): Promise<void> {
    const chunkSize = 256 * 1024; // 256KB chunks
    const totalChunks = Math.ceil(task.size / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = await this.loadChunk(task.path, i, chunkSize);
      task.onProgress(i + 1, totalChunks, chunk);

      // 每个chunk加载后暂停，避免阻塞主线程
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
}

// 智能预加载系统
class SmartPreloader {
  private preloadQueue: PreloadTask[] = [];
  private priorityMap: Map<string, number> = new Map();
  private loadingBudget: number = 50; // 每帧最大加载时间（毫秒）

  analyzeAndPreload(): void {
    // 分析当前场景，预测需要的资源
    this.analyzeCurrentScene();

    // 根据优先级预加载
    this.schedulePreloading();
  }

  private analyzeCurrentScene(): void {
    const camera = this.getActiveCamera();
    const renderers = scene.findComponents(MeshRenderer);

    renderers.forEach(renderer => {
      const distance = Vector3.distance(
        camera.transform.position,
        renderer.entity.transform.position
      );

      // 根据距离预测加载优先级
      const priority = this.calculatePriority(distance, renderer);

      if (priority > this.minPriorityThreshold) {
        this.queueForPreload(renderer.material, priority);
      }
    });
  }

  private schedulePreloading(): void {
    // 每帧执行一些预加载任务，避免影响主线程性能
    const startTime = performance.now();

    while (
      this.preloadQueue.length > 0 &&
      performance.now() - startTime < this.loadingBudget
    ) {
      const task = this.preloadQueue.shift()!;
      this.executePreloadTask(task);
    }
  }

  private executePreloadTask(task: PreloadTask): void {
    // 在Web Worker中执行解压缩等耗时操作
    const worker = new Worker('asset-worker.js');

    worker.postMessage({
      type: 'preload',
      assetPath: task.assetPath
    });

    worker.onmessage = (event) => {
      if (event.data.success) {
        this.cacheAsset(task.assetPath, event.data.asset);
      }
      worker.terminate();
    };
  }
}
```

### 纹理流式加载

```typescript
class TextureStreaming {
  private streamingTextures: Map<string, StreamingTexture> = new Map();
  private qualityLevels: number[] = [128, 256, 512, 1024, 2048];
  private currentQuality: Map<string, number> = new Map();

  async streamTexture(path: string): Promise<StreamingTexture> {
    if (this.streamingTextures.has(path)) {
      return this.streamingTextures.get(path)!;
    }

    const streamingTexture = new StreamingTexture(path, this.qualityLevels);
    this.streamingTextures.set(path, streamingTexture);

    // 从最低质量开始加载
    await this.loadQualityLevel(path, 0);

    return streamingTexture;
  }

  updateStreaming(): void {
    const camera = this.getActiveCamera();

    this.streamingTextures.forEach((texture, path) => {
      const distance = this.calculateTextureDistance(texture, camera);
      const targetQuality = this.selectQualityLevel(distance);

      if (targetQuality > this.currentQuality.get(path)!) {
        this.loadQualityLevel(path, targetQuality);
      }
    });
  }

  private async loadQualityLevel(path: string, qualityLevel: number): Promise<void> {
    const quality = this.qualityLevels[qualityLevel];
    const texturePath = `${path}@${quality}x.jpg`;

    try {
      const texture = await engine.resourceManager.load<Texture2D>(texturePath);

      const streamingTexture = this.streamingTextures.get(path)!;
      streamingTexture.setTexture(qualityLevel, texture);

      this.currentQuality.set(path, qualityLevel);
    } catch (error) {
      console.warn(`Failed to load texture quality level ${qualityLevel}: ${path}`, error);
    }
  }

  private selectQualityLevel(distance: number): number {
    // 根据距离选择合适的质量级别
    if (distance < 10) return 4; // 2048
    if (distance < 25) return 3; // 1024
    if (distance < 50) return 2; // 512
    if (distance < 100) return 1; // 256
    return 0; // 128
  }
}
```

## 物理优化

### 物理LOD

```typescript
class PhysicsLODManager {
  private physicsLODs: Map<Entity, PhysicsLOD> = new Map();
  private updateRate: number = 60; // 物理更新频率

  registerPhysicsObject(entity: Entity): void {
    const physicsLOD = new PhysicsLOD(entity);
    this.physicsLODs.set(entity, physicsLOD);
  }

  updatePhysics(deltaTime: number): void {
    const camera = this.getActiveCamera();

    this.physicsLODs.forEach((lod, entity) => {
      const distance = Vector3.distance(
        camera.transform.position,
        entity.transform.position
      );

      lod.updateLOD(distance, deltaTime);
    });
  }
}

class PhysicsLOD {
  private rigidbody: RigidBody;
  private highQualityCollider: ColliderShape;
  private lowQualityCollider: ColliderShape;
  private currentLevel: 'high' | 'low' = 'high';

  constructor(entity: Entity) {
    this.rigidbody = entity.getComponent(Rigidbody);
    this.setupColliders(entity);
  }

  private setupColliders(entity: Entity): void {
    // 创建高质量碰撞器（精确但性能开销大）
    this.highQualityCollider = new MeshColliderShape(entity.getComponent(MeshRenderer).mesh);

    // 创建低质量碰撞器（简单但性能开销小）
    this.lowQualityCollider = new BoxColliderShape();
    this.lowQualityCollider.size = this.calculateBoundingBox(entity);
  }

  updateLOD(distance: number, deltaTime: number): void {
    const targetLevel = distance < 20 ? 'high' : 'low';

    if (targetLevel !== this.currentLevel) {
      this.switchLOD(targetLevel);
    }

    // 根据LOD级别调整物理更新频率
    const updateRate = this.currentLevel === 'high' ? 60 : 30;
    if (Math.random() < updateRate / 60) {
      this.rigidbody.update(deltaTime);
    }
  }

  private switchLOD(level: 'high' | 'low'): void {
    const collider = this.rigidbody.getComponent(DynamicCollider);

    if (level === 'high') {
      collider.removeShape(this.lowQualityCollider);
      collider.addShape(this.highQualityCollider);
    } else {
      collider.removeShape(this.highQualityCollider);
      collider.addShape(this.lowQualityCollider);
    }

    this.currentLevel = level;
  }
}
```

### 物理休眠系统

```typescript
class PhysicsSleepManager {
  private sleepThreshold: number = 0.1;
  private sleepTime: number = 2.0;
  private sleepMap: Map<RigidBody, SleepData> = new Map();

  registerRigidbody(rigidbody: RigidBody): void {
    this.sleepMap.set(rigidbody, {
      velocityHistory: [],
      isSleeping: false,
      sleepTimer: 0
    });
  }

  update(deltaTime: number): void {
    this.sleepMap.forEach((sleepData, rigidbody) => {
      if (sleepData.isSleeping) {
        this.checkWakeCondition(rigidbody, sleepData);
      } else {
        this.checkSleepCondition(rigidbody, sleepData, deltaTime);
      }
    });
  }

  private checkSleepCondition(
    rigidbody: RigidBody,
    sleepData: SleepData,
    deltaTime: number
  ): void {
    const velocity = rigidbody.linearVelocity;
    const angularVelocity = rigidbody.angularVelocity;
    const speed = velocity.length() + angularVelocity.length();

    sleepData.velocityHistory.push(speed);
    if (sleepData.velocityHistory.length > 10) {
      sleepData.velocityHistory.shift();
    }

    const avgSpeed = sleepData.velocityHistory.reduce((a, b) => a + b, 0) /
                    sleepData.velocityHistory.length;

    if (avgSpeed < this.sleepThreshold) {
      sleepData.sleepTimer += deltaTime;

      if (sleepData.sleepTimer > this.sleepTime) {
        this.putToSleep(rigidbody);
      }
    } else {
      sleepData.sleepTimer = 0;
    }
  }

  private checkWakeCondition(rigidbody: RigidBody, sleepData: SleepData): void {
    // 检查是否有外力作用
    if (this.hasExternalForces(rigidbody)) {
      this.wakeUp(rigidbody);
    }
  }

  private putToSleep(rigidbody: RigidBody): void {
    const sleepData = this.sleepMap.get(rigidbody)!;
    sleepData.isSleeping = true;

    // 停止物理模拟
    rigidbody.isKinematic = true;
    rigidbody.linearVelocity.set(0, 0, 0);
    rigidbody.angularVelocity.set(0, 0, 0);
  }

  private wakeUp(rigidbody: RigidBody): void {
    const sleepData = this.sleepMap.get(rigidbody)!;
    sleepData.isSleeping = false;
    sleepData.sleepTimer = 0;

    // 恢复物理模拟
    rigidbody.isKinematic = false;
  }
}
```

## 平台特定优化

### 移动端优化

```typescript
class MobileOptimizer {
  private targetFrameRate: number = 30;
  private resolutionScale: number = 0.75;
  private shadowQuality: ShadowQuality = ShadowQuality.Low;

  optimizeForMobile(): void {
    this.adjustFrameRate();
    this.adjustResolution();
    this.adjustQualitySettings();
    this.enableMobileSpecificOptimizations();
  }

  private adjustFrameRate(): void {
    // 降低帧率以节省电量
    engine.targetFrameRate = this.targetFrameRate;
  }

  private adjustResolution(): void {
    // 降低渲染分辨率
    engine.renderSettings.renderScale = this.resolutionScale;
  }

  private adjustQualitySettings(): void {
    // 降低阴影质量
    scene.shadowResolution = this.shadowQuality;

    // 禁用高开销特效
    scene.postProcessManager.removeAllEffects();
  }

  private enableMobileSpecificOptimizations(): void {
    // 启用GPU实例化
    engine.enableInstancing = true;

    // 优化批处理
    engine.batchSize = 50;

    // 减少同时加载的资源数量
    engine.resourceManager.maxConcurrentLoads = 2;
  }
}

// 自适应质量系统
class AdaptiveQualityManager {
  private qualityProfiles: QualityProfile[] = [];
  private currentProfileIndex: number = 0;
  private frameTimeHistory: number[] = [];
  private adjustmentInterval: number = 5000; // 5秒
  private lastAdjustment: number = 0;

  constructor() {
    this.setupQualityProfiles();
  }

  private setupQualityProfiles(): void {
    this.qualityProfiles = [
      {
        name: 'Low',
        resolutionScale: 0.5,
        shadowQuality: ShadowQuality.Low,
        lodBias: -2,
        textureQuality: TextureQuality.Low
      },
      {
        name: 'Medium',
        resolutionScale: 0.75,
        shadowQuality: ShadowQuality.Medium,
        lodBias: -1,
        textureQuality: TextureQuality.Medium
      },
      {
        name: 'High',
        resolutionScale: 1.0,
        shadowQuality: ShadowQuality.High,
        lodBias: 0,
        textureQuality: TextureQuality.High
      }
    ];
  }

  update(): void {
    const currentTime = performance.now();

    if (currentTime - this.lastAdjustment > this.adjustmentInterval) {
      this.adjustQuality();
      this.lastAdjustment = currentTime;
    }

    this.recordFrameTime();
  }

  private recordFrameTime(): void {
    this.frameTimeHistory.push(engine.frameTime);

    if (this.frameTimeHistory.length > 300) { // 保留5秒的历史
      this.frameTimeHistory.shift();
    }
  }

  private adjustQuality(): void {
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) /
                        this.frameTimeHistory.length;
    const targetFrameTime = 1000 / engine.targetFrameRate;

    let shouldAdjust = false;
    let direction = 0;

    if (avgFrameTime > targetFrameTime * 1.2) {
      // 性能不足，降低质量
      shouldAdjust = true;
      direction = -1;
    } else if (avgFrameTime < targetFrameTime * 0.8) {
      // 性能充足，提高质量
      shouldAdjust = true;
      direction = 1;
    }

    if (shouldAdjust) {
      this.switchProfile(this.currentProfileIndex + direction);
    }
  }

  private switchProfile(index: number): void {
    index = Math.max(0, Math.min(index, this.qualityProfiles.length - 1));

    if (index !== this.currentProfileIndex) {
      this.currentProfileIndex = index;
      this.applyProfile(this.qualityProfiles[index]);
    }
  }

  private applyProfile(profile: QualityProfile): void {
    engine.renderSettings.renderScale = profile.resolutionScale;
    scene.shadowResolution = profile.shadowQuality;

    // 应用其他设置...
    console.log(`Switched to ${profile.name} quality profile`);
  }
}
```

通过遵循这些性能优化指南，你可以显著提升Galacean Engine应用的运行效率和用户体验。