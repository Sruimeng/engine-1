# 资源加载和管理指南

资源管理是3D应用开发的核心环节，本指南详细介绍Galacean Engine的资源加载、缓存、释放等管理机制，帮助开发者高效地处理各种类型的资源。

## 目录
- [资源系统概述](#资源系统概述)
- [资源加载](#资源加载)
- [资源管理器](#资源管理器)
- [资源类型](#资源类型)
- [异步加载](#异步加载)
- [资源打包](#资源打包)
- [资源热更新](#资源热更新)
- [最佳实践](#最佳实践)

## 资源系统概述

### 核心概念

- **ResourceManager**: 全局资源管理器，负责资源的加载、缓存和生命周期管理
- **ReferResource**: 可引用资源基类，实现引用计数机制
- **AssetPromise**: 资源加载的Promise包装，提供异步加载支持
- **LoadItem**: 资源加载项，描述要加载的资源信息

### 资源生命周期

```
创建资源 → 加载资源 → 使用资源 → 引用计数 → 自动释放
```

```typescript
import { ResourceManager, ReferResource, AssetPromise } from '@galacean/engine';

// 获取资源管理器实例
const resourceManager = engine.resourceManager;

// 资源加载的基本流程
const model: Model = await resourceManager.load<Model>('character.glb');

// 使用资源
const entity = scene.createRootEntity('Character');
const renderer = entity.addComponent(MeshRenderer);
renderer.mesh = model.meshes[0];

// 资源会自动管理引用计数，当引用为0时自动释放
```

## 资源加载

### 基本加载方法

```typescript
// 1. 单个资源加载
const texture: Texture2D = await resourceManager.load<Texture2D>('texture.png');

// 2. 批量资源加载
const paths = ['model.glb', 'texture.png', 'material.json'];
const resources = await resourceManager.load(paths);

// 3. 使用加载项配置
const loadItem: LoadItem = {
  url: 'character.glb',
  type: 'glb',
  cache: true,
  retryCount: 3,
  timeout: 30000
};

const character = await resourceManager.load<Model>(loadItem);
```

### 加载配置

```typescript
// 配置资源管理器
resourceManager.baseUrl = 'https://cdn.example.com/assets/';
resourceManager.retryCount = 3;
resourceManager.retryInterval = 1000;
resourceManager.timeout = 30000;

// 资源预加载
class ResourcePreloader {
  private manifest: AssetManifest;
  private loadingProgress: number = 0;
  private totalAssets: number = 0;

  constructor(manifestPath: string) {
    this.loadManifest(manifestPath);
  }

  private async loadManifest(manifestPath: string): Promise<void> {
    this.manifest = await resourceManager.load<AssetManifest>(manifestPath);
    this.totalAssets = this.manifest.assets.length;
  }

  async preloadAll(onProgress?: (progress: number) => void): Promise<void> {
    const promises = this.manifest.assets.map(asset => {
      return this.preloadAsset(asset).then(() => {
        this.loadingProgress++;
        if (onProgress) {
          onProgress(this.loadingProgress / this.totalAssets);
        }
      });
    });

    await Promise.all(promises);
  }

  private async preloadAsset(asset: AssetInfo): Promise<void> {
    try {
      if (asset.bundle) {
        return resourceManager.loadInBundle(asset.bundle, asset.path);
      } else {
        return resourceManager.load(asset.path, asset.type);
      }
    } catch (error) {
      console.warn(`Failed to preload asset: ${asset.path}`, error);
    }
  }
}
```

### 加载进度监控

```typescript
class LoadingMonitor {
  private activeRequests: Map<string, LoadingRequest> = new Map();
  private progressCallback?: (progress: number) => void;

  monitorLoad<T>(path: string, promise: AssetPromise<T>): AssetPromise<T> {
    const request: LoadingRequest = {
      path,
      startTime: performance.now(),
      bytesLoaded: 0,
      bytesTotal: 0
    };

    this.activeRequests.set(path, request);

    return promise
      .then(resource => {
        this.onLoadComplete(request, resource);
        return resource;
      })
      .catch(error => {
        this.onLoadError(request, error);
        throw error;
      })
      .finally(() => {
        this.activeRequests.delete(path);
        this.updateProgress();
      });
  }

  private onLoadComplete(request: LoadingRequest, resource: any): void {
    const loadTime = performance.now() - request.startTime;
    console.log(`Loaded ${request.path} in ${loadTime.toFixed(2)}ms`);
  }

  private onLoadError(request: LoadingRequest, error: any): void {
    console.error(`Failed to load ${request.path}:`, error);
  }

  private updateProgress(): void {
    if (this.progressCallback) {
      const total = this.activeRequests.size;
      const completed = Array.from(this.activeRequests.values())
        .filter(req => req.bytesLoaded === req.bytesTotal).length;
      const progress = total > 0 ? completed / total : 0;

      this.progressCallback(progress);
    }
  }
}
```

## 资源管理器

### 缓存管理

```typescript
class ResourceManagerExt {
  private cache: Map<string, any> = new Map();
  private referenceCounts: Map<string, number> = new Map();
  private lastUsed: Map<string, number> = new Map();

  async loadWithCache<T>(path: string, type?: string): Promise<T> {
    // 检查缓存
    if (this.cache.has(path)) {
      this.incrementReference(path);
      this.updateLastUsed(path);
      return this.cache.get(path);
    }

    // 加载资源
    const resource = await engine.resourceManager.load<T>(path, type);

    // 缓存资源
    this.cache.set(path, resource);
    this.referenceCounts.set(path, 1);
    this.updateLastUsed(path);

    return resource;
  }

  private incrementReference(path: string): void {
    const count = this.referenceCounts.get(path) || 0;
    this.referenceCounts.set(path, count + 1);
  }

  private updateLastUsed(path: string): void {
    this.lastUsed.set(path, performance.now());
  }

  release(path: string): void {
    if (!this.referenceCounts.has(path)) return;

    const count = this.referenceCounts.get(path)! - 1;
    this.referenceCounts.set(path, count);

    if (count <= 0) {
      this.unload(path);
    }
  }

  private unload(path: string): void {
    const resource = this.cache.get(path);
    if (resource && typeof resource.destroy === 'function') {
      resource.destroy();
    }

    this.cache.delete(path);
    this.referenceCounts.delete(path);
    this.lastUsed.delete(path);
  }

  // 定期清理未使用的资源
  performCleanup(): void {
    const currentTime = performance.now();
    const maxAge = 60000; // 1分钟

    this.lastUsed.forEach((lastUsed, path) => {
      if (currentTime - lastUsed > maxAge) {
        const count = this.referenceCounts.get(path) || 0;
        if (count === 0) {
          this.unload(path);
        }
      }
    });
  }
}
```

### 资源依赖管理

```typescript
class DependencyManager {
  private dependencies: Map<string, string[]> = new Map();
  private reverseDependencies: Map<string, string[]> = new Map();

  addDependency(asset: string, dependency: string): void {
    if (!this.dependencies.has(asset)) {
      this.dependencies.set(asset, []);
    }
    this.dependencies.get(asset)!.push(dependency);

    if (!this.reverseDependencies.has(dependency)) {
      this.reverseDependencies.set(dependency, []);
    }
    this.reverseDependencies.get(dependency)!.push(asset);
  }

  getDependencies(asset: string): string[] {
    return this.dependencies.get(asset) || [];
  }

  getDependents(asset: string): string[] {
    return this.reverseDependencies.get(asset) || [];
  }

  unloadWithDependencies(asset: string): void {
    // 递归卸载所有依赖
    const dependencies = this.getDependencies(asset);
    dependencies.forEach(dep => {
      this.unloadWithDependencies(dep);
    });

    // 卸载主资源
    resourceManager.release(asset);
  }

  // 从GLTF等格式自动提取依赖关系
  extractDependencies(assetPath: string, resource: any): void {
    if (resource instanceof Model) {
      // 提取模型依赖的纹理和材质
      resource.materials.forEach((material: Material, index: number) => {
        this.addDependency(assetPath, material.name || `${assetPath}_material_${index}`);
      });

      resource.meshes.forEach((mesh: Mesh, index: number) => {
        this.addDependency(assetPath, mesh.name || `${assetPath}_mesh_${index}`);
      });
    }
  }
}
```

### 资源池化

```typescript
class ResourcePool<T extends ReferResource> {
  private pool: T[] = [];
  private loadingPromises: Map<string, Promise<T>> = new Map();
  private maxPoolSize: number;
  private resourceType: new (...args: any[]) => T;

  constructor(resourceType: new (...args: any[]) => T, maxPoolSize: number = 10) {
    this.resourceType = resourceType;
    this.maxPoolSize = maxPoolSize;
  }

  async acquire(path: string): Promise<T> {
    // 从池中获取可用资源
    for (let i = 0; i < this.pool.length; i++) {
      const resource = this.pool[i];
      if (resource.resourcePath === path && resource.referenceCount === 0) {
        this.pool.splice(i, 1);
        resource.addRef();
        return resource;
      }
    }

    // 如果没有可用资源，检查是否正在加载
    if (this.loadingPromises.has(path)) {
      const resource = await this.loadingPromises.get(path)!;
      resource.addRef();
      return resource;
    }

    // 加载新资源
    const loadingPromise = resourceManager.load<T>(path);
    this.loadingPromises.set(path, loadingPromise);

    const resource = await loadingPromise;
    this.loadingPromises.delete(path);

    resource.addRef();
    return resource;
  }

  release(resource: T): void {
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(resource);
    } else {
      // 池满时直接释放
      resource.destroy();
    }
  }

  clear(): void {
    this.pool.forEach(resource => resource.destroy());
    this.pool.length = 0;
    this.loadingPromises.clear();
  }

  getStats(): PoolStats {
    return {
      available: this.pool.length,
      loading: this.loadingPromises.size,
      maxCapacity: this.maxPoolSize
    };
  }
}
```

## 资源类型

### 纹理资源

```typescript
class TextureLoader {
  private textureCache: Map<string, Texture2D> = new Map();

  async loadTexture(path: string, options?: TextureLoadOptions): Promise<Texture2D> {
    if (this.textureCache.has(path)) {
      return this.textureCache.get(path)!;
    }

    const texture = await resourceManager.load<Texture2D>(path);

    // 应用加载选项
    if (options) {
      this.applyTextureOptions(texture, options);
    }

    // 生成Mipmap
    if (options?.generateMipmaps !== false) {
      texture.generateMipmaps();
    }

    this.textureCache.set(path, texture);
    return texture;
  }

  private applyTextureOptions(texture: Texture2D, options: TextureLoadOptions): void {
    if (options.wrapModeU !== undefined) {
      texture.wrapModeU = options.wrapModeU;
    }
    if (options.wrapModeV !== undefined) {
      texture.wrapModeV = options.wrapModeV;
    }
    if (options.filterMode !== undefined) {
      texture.filterMode = options.filterMode;
    }
    if (options.anisoLevel !== undefined) {
      texture.anisoLevel = options.anisoLevel;
    }
  }

  async loadTextureAtlas(path: string, tileWidth: number, tileHeight: number): Promise<TextureAtlas> {
    const texture = await this.loadTexture(path);
    return new TextureAtlas(texture, tileWidth, tileHeight);
  }

  async loadCubeMap(path: string): Promise<TextureCube> {
    // 支持6个面的立方体贴图
    const faces = await Promise.all([
      resourceManager.load<Texture2D>(`${path}_px.jpg`),
      resourceManager.load<Texture2D>(`${path}_nx.jpg`),
      resourceManager.load<Texture2D>(`${path}_py.jpg`),
      resourceManager.load<Texture2D>(`${path}_ny.jpg`),
      resourceManager.load<Texture2D>(`${path}_pz.jpg`),
      resourceManager.load<Texture2D>(`${path}_nz.jpg`)
    ]);

    const cubeMap = new TextureCube(engine);
    cubeMap.setPixelBuffer(faces);

    return cubeMap;
  }
}

interface TextureLoadOptions {
  wrapModeU?: WrapMode;
  wrapModeV?: WrapMode;
  filterMode?: FilterMode;
  generateMipmaps?: boolean;
  anisoLevel?: number;
  premultiplyAlpha?: boolean;
  flipY?: boolean;
}
```

### 模型资源

```typescript
class ModelLoader {
  private modelCache: Map<string, Model> = new Map();

  async loadModel(path: string, options?: ModelLoadOptions): Promise<Model> {
    if (this.modelCache.has(path)) {
      return this.modelCache.get(path)!;
    }

    const model = await resourceManager.load<Model>(path);

    if (options) {
      await this.processModel(model, options);
    }

    this.modelCache.set(path, model);
    return model;
  }

  private async processModel(model: Model, options: ModelLoadOptions): Promise<void> {
    // 优化网格
    if (options.optimizeMeshes) {
      model.meshes.forEach(mesh => {
        this.optimizeMesh(mesh);
      });
    }

    // 预计算切线空间
    if (options.calculateTangents) {
      model.meshes.forEach(mesh => {
        this.calculateTangents(mesh);
      });
    }

    // 生成碰撞形状
    if (options.generateColliders) {
      model.meshes.forEach(mesh => {
        this.generateColliderShape(mesh);
      });
    }

    // 合并材质
    if (options.mergeMaterials) {
      this.mergeSimilarMaterials(model);
    }
  }

  private optimizeMesh(mesh: Mesh): void {
    // 顶点缓存优化
    this.optimizeVertexCache(mesh);

    // 过量化优化
    this.quantizeMesh(mesh);

    // 移除未使用的顶点
    this.removeUnusedVertices(mesh);
  }

  async loadSkinnedModel(path: string): Promise<SkinnedModel> {
    const model = await this.loadModel(path);

    if (!model.hasSkeleton) {
      throw new Error('Model does not contain skeleton');
    }

    const skinnedModel = new SkinnedModel(model);
    await skinnedModel.initializeAnimations();

    return skinnedModel;
  }
}

interface ModelLoadOptions {
  optimizeMeshes?: boolean;
  calculateTangents?: boolean;
  generateColliders?: boolean;
  mergeMaterials?: boolean;
  compressTextures?: boolean;
}
```

### 音频资源

```typescript
class AudioManager {
  private audioCache: Map<string, AudioClip> = new Map();
  private audioPools: Map<string, AudioSource[]> = new Map();

  async loadAudio(path: string): Promise<AudioClip> {
    if (this.audioCache.has(path)) {
      return this.audioCache.get(path)!;
    }

    const audioClip = await resourceManager.load<AudioClip>(path);
    this.audioCache.set(path, audioClip);

    return audioClip;
  }

  // 音频流式加载（用于大文件）
  async loadAudioStream(path: string): Promise<AudioStream> {
    const stream = new AudioStream();
    await stream.loadFromUrl(path);
    return stream;
  }

  // 音频对象池
  getAudioSource(path: string): AudioSource {
    if (!this.audioPools.has(path)) {
      this.audioPools.set(path, []);
    }

    const pool = this.audioPools.get(path)!;
    let audioSource = pool.find(source => !source.isPlaying);

    if (!audioSource) {
      audioSource = new AudioSource(engine);
      audioSource.clip = this.audioCache.get(path);
      pool.push(audioSource);
    }

    return audioSource;
  }

  playOneShot(path: string, volume: number = 1.0): void {
    const audioSource = this.getAudioSource(path);
    audioSource.volume = volume;
    audioSource.playOneShot();
  }

  // 预加载音效
  async preloadAudio(paths: string[]): Promise<void> {
    const promises = paths.map(path => this.loadAudio(path));
    await Promise.all(promises);
  }
}
```

## 异步加载

### 分块加载

```typescript
class ChunkedLoader {
  private chunkSize: number = 1024 * 1024; // 1MB chunks
  private maxConcurrentChunks: number = 3;

  async loadLargeFile(path: string): Promise<ArrayBuffer> {
    const fileSize = await this.getFileSize(path);
    const totalChunks = Math.ceil(fileSize / this.chunkSize);

    const chunks: ArrayBuffer[] = new Array(totalChunks);
    const semaphore = new Semaphore(this.maxConcurrentChunks);

    // 并行加载所有块
    const promises: Promise<void>[] = [];

    for (let i = 0; i < totalChunks; i++) {
      promises.push(
        semaphore.acquire().then(async () => {
          try {
            const chunk = await this.loadChunk(path, i);
            chunks[i] = chunk;
          } finally {
            semaphore.release();
          }
        })
      );
    }

    await Promise.all(promises);

    // 合并所有块
    return this.concatChunks(chunks);
  }

  private async loadChunk(path: string, index: number): Promise<ArrayBuffer> {
    const start = index * this.chunkSize;
    const end = start + this.chunkSize;

    const response = await fetch(`${path}?chunk=${index}`, {
      headers: {
        Range: `bytes=${start}-${end}`
      }
    });

    return response.arrayBuffer();
  }

  private concatChunks(chunks: ArrayBuffer[]): ArrayBuffer {
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const result = new ArrayBuffer(totalSize);
    const view = new Uint8Array(result);

    let offset = 0;
    chunks.forEach(chunk => {
      view.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    });

    return result;
  }
}

class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise<void>(resolve => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      resolve();
    } else {
      this.permits++;
    }
  }
}
```

### 渐进式加载

```typescript
class ProgressiveLoader {
  async loadTextureProgressively(
    path: string,
    onProgress?: (quality: number, texture: Texture2D) => void
  ): Promise<Texture2D> {
    const qualityLevels = [64, 128, 256, 512, 1024, 2048];
    let finalTexture: Texture2D | null = null;

    for (let i = 0; i < qualityLevels.length; i++) {
      const quality = qualityLevels[i];
      const texturePath = `${path}@${quality}.jpg`;

      try {
        const texture = await resourceManager.load<Texture2D>(texturePath);

        if (onProgress) {
          onProgress(quality, texture);
        }

        finalTexture = texture;

        // 等待一帧再加载下一质量级别
        await new Promise(resolve => requestAnimationFrame(resolve));

        // 如果是最后一档或用户取消，退出循环
        if (i === qualityLevels.length - 1 || this.shouldStopLoading()) {
          break;
        }

      } catch (error) {
        console.warn(`Failed to load quality level ${quality}:`, error);
      }
    }

    return finalTexture!;
  }

  async loadModelProgressively(
    path: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<Model> {
    // 1. 先加载基础几何体（低精度）
    if (onProgress) onProgress('geometry', 0);
    const baseModel = await resourceManager.load<Model>(`${path}_base.glb`);

    // 2. 异步加载高精度细节
    if (onProgress) onProgress('details', 0);
    const detailsPromise = resourceManager.load<Model>(`${path}_details.glb`);

    // 3. 异步加载纹理
    if (onProgress) onProgress('textures', 0);
    const texturesPromise = this.loadModelTextures(baseModel);

    // 等待所有资源加载完成
    const [details] = await Promise.all([detailsPromise, texturesPromise]);

    // 合并模型
    const finalModel = this.mergeModels(baseModel, details);

    if (onProgress) onProgress('complete', 100);

    return finalModel;
  }

  private shouldStopLoading(): boolean {
    // 检查是否应该停止加载（例如用户导航到其他页面）
    return false;
  }
}
```

### 优先级加载

```typescript
class PriorityLoader {
  private loadQueue: PriorityQueue<LoadTask> = new PriorityQueue();
  private isProcessing: boolean = false;
  private maxConcurrentLoads: number = 3;
  private currentLoads: number = 0;

  addLoadTask(task: LoadTask): void {
    this.loadQueue.enqueue(task, task.priority);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.currentLoads >= this.maxConcurrentLoads) {
      return;
    }

    this.isProcessing = true;

    while (this.loadQueue.size() > 0 && this.currentLoads < this.maxConcurrentLoads) {
      const task = this.loadQueue.dequeue();
      this.currentLoads++;

      this.executeTask(task)
        .finally(() => {
          this.currentLoads--;
          this.processQueue();
        });
    }

    this.isProcessing = false;
  }

  private async executeTask(task: LoadTask): Promise<void> {
    try {
      task.onStart();

      // 根据优先级调整加载策略
      if (task.priority === LoadPriority.Critical) {
        await this.loadSynchronously(task);
      } else {
        await this.loadAsynchronously(task);
      }

      task.onComplete();
    } catch (error) {
      task.onError(error);
    }
  }

  private async loadSynchronously(task: LoadTask): Promise<void> {
    // 同步加载关键资源
    const resource = await resourceManager.load(task.path);
    task.resolve(resource);
  }

  private async loadAsynchronously(task: LoadTask): Promise<void> {
    // 异步加载，分片处理
    const resource = await this.loadWithYielding(task);
    task.resolve(resource);
  }

  private async loadWithYielding(task: LoadTask): Promise<any> {
    // 模拟分片加载
    const resource = await resourceManager.load(task.path);

    // 在加载过程中让出控制权
    if (task.priority !== LoadPriority.Low) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return resource;
  }
}

enum LoadPriority {
  Critical = 0,
  High = 1,
  Normal = 2,
  Low = 3
}

class LoadTask {
  constructor(
    public path: string,
    public priority: LoadPriority,
    public resolve: (resource: any) => void,
    public reject: (error: any) => void,
    public onStart: () => void = () => {},
    public onComplete: () => void = () => {},
    public onError: (error: any) => void = () => {}
  ) {}
}
```

## 资源打包

### 资源包管理

```typescript
class AssetBundle {
  private assets: Map<string, any> = new Map();
  private dependencies: string[] = [];
  private version: string;
  private checksum: string;

  constructor(version: string) {
    this.version = version;
  }

  addAsset(name: string, asset: any): void {
    this.assets.set(name, asset);
  }

  getAsset(name: string): any {
    return this.assets.get(name);
  }

  hasAsset(name: string): boolean {
    return this.assets.has(name);
  }

  // 序列化包
  serialize(): ArrayBuffer {
    const bundleData = {
      version: this.version,
      checksum: this.checksum,
      dependencies: this.dependencies,
      assets: Array.from(this.assets.entries())
    };

    const json = JSON.stringify(bundleData);
    return new TextEncoder().encode(json).buffer;
  }

  // 反序列化包
  static deserialize(buffer: ArrayBuffer): AssetBundle {
    const json = new TextDecoder().decode(buffer);
    const bundleData = JSON.parse(json);

    const bundle = new AssetBundle(bundleData.version);
    bundle.checksum = bundleData.checksum;
    bundle.dependencies = bundleData.dependencies;

    bundleData.assets.forEach(([name, asset]: [string, any]) => {
      bundle.addAsset(name, asset);
    });

    return bundle;
  }
}

class AssetBundleManager {
  private bundles: Map<string, AssetBundle> = new Map();
  private loadedBundles: Set<string> = new Set();

  async loadBundle(bundleName: string): Promise<AssetBundle> {
    if (this.loadedBundles.has(bundleName)) {
      return this.bundles.get(bundleName)!;
    }

    const bundlePath = `bundles/${bundleName}.bundle`;
    const buffer = await resourceManager.load<ArrayBuffer>(bundlePath);

    const bundle = AssetBundle.deserialize(buffer);
    this.bundles.set(bundleName, bundle);
    this.loadedBundles.add(bundleName);

    // 预加载依赖包
    await this.loadDependencies(bundle);

    return bundle;
  }

  private async loadDependencies(bundle: AssetBundle): Promise<void> {
    const promises = bundle.dependencies.map(dep => this.loadBundle(dep));
    await Promise.all(promises);
  }

  getAsset(bundleName: string, assetName: string): any {
    const bundle = this.bundles.get(bundleName);
    return bundle?.getAsset(assetName);
  }

  unloadBundle(bundleName: string): void {
    const bundle = this.bundles.get(bundleName);
    if (bundle) {
      // 释放所有资源
      bundle.assets.forEach((asset, name) => {
        if (typeof asset.destroy === 'function') {
          asset.destroy();
        }
      });

      this.bundles.delete(bundleName);
      this.loadedBundles.delete(bundleName);
    }
  }

  // 创建资源包
  static async createBundle(
    bundleName: string,
    assetPaths: string[],
    outputDir: string
  ): Promise<void> {
    const bundle = new AssetBundle('1.0.0');

    // 加载所有资源
    const assets = await Promise.all(
      assetPaths.map(path => resourceManager.load(path))
    );

    // 添加到包
    assets.forEach((asset, index) => {
      const assetName = assetPaths[index].split('/').pop()!;
      bundle.addAsset(assetName, asset);
    });

    // 计算校验和
    bundle.checksum = await this.calculateChecksum(bundle);

    // 序列化并保存
    const buffer = bundle.serialize();
    await this.saveBundle(buffer, `${outputDir}/${bundleName}.bundle`);
  }

  private static async calculateChecksum(bundle: AssetBundle): Promise<string> {
    // 使用SHA-256计算校验和
    const buffer = bundle.serialize();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private static async saveBundle(buffer: ArrayBuffer, path: string): Promise<void> {
    // 实现文件保存逻辑
    // 在实际应用中可能需要服务器端支持
  }
}
```

### 热更新系统

```typescript
class HotUpdateManager {
  private versionCache: Map<string, string> = new Map();
  private updateQueue: UpdateTask[] = [];
  private isUpdating: boolean = false;

  async checkForUpdates(): Promise<UpdateInfo[]> {
    const localVersion = await this.getLocalVersion();
    const remoteVersion = await this.getRemoteVersion();

    const updates: UpdateInfo[] = [];

    // 比较版本差异
    for (const [bundle, remoteVer] of Object.entries(remoteVersion)) {
      const localVer = localVersion[bundle] || '0.0.0';
      if (this.compareVersions(localVer, remoteVer) < 0) {
        updates.push({
          bundle,
          localVersion: localVer,
          remoteVersion: remoteVer,
          priority: this.calculateUpdatePriority(bundle)
        });
      }
    }

    // 按优先级排序
    updates.sort((a, b) => b.priority - a.priority);

    return updates;
  }

  async performUpdate(updates: UpdateInfo[]): Promise<void> {
    this.updateQueue = updates.map(update => new UpdateTask(update));
    this.processUpdateQueue();
  }

  private async processUpdateQueue(): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;

    while (this.updateQueue.length > 0) {
      const task = this.updateQueue.shift()!;

      try {
        await this.downloadUpdate(task);
        await this.applyUpdate(task);
        await this.verifyUpdate(task);

        task.status = UpdateStatus.Completed;
        task.onComplete();

      } catch (error) {
        task.status = UpdateStatus.Failed;
        task.onError(error);
      }
    }

    this.isUpdating = false;
  }

  private async downloadUpdate(task: UpdateTask): Promise<void> {
    const bundleUrl = `https://cdn.example.com/updates/${task.update.bundle}.bundle`;

    // 下载更新包
    const response = await fetch(bundleUrl);
    if (!response.ok) {
      throw new Error(`Failed to download update: ${response.statusText}`);
    }

    task.downloadData = await response.arrayBuffer();
    task.status = UpdateStatus.Downloaded;
  }

  private async applyUpdate(task: UpdateTask): Promise<void> {
    // 验证更新包完整性
    const checksum = await this.calculateChecksum(task.downloadData);
    const expectedChecksum = await this.getRemoteChecksum(task.update.bundle);

    if (checksum !== expectedChecksum) {
      throw new Error('Update package checksum mismatch');
    }

    // 备份旧版本
    await this.backupBundle(task.update.bundle);

    // 应用更新
    const bundle = AssetBundle.deserialize(task.downloadData);
    await this.installBundle(task.update.bundle, bundle);

    task.status = UpdateStatus.Installed;
  }

  private async verifyUpdate(task: UpdateTask): Promise<void> {
    // 验证更新是否成功应用
    const bundle = await resourceManager.loadInBundle<AssetBundle>(
      task.update.bundle,
      'manifest.json'
    );

    if (bundle.version !== task.update.remoteVersion) {
      throw new Error('Update verification failed');
    }

    // 更新版本记录
    this.versionCache.set(task.update.bundle, task.update.remoteVersion);
    await this.saveVersionCache();
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  }
}

interface UpdateInfo {
  bundle: string;
  localVersion: string;
  remoteVersion: string;
  priority: number;
}

enum UpdateStatus {
  Pending,
  Downloading,
  Downloaded,
  Installing,
  Installed,
  Completed,
  Failed
}

class UpdateTask {
  public status: UpdateStatus = UpdateStatus.Pending;
  public downloadData?: ArrayBuffer;

  constructor(
    public update: UpdateInfo,
    public onComplete: () => void = () => {},
    public onError: (error: any) => void = () => {}
  ) {}
}
```

## 最佳实践

### 1. 资源组织结构

```
assets/
├── textures/
│   ├── diffuse/
│   ├── normal/
│   └── hdr/
├── models/
│   ├── characters/
│   └── environments/
├── audio/
│   ├── sfx/
│   └── music/
├── materials/
├── animations/
├── fonts/
└── bundles/
    ├── core.bundle
    ├── ui.bundle
    └── levels/
        ├── level1.bundle
        └── level2.bundle
```

### 2. 加载策略

```typescript
// 预加载核心资源
async function preloadCoreResources(): Promise<void> {
  const coreAssets = [
    'core/shaders.json',
    'core/materials.json',
    'core/textures/ui_atlas.png',
    'core/fonts/default.ttf'
  ];

  await Promise.all(
    coreAssets.map(path => resourceManager.load(path))
  );
}

// 场景切换时的资源管理
async function loadScene(sceneName: string): Promise<void> {
  // 1. 加载新场景资源
  const sceneAssets = await loadSceneAssets(sceneName);

  // 2. 等待关键资源加载完成
  await Promise.all(sceneAssets.critical);

  // 3. 隐藏加载界面，开始场景过渡
  hideLoadingScreen();

  // 4. 在后台继续加载非关键资源
  Promise.all(sceneAssets.optional).then(() => {
    console.log('All scene assets loaded');
  });
}
```

### 3. 内存管理

```typescript
// 定期清理未使用的资源
class ResourceCleaner {
  private cleanupInterval: number = 30000; // 30秒
  private maxAge: number = 300000; // 5分钟

  start(): void {
    setInterval(() => this.performCleanup(), this.cleanupInterval);
  }

  private performCleanup(): void {
    const resourceManager = engine.resourceManager;
    const resources = resourceManager.getAllResources();

    resources.forEach(resource => {
      if (this.shouldCleanup(resource)) {
        resource.release();
      }
    });

    // 强制垃圾回收
    if (window.gc) {
      window.gc();
    }
  }

  private shouldCleanup(resource: ReferResource): boolean {
    return resource.referenceCount === 0 &&
           this.getResourceAge(resource) > this.maxAge;
  }

  private getResourceAge(resource: ReferResource): number {
    // 计算资源最后使用时间到现在的时间差
    return Date.now() - resource.lastUsedTime;
  }
}
```

### 4. 错误处理和重试

```typescript
class RobustLoader {
  private maxRetries: number = 3;
  private retryDelay: number = 1000;
  private fallbackResources: Map<string, string> = new Map();

  async loadWithFallback<T>(path: string, type?: string): Promise<T> {
    try {
      return await this.loadWithRetry(path, type);
    } catch (error) {
      console.warn(`Failed to load ${path}, trying fallback...`);

      const fallbackPath = this.fallbackResources.get(path);
      if (fallbackPath) {
        return await this.loadWithRetry(fallbackPath, type);
      }

      throw error;
    }
  }

  private async loadWithRetry<T>(path: string, type?: string): Promise<T> {
    let lastError: any;

    for (let i = 0; i <= this.maxRetries; i++) {
      try {
        return await resourceManager.load<T>(path, type);
      } catch (error) {
        lastError = error;

        if (i < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
```

通过遵循这些资源管理指南，你可以构建一个高效、可靠的资源加载系统，为用户提供流畅的3D应用体验。