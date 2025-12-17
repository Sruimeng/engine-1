---
id: "guide-rendering-basics"
type: "guide"
title: "渲染基础指南"
description: "详细介绍相机系统、光照、阴影、渲染队列和后处理效果"
tags: ["guide", "rendering", "camera", "lighting", "shadows", "post-processing"]
context_dependency: ["coding-conventions"]
related_ids: ["guide-material-system", "guide-performance-optimization"]
---

渲染是3D引擎的核心功能，本指南详细介绍Galacean Engine的渲染系统，包括相机、光照、阴影、后处理等基础渲染概念和实践。

## 目录
- [渲染管线概述](#渲染管线概述)
- [相机系统](#相机系统)
- [光照系统](#光照系统)
- [阴影系统](#阴影系统)
- [渲染队列](#渲染队列)
- [后处理效果](#后处理效果)
- [渲染优化](#渲染优化)
- [常见问题](#常见问题)

## 渲染管线概述

### 渲染流程

Galacean Engine的渲染管线包含以下主要阶段：

1. **Culling（剔除）**: 视锥剔除和遮挡剔除
2. **Sorting（排序）**: 按材质和深度排序
3. **Drawing（绘制）**: 几何体绘制
4. **Post-processing（后处理）**: 屏幕空间效果

### 渲染基础设置

```typescript
import { Engine, RenderSettings } from '@galacean/engine';

const engine = await Engine.init({
  canvas: canvas,
  renderSettings: {
    // 渲染设置
    gammaCorrection: true,
    toneMapping: ToneMappingMode.ACES,
    antialiasing: true,
    enableHDR: true,

    // 质量设置
    shadowQuality: ShadowQuality.Medium,
    textureQuality: TextureQuality.High,
    renderScale: 1.0
  }
});

// 运行时修改渲染设置
engine.renderSettings.antialiasing = false;
engine.renderSettings.renderScale = 0.8; // 降低分辨率提高性能
```

## 相机系统

### 相机类型

```typescript
import { Camera, CameraType, Viewport } from '@galacean/engine';

// 创建相机实体
const cameraEntity = scene.createRootEntity('MainCamera');
const camera = cameraEntity.addComponent(Camera);

// 1. 透视相机（默认）
camera.type = CameraType.Perspective;
camera.fieldOfView = 60;  // 视野角度
camera.nearClipPlane = 0.1;
camera.farClipPlane = 1000;
camera.aspectRatio = canvas.width / canvas.height;

// 2. 正交相机
camera.type = CameraType.Orthographic;
camera.orthographicSize = 10;  // 一半高度
camera.nearClipPlane = -100;
camera.farClipPlane = 100;
```

### 相机控制

```typescript
// 相机移动
cameraEntity.transform.position.set(0, 2, 10);
cameraEntity.transform.lookAt(new Vector3(0, 0, 0));

// 视口设置（用于多相机渲染）
camera.viewport = new Viewport(0, 0, 0.5, 1); // 左半屏
camera2.viewport = new Viewport(0.5, 0, 0.5, 1); // 右半屏

// 渲染层
camera.cullingMask = Layer.getMask(Layer.Layer1) | Layer.getMask(Layer.Layer2);

// 清除标志
camera.clearFlags = CameraClearFlags.SolidColor;
camera.backgroundColor = new Color(0.2, 0.2, 0.2, 1.0);

// 深度
camera.depth = 0; // 渲染顺序，小的先渲染
```

### 相机控制器

```typescript
// 第一人称相机控制器
class FirstPersonCamera extends Script {
  private mouseSensitivity: number = 2;
  private moveSpeed: number = 5;
  private pitch: number = 0;
  private yaw: number = 0;

  onUpdate(deltaTime: number): void {
    this.handleMouseLook();
    this.handleMovement(deltaTime);
  }

  private handleMouseLook(): void {
    const inputManager = this.engine.inputManager;
    const mouseDelta = inputManager.mousePositionDelta;

    // 旋转相机
    this.yaw += mouseDelta.x * this.mouseSensitivity * 0.01;
    this.pitch -= mouseDelta.y * this.mouseSensitivity * 0.01;

    // 限制俯仰角
    this.pitch = Math.max(-89, Math.min(89, this.pitch));

    // 应用旋转
    this.entity.transform.rotation.set(this.pitch, this.yaw, 0);
  }

  private handleMovement(deltaTime: number): void {
    const transform = this.entity.transform;
    const forward = transform.getWorldForward();
    const right = transform.getWorldRight();

    const moveSpeed = this.moveSpeed * deltaTime;

    // WASD移动
    const inputManager = this.engine.inputManager;
    if (inputManager.isKeyDown('KeyW')) {
      transform.translate(forward.scale(moveSpeed), false);
    }
    if (inputManager.isKeyDown('KeyS')) {
      transform.translate(forward.scale(-moveSpeed), false);
    }
    if (inputManager.isKeyDown('KeyA')) {
      transform.translate(right.scale(-moveSpeed), false);
    }
    if (inputManager.isKeyDown('KeyD')) {
      transform.translate(right.scale(moveSpeed), false);
    }
  }
}

// 第三人称相机控制器
class ThirdPersonCamera extends Script {
  private target: Entity;
  private distance: number = 5;
  private height: number = 2;
  private rotationSpeed: number = 5;
  private currentAngle: number = 0;

  constructor(target: Entity) {
    super();
    this.target = target;
  }

  onUpdate(deltaTime: number): void {
    // 计算相机位置
    const targetPos = this.target.transform.position;
    const targetRotation = this.target.transform.rotation;

    // 跟随目标
    this.currentAngle += deltaTime * this.rotationSpeed;

    const cameraX = Math.sin(this.currentAngle) * this.distance;
    const cameraZ = Math.cos(this.currentAngle) * this.distance;

    this.entity.transform.position.set(
      targetPos.x + cameraX,
      targetPos.y + this.height,
      targetPos.z + cameraZ
    );

    // 查看目标
    this.entity.transform.lookAt(targetPos);
  }
}
```

### 多相机渲染

```typescript
// 分屏渲染
class SplitScreenManager {
  private mainCamera: Camera;
  private minimapCamera: Camera;

  constructor(scene: Scene) {
    this.setupMainCamera(scene);
    this.setupMinimapCamera(scene);
  }

  private setupMainCamera(scene: Scene): void {
    const cameraEntity = scene.createRootEntity('MainCamera');
    this.mainCamera = cameraEntity.addComponent(Camera);
    this.mainCamera.viewport = new Viewport(0, 0, 0.75, 1); // 左侧75%
    this.mainCamera.aspectRatio = (canvas.width * 0.75) / canvas.height;
  }

  private setupMinimapCamera(scene: Scene): void {
    const minimapEntity = scene.createRootEntity('MinimapCamera');
    this.minimapCamera = minimapEntity.addComponent(Camera);
    this.minimapCamera.type = CameraType.Orthographic;
    this.minimapCamera.orthographicSize = 50;
    this.minimapCamera.viewport = new Viewport(0.75, 0, 0.25, 1); // 右侧25%
    this.minimapCamera.clearFlags = CameraClearFlags.DepthOnly; // 不清除颜色
    this.minimapCamera.cullingMask = Layer.getMask(Layer.Layer3); // 只渲染特定层
  }
}

// 渲染到纹理
class RenderToTexture {
  private renderCamera: Camera;
  private renderTexture: RenderTexture;

  constructor(scene: Scene, engine: Engine) {
    // 创建渲染纹理
    this.renderTexture = new RenderTexture(engine, 512, 512);
    this.renderTexture.depthBufferFormat = DepthBufferFormat.Depth24Stencil8;

    // 创建渲染相机
    const cameraEntity = scene.createRootEntity('RenderCamera');
    this.renderCamera = cameraEntity.addComponent(Camera);
    this.renderCamera.renderTarget = this.renderTexture;
    this.renderCamera.enabled = false; // 手动控制渲染
  }

  render(): void {
    this.renderCamera.render();
  }

  getTexture(): RenderTexture {
    return this.renderTexture;
  }
}
```

## 光照系统

### 光照类型

```typescript
import {
  DirectLight, PointLight, SpotLight, AmbientLight,
  Color, Vector3
} from '@galacean/engine';

// 1. 平行光（太阳光）
const sunLight = scene.createRootEntity('SunLight');
const directLight = sunLight.addComponent(DirectLight);
directLight.color = new Color(1, 0.95, 0.8, 1); // 暖黄色
directLight.intensity = 1.2;
sunLight.transform.rotation.set(45, -45, 0); // 设置光照方向

// 2. 点光源
const pointLightEntity = scene.createRootEntity('PointLight');
const pointLight = pointLightEntity.addComponent(PointLight);
pointLight.color = new Color(1, 1, 1, 1); // 白光
pointLight.intensity = 2;
pointLight.distance = 20; // 影响范围
pointLightEntity.transform.position.set(5, 5, 0);

// 3. 聚光灯
const spotLightEntity = scene.createRootEntity('SpotLight');
const spotLight = spotLightEntity.addComponent(SpotLight);
spotLight.color = new Color(1, 0.8, 0.6, 1); // 暖光
spotLight.intensity = 3;
spotLight.distance = 30;
spotLight.angle = Math.PI / 6; // 30度聚光角度
spotLight.penumbra = 0.1;       // 边缘软化
spotLightEntity.transform.position.set(0, 10, 0);
spotLightEntity.transform.lookAt(new Vector3(0, 0, 0));

// 4. 环境光
scene.ambientLight.diffuse = new Color(0.2, 0.2, 0.3, 1); // 微蓝色
scene.ambientLight.diffuseIntensity = 0.5;
scene.ambientLight.specularIntensity = 0.3;
```

### 光照贴图

```typescript
// 加载光照贴图
async function setupLightmaps(scene: Scene): Promise<void> {
  const lightmap = await engine.resourceManager.load<Texture2D>('lightmap.png');

  // 应用到场景
  scene.ambientLight.diffuseTexture = lightmap;
  scene.ambientLight.diffuseIntensity = 1.0;

  // 应用到材质
  const materials = findObjectsByType<MeshRenderer>(scene).map(r => r.material);
  materials.forEach(material => {
    if (material.shaderData.hasTexture('u_lightmap')) {
      material.shaderData.setTexture('u_lightmap', lightmap);
    }
  });
}

// 多光照贴图支持
class MultiLightmapSystem {
  private lightmaps: Texture2D[] = [];
  private lightmapIndex: Map<Entity, number> = new Map();

  addLightmap(lightmap: Texture2D): number {
    this.lightmaps.push(lightmap);
    return this.lightmaps.length - 1;
  }

  setLightmapIndex(entity: Entity, index: number): void {
    this.lightmapIndex.set(entity, index);
  }

  applyLightmaps(): void {
    this.lightmapIndex.forEach((index, entity) => {
      const renderer = entity.getComponent(MeshRenderer);
      if (renderer && this.lightmaps[index]) {
        renderer.lightmapIndex = index;
      }
    });
  }
}
```

### 烘焙光照

```typescript
class BakedLighting {
  private bakeSettings: {
    resolution: number;
    samples: number;
    bounceCount: number;
    indirectIntensity: number;
  };

  constructor() {
    this.bakeSettings = {
      resolution: 1024,
      samples: 256,
      bounceCount: 3,
      indirectIntensity: 1.0
    };
  }

  async bakeLighting(scene: Scene): Promise<void> {
    // 准备烘焙数据
    const bakeData = this.prepareBakeData(scene);

    // 执行烘焙
    const lightmaps = await this.performBake(bakeData);

    // 应用结果
    this.applyLightmaps(scene, lightmaps);
  }

  private prepareBakeData(scene: Scene): BakeData {
    const renderers = scene.findComponents(MeshRenderer);
    const lights = scene.findComponents(DirectLight, PointLight, SpotLight);

    return {
      geometry: renderers.map(r => ({
        mesh: r.mesh,
        transform: r.entity.transform.matrix
      })),
      lights: lights.map(l => ({
        type: l.constructor.name,
        color: l.color,
        intensity: l.intensity,
        position: l.entity.transform.position,
        rotation: l.entity.transform.rotation
      }))
    };
  }

  private async performBake(bakeData: BakeData): Promise<Texture2D[]> {
    // 实现烘焙算法（路径追踪/光子映射）
    const lightmaps: Texture2D[] = [];

    // 为每个物体生成光照贴图
    for (const geometry of bakeData.geometry) {
      const lightmap = await this.bakeSingleObject(geometry, bakeData.lights);
      lightmaps.push(lightmap);
    }

    return lightmaps;
  }

  private async bakeSingleObject(
    geometry: any,
    lights: any[]
  ): Promise<Texture2D> {
    // 生成UV展开
    const uvMap = this.generateUVMap(geometry.mesh);

    // 计算光照
    const lightData = this.calculateLighting(geometry, lights, uvMap);

    // 生成纹理
    const lightmap = new Texture2D(engine, this.bakeSettings.resolution, this.bakeSettings.resolution);
    lightmap.setPixelBuffer(lightData);

    return lightmap;
  }
}
```

### 动态光照

```typescript
class DynamicLightingSystem {
  private dynamicLights: Light[] = [];
  private lightVolumeMeshes: Map<Light, Mesh> = new Map();

  addDynamicLight(light: Light): void {
    this.dynamicLights.push(light);
    this.createLightVolume(light);
  }

  private createLightVolume(light: Light): void {
    let volumeMesh: Mesh;

    if (light instanceof PointLight) {
      // 创建球体体积
      volumeMesh = PrimitiveMesh.createSphere(engine, light.distance);
    } else if (light instanceof SpotLight) {
      // 创建圆锥体积
      volumeMesh = this.createConeMesh(light.angle, light.distance);
    } else {
      return;
    }

    this.lightVolumeMeshes.set(light, volumeMesh);
  }

  renderLightVolumes(renderer: Renderer): void {
    // 使用模板缓冲或体积光技术渲染动态光照
    this.dynamicLights.forEach(light => {
      const volumeMesh = this.lightVolumeMeshes.get(light);
      if (volumeMesh) {
        this.renderLightVolume(light, volumeMesh, renderer);
      }
    });
  }

  private renderLightVolume(light: Light, volumeMesh: Mesh, renderer: Renderer): void {
    // 设置光照着色器
    const material = new Material(engine, this.getLightVolumeShader());
    material.shaderData.setColor('u_lightColor', light.color);
    material.shaderData.setFloat('u_lightIntensity', light.intensity);
    material.shaderData.setMatrix('u_lightMatrix', light.entity.transform.matrix);

    // 渲染体积
    renderer.drawMesh(volumeMesh, 0, material);
  }
}
```

## 阴影系统

### 阴影设置

```typescript
import { ShadowResolution, ShadowType, CascadedShadowMaps } from '@galacean/engine';

// 启用场景阴影
scene.castShadows = true;
scene.shadowResolution = ShadowResolution.High; // 2048x2048

// 光源阴影设置
const directLight = sunLight.getComponent(DirectLight);
directLight.shadowType = ShadowType.Hard;      // 硬阴影
directLight.shadowStrength = 0.8;              // 阴影强度
directLight.shadowBias = 0.005;                // 阴影偏移
directLight.shadowNormalBias = 0.1;            // 法线偏移

// 点光源阴影
const pointLight = pointLightEntity.getComponent(PointLight);
pointLight.shadowType = ShadowType.Soft;
pointLight.shadowStrength = 0.6;
pointLight.shadowNearPlane = 0.1;
pointLight.shadowFarPlane = 50;
```

### 级联阴影贴图（CSM）

```typescript
// 为平行光设置级联阴影
const csm = directLight.cascadedShadowMaps;
csm.enabled = true;
csm.cascadeCount = 4;                    // 4个级联
csm.cascadeSplit1 = 0.067;              // 分割距离（近）
csm.cascadeSplit2 = 0.133;
csm.cascadeSplit3 = 0.267;
csm.cascadeSplit4 = 0.533;              // 分割距离（远）

// 级联可视化调试
class CascadeVisualizer extends Script {
  private camera: Camera;
  private csm: CascadedShadowMaps;

  onAwake(): void {
    this.camera = this.entity.getComponent(Camera);
    this.csm = scene.findComponent(DirectLight).cascadedShadowMaps;
  }

  onPostRender(): void {
    if (this.csm.enabled) {
      this.visualizeCascades();
    }
  }

  private visualizeCascades(): void {
    const gizmo = this.engine.gizmo;

    for (let i = 0; i < this.csm.cascadeCount; i++) {
      const cascadeBounds = this.csm.getCascadeBounds(i, this.camera);

      // 绘制级联边界
      gizmo.drawWireBox(
        cascadeBounds.center,
        cascadeBounds.size,
        new Color(1, 1 - i * 0.2, 0, 0.3)
      );
    }
  }
}
```

### 软阴影

```typescript
// PCF软阴影实现
class SoftShadows {
  private pcfKernel: Vector2[] = [];
  private kernelSize: number = 9;

  constructor() {
    this.generatePCFKernel();
  }

  private generatePCFKernel(): void {
    const radius = 2.0;
    const samples = this.kernelSize;

    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * Math.PI * 2;
      const distance = Math.sqrt(i / samples) * radius;

      this.pcfKernel.push(new Vector2(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance
      ));
    }
  }

  getSoftShadowShader(): Shader {
    const fragmentSource = `
      precision highp float;

      uniform sampler2D u_shadowMap;
      uniform vec2 u_texelSize;
      uniform float u_shadowBias;
      uniform vec2 u_pcfKernel[9];

      varying vec4 v_shadowPosition;

      float calculateShadow() {
        vec3 projCoords = v_shadowPosition.xyz / v_shadowPosition.w;
        projCoords = projCoords * 0.5 + 0.5;

        float shadow = 0.0;
        float currentDepth = projCoords.z;

        // PCF采样
        for (int i = 0; i < 9; i++) {
          vec2 offset = u_pcfKernel[i] * u_texelSize;
          float closestDepth = texture2D(u_shadowMap, projCoords.xy + offset).r;
          shadow += currentDepth - u_shadowBias > closestDepth ? 0.0 : 1.0;
        }

        return shadow / 9.0;
      }
    `;

    return Shader.create('SoftShadow', '', fragmentSource);
  }
}
```

### 阴影优化

```typescript
class ShadowOptimizer {
  private shadowDistance = 50;  // 阴影渲染距离
  private shadowLodLevels = 3;  // 阴影LOD级别

  updateShadowQuality(camera: Camera, scene: Scene): void {
    const cameraPos = camera.transform.position;

    // 为远处的物体降低阴影质量
    scene.findComponents(DirectLight).forEach(light => {
      light.shadowResolution = this.calculateShadowResolution(cameraPos);
    });
  }

  private calculateShadowResolution(cameraPos: Vector3): ShadowResolution {
    const maxDistance = this.shadowDistance;
    const quality = 1 - this.getAverageObjectDistance(cameraPos) / maxDistance;

    if (quality > 0.8) return ShadowResolution.VeryHigh;
    if (quality > 0.6) return ShadowResolution.High;
    if (quality > 0.4) return ShadowResolution.Medium;
    if (quality > 0.2) return ShadowResolution.Low;
    return ShadowResolution.VeryLow;
  }

  private getAverageObjectDistance(cameraPos: Vector3): number {
    const renderers = scene.findComponents(MeshRenderer);
    let totalDistance = 0;
    let count = 0;

    renderers.forEach(renderer => {
      const distance = Vector3.distance(
        cameraPos,
        renderer.entity.transform.position
      );
      totalDistance += distance;
      count++;
    });

    return count > 0 ? totalDistance / count : 0;
  }
}
```

## 渲染队列

### 自定义渲染队列

```typescript
import { RenderQueueType, RenderQueue } from '@galacean/engine';

// 创建自定义渲染队列
const transparentQueue = new RenderQueue(RenderQueueType.Transparent, 2000);
const overlayQueue = new RenderQueue(RenderQueueType.Transparent, 3000);

// 添加到渲染器
engine.renderer.addQueue(transparentQueue);
engine.renderer.addQueue(overlayQueue);

// 材质队列设置
material.renderQueue = 2000; // 在透明队列之后渲染
```

### 渲染顺序控制

```typescript
class RenderOrderController {
  private sortingGroups: Map<number, Entity[]> = new Map();

  addToGroup(entity: Entity, order: number): void {
    if (!this.sortingGroups.has(order)) {
      this.sortingGroups.set(order, []);
    }
    this.sortingGroups.get(order)!.push(entity);
  }

  updateRenderOrder(): void {
    const sortedOrders = Array.from(this.sortingGroups.keys()).sort((a, b) => a - b);

    sortedOrders.forEach((order, index) => {
      const entities = this.sortingGroups.get(order)!;
      entities.forEach(entity => {
        const renderer = entity.getComponent(Renderer);
        if (renderer) {
          renderer.renderOrder = index * 100;
        }
      });
    });
  }
}
```

### 批量渲染

```typescript
class InstancedRenderer {
  private instanceData: Float32Array;
  private maxInstances: number = 1000;
  private instanceCount: number = 0;

  constructor() {
    this.instanceData = new Float32Array(this.maxInstances * 16); // 4x4矩阵
  }

  addInstance(transform: Transform): boolean {
    if (this.instanceCount >= this.maxInstances) {
      return false;
    }

    const index = this.instanceCount * 16;
    const matrix = transform.matrix.elements;

    // 复制变换矩阵
    for (let i = 0; i < 16; i++) {
      this.instanceData[index + i] = matrix[i];
    }

    this.instanceCount++;
    return true;
  }

  render(mesh: Mesh, material: Material): void {
    if (this.instanceCount === 0) return;

    // 更新实例数据缓冲区
    material.shaderData.setBuffer('u_instanceMatrix', this.instanceData);
    material.shaderData.setInt('u_instanceCount', this.instanceCount);

    // 执行实例化绘制
    const renderer = engine.renderer;
    renderer.drawInstanced(mesh, material, this.instanceCount);

    this.instanceCount = 0; // 重置计数器
  }
}
```

## 后处理效果

### 基础后处理

```typescript
import {
  PostProcessManager, BloomEffect, ToneMappingEffect,
  VignetteEffect, ColorGradingEffect, FXAAEffect
} from '@galacean/engine';

const camera = cameraEntity.getComponent(Camera);
const postProcessManager = camera.postProcessManager;

// 1. 泛光效果
const bloomEffect = postProcessManager.addEffect(BloomEffect);
bloomEffect.threshold = 1.0;      // 亮度阈值
bloomEffect.intensity = 1.5;      // 泛光强度
bloomEffect.blurIterations = 5;   // 模糊迭代次数

// 2. 色调映射
const toneMappingEffect = postProcessManager.addEffect(ToneMappingEffect);
toneMappingEffect.type = ToneMappingType.ACES; // ACES色调映射

// 3. 暗角效果
const vignetteEffect = postProcessManager.addEffect(VignetteEffect);
vignetteEffect.intensity = 0.5;    // 暗角强度
vignetteEffect.smoothness = 0.5;  // 平滑度

// 4. 颜色分级
const colorGradingEffect = postProcessManager.addEffect(ColorGradingEffect);
colorGradingEffect.contrast = 1.1;   // 对比度
colorGradingEffect.saturation = 1.2; // 饱和度
colorGradingEffect.gamma = 1.0;      // 伽马值

// 5. 抗锯齿
const fxaaEffect = postProcessManager.addEffect(FXAAEffect);
fxaaEdgeThreshold = 0.063;
fxaaEdgeThresholdMin = 0.0312;
```

### 自定义后处理效果

```typescript
// 自定义后处理效果基类
class CustomPostProcessEffect extends PostProcessEffect {
  protected material: Material;

  constructor(engine: Engine, shaderName: string) {
    super();
    this.material = new Material(engine, Shader.find(shaderName));
  }

  onRender(context: RenderContext, source: RenderTarget, destination: RenderTarget): void {
    this.material.shaderData.setTexture('u_sourceTexture', source);

    const renderer = context.renderer;
    renderer.blit(this.material, destination);
  }
}

// 景深效果
class DepthOfFieldEffect extends CustomPostProcessEffect {
  private focusDistance: number = 10;
  private aperture: number = 5.6;
  private maxBlurSize: number = 10;

  constructor(engine: Engine) {
    super(engine, 'DepthOfFieldShader');
    this.setupMaterial();
  }

  private setupMaterial(): void {
    this.material.shaderData.setFloat('u_focusDistance', this.focusDistance);
    this.material.shaderData.setFloat('u_aperture', this.aperture);
    this.material.shaderData.setFloat('u_maxBlurSize', this.maxBlurSize);
  }

  setFocusDistance(distance: number): void {
    this.focusDistance = distance;
    this.material.shaderData.setFloat('u_focusDistance', distance);
  }
}

// 运动模糊效果
class MotionBlurEffect extends CustomPostProcessEffect {
  private motionStrength: number = 0.5;

  constructor(engine: Engine) {
    super(engine, 'MotionBlurShader');
  }

  onRender(context: RenderContext, source: RenderTarget, destination: RenderTarget): void {
    const camera = context.camera;
    const viewProjection = camera.viewProjectionMatrix;
    const previousViewProjection = camera.previousViewProjectionMatrix;

    this.material.shaderData.setTexture('u_sourceTexture', source);
    this.material.shaderData.setTexture('u_depthTexture', source.depthTexture);
    this.material.shaderData.setMatrix('u_viewProjection', viewProjection);
    this.material.shaderData.setMatrix('u_previousViewProjection', previousViewProjection);
    this.material.shaderData.setFloat('u_motionStrength', this.motionStrength);

    context.renderer.blit(this.material, destination);
  }
}
```

### 高级后处理

```typescript
// 屏幕空间反射（SSR）
class ScreenSpaceReflection extends PostProcessEffect {
  private maxRayDistance: number = 100;
  private resolution: number = 0.5; // 降低分辨率提升性能

  onRender(context: RenderContext, source: RenderTarget, destination: RenderTarget): void {
    const camera = context.camera;

    // 获取深度和法线
    const depthTexture = source.depthTexture;
    const normalTexture = this.getNormalTexture();

    // 执行SSR
    this.performSSR(context, source, destination, depthTexture, normalTexture);
  }

  private performSSR(
    context: RenderContext,
    source: RenderTarget,
    destination: RenderTarget,
    depthTexture: RenderTexture,
    normalTexture: RenderTexture
  ): void {
    const material = this.material;
    material.shaderData.setTexture('u_colorTexture', source);
    material.shaderData.setTexture('u_depthTexture', depthTexture);
    material.shaderData.setTexture('u_normalTexture', normalTexture);
    material.shaderData.setMatrix('u_inverseViewProjection', camera.inverseViewProjectionMatrix);
    material.shaderData.setFloat('u_maxRayDistance', this.maxRayDistance);

    // 降低分辨率渲染
    const lowResTarget = this.createLowResRenderTarget(source);
    context.renderer.blit(material, lowResTarget);

    // 放大到最终分辨率
    this.upscale(lowResTarget, destination);
  }
}

// 体积光/光线效果
class VolumetricLighting extends PostProcessEffect {
  private lightScattering: number = 0.3;
  private sampleCount: number = 64;

  onRender(context: RenderContext, source: RenderTarget, destination: RenderTarget): void {
    const camera = context.camera;
    const light = scene.findComponent(DirectLight);

    this.material.shaderData.setTexture('u_sourceTexture', source);
    this.material.shaderData.setTexture('u_depthTexture', source.depthTexture);
    this.material.shaderData.setVector3('u_lightDirection', light.entity.transform.getWorldForward());
    this.material.shaderData.setColor('u_lightColor', light.color);
    this.material.shaderData.setFloat('u_lightScattering', this.lightScattering);
    this.material.shaderData.setInt('u_sampleCount', this.sampleCount);

    context.renderer.blit(this.material, destination);
  }
}
```

## 渲染优化

### 渲染优化策略

```typescript
class RenderingOptimizer {
  private lodSettings = {
    enabled: true,
    distances: [10, 25, 50],
    qualityLevels: ['high', 'medium', 'low']
  };

  private cullingSettings = {
    frustumCulling: true,
    occlusionCulling: true,
    smallObjectCulling: true,
    smallObjectThreshold: 0.01 // 屏幕空间大小阈值
  };

  updateOptimizations(camera: Camera, scene: Scene): void {
    this.updateLOD(camera, scene);
    this.updateCulling(camera, scene);
    this.updateRenderSettings(camera);
  }

  private updateLOD(camera: Camera, scene: Scene): void {
    if (!this.lodSettings.enabled) return;

    const lodGroups = scene.findComponents(LODGroup);
    lodGroups.forEach(lodGroup => {
      const distance = Vector3.distance(
        camera.transform.position,
        lodGroup.transform.position
      );

      let lodLevel = 0;
      for (let i = 0; i < this.lodSettings.distances.length; i++) {
        if (distance > this.lodSettings.distances[i]) {
          lodLevel++;
        }
      }

      lodGroup.currentLOD = Math.min(lodLevel, this.lodSettings.qualityLevels.length - 1);
    });
  }

  private updateCulling(camera: Camera, scene: Scene): void {
    if (this.cullingSettings.frustumCulling) {
      this.performFrustumCulling(camera, scene);
    }

    if (this.cullingSettings.occlusionCulling) {
      this.performOcclusionCulling(scene);
    }

    if (this.cullingSettings.smallObjectCulling) {
      this.performSmallObjectCulling(camera, scene);
    }
  }

  private performFrustumCulling(camera: Camera, scene: Scene): void {
    const frustum = camera.frustum;
    const renderers = scene.findComponents(MeshRenderer);

    renderers.forEach(renderer => {
      const bounds = renderer.bounds;
      renderer.isCulled = !frustum.intersects(bounds);
    });
  }

  private performSmallObjectCulling(camera: Camera, scene: Scene): void {
    const renderers = scene.findComponents(MeshRenderer);

    renderers.forEach(renderer => {
      const bounds = renderer.bounds;
      const screenBounds = this.projectBoundsToScreen(bounds, camera);

      const screenSize = Math.max(screenBounds.width, screenBounds.height);
      renderer.isCulled = screenSize < this.cullingSettings.smallObjectThreshold;
    });
  }
}
```

### 动态分辨率

```typescript
class DynamicResolutionManager {
  private targetFrameTime: number = 16.67; // 60 FPS
  private minRenderScale: number = 0.5;
  private maxRenderScale: number = 1.0;
  private currentScale: number = 1.0;

  update(): void {
    const frameTime = engine.frameTime;

    if (frameTime > this.targetFrameTime * 1.2) {
      // 帧率过低，降低分辨率
      this.currentScale = Math.max(
        this.minRenderScale,
        this.currentScale * 0.95
      );
    } else if (frameTime < this.targetFrameTime * 0.8) {
      // 帧率充足，提高分辨率
      this.currentScale = Math.min(
        this.maxRenderScale,
        this.currentScale * 1.02
      );
    }

    engine.renderSettings.renderScale = this.currentScale;
  }
}
```

## 常见问题

### Q1: 如何解决阴影闪烁（Shadow Acne）？

**A:** 调整阴影偏移设置：
```typescript
const light = scene.findComponent(DirectLight);
light.shadowBias = 0.002;           // 增加偏差
light.shadowNormalBias = 0.1;       // 增加法线偏差
light.shadowStrength = 0.8;         // 减少阴影强度
```

### Q2: 如何优化透明物体的渲染性能？

**A:** 使用透明物体排序和批处理：
```typescript
class TransparentRenderer {
  private sortedTransparentObjects: MeshRenderer[] = [];

  updateTransparentQueue(camera: Camera): void {
    // 收集透明物体
    const transparentRenderers = scene.findComponents(MeshRenderer)
      .filter(r => r.material.isTransparent);

    // 按距离相机排序（从远到近）
    transparentRenderers.sort((a, b) => {
      const distA = Vector3.distance(camera.transform.position, a.entity.transform.position);
      const distB = Vector3.distance(camera.transform.position, b.entity.transform.position);
      return distB - distA;
    });

    this.sortedTransparentObjects = transparentRenderers;
  }

  renderTransparentObjects(): void {
    this.sortedTransparentObjects.forEach(renderer => {
      if (!renderer.isCulled) {
        renderer.render();
      }
    });
  }
}
```

### Q3: 如何实现延迟渲染？

**A:** 创建G-Buffer和延迟渲染管线：
```typescript
class DeferredRenderer {
  private gBuffer: RenderTarget[];
  private lightingShader: Shader;

  constructor() {
    this.createGBuffer();
    this.setupLightingShader();
  }

  private createGBuffer(): void {
    this.gBuffer = [
      new RenderTexture(engine, 1920, 1080, TextureFormat.RGBA8), // Albedo
      new RenderTexture(engine, 1920, 1080, TextureFormat.RGBA8), // Normal
      new RenderTexture(engine, 1920, 1080, TextureFormat.RGBA8), // Metallic/Roughness
      new RenderTexture(engine, 1920, 1080, TextureFormat.DEPTH24_STENCIL8) // Depth
    ];
  }

  renderGeometryPass(scene: Scene, camera: Camera): void {
    // 渲染几何到G-Buffer
    const renderers = scene.findComponents(MeshRenderer);

    this.gBuffer.forEach(target => {
      camera.setRenderTarget(target);
      camera.clear();
    });

    renderers.forEach(renderer => {
      if (!renderer.isCulled && !renderer.material.isTransparent) {
        this.renderToGBuffer(renderer);
      }
    });
  }

  renderLightingPass(camera: Camera, destination: RenderTarget): void {
    // 使用G-Buffer进行光照计算
    camera.setRenderTarget(destination);

    this.lightingShader.shaderData.setTexture('u_albedoTexture', this.gBuffer[0]);
    this.lightingShader.shaderData.setTexture('u_normalTexture', this.gBuffer[1]);
    this.lightingShader.shaderData.setTexture('u_metallicRoughnessTexture', this.gBuffer[2]);
    this.lightingShader.shaderData.setTexture('u_depthTexture', this.gBuffer[3]);

    engine.renderer.blit(this.lightingShader.material, destination);
  }
}
```

### Q4: 如何处理大场景的渲染？

**A:** 实现场景分块和流式加载：
```typescript
class ChunkedRenderer {
  private chunkSize: number = 100;
  private loadRadius: number = 200;
  private loadedChunks: Map<string, SceneChunk> = new Map();

  update(camera: Camera): void {
    const cameraPos = camera.transform.position;
    const chunkCoord = this.worldToChunkCoord(cameraPos);

    // 加载附近的场景块
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        const chunkX = chunkCoord.x + x;
        const chunkZ = chunkCoord.z + z;
        const chunkKey = `${chunkX}_${chunkZ}`;

        if (!this.loadedChunks.has(chunkKey)) {
          this.loadChunk(chunkX, chunkZ);
        }
      }
    }

    // 卸载远处的场景块
    this.loadedChunks.forEach((chunk, key) => {
      const distance = Vector3.distance(
        cameraPos,
        chunk.center
      );

      if (distance > this.loadRadius) {
        this.unloadChunk(key);
      }
    });
  }

  private worldToChunkCoord(worldPos: Vector3): { x: number, z: number } {
    return {
      x: Math.floor(worldPos.x / this.chunkSize),
      z: Math.floor(worldPos.z / this.chunkSize)
    };
  }
}
```

通过遵循这些渲染指南，你可以充分利用Galacean Engine的渲染能力，创建高质量的3D视觉体验。

## ⚠️ 禁止事项

### 关键约束
- **坐标系统**: 渲染空间必须使用右手坐标系，相机朝向负Z轴，不可更改
- **矩阵精度**: MVP变换矩阵必须使用浮点精度，不可使用整数矩阵
- **光照衰减**: 光照衰减公式必须遵循物理规律，禁止使用负数衰减系数
- **裁剪空间**: 顶点着色器输出必须在[-1,1]的NDC空间内，超出范围会被裁剪

### 常见错误
- **相机近裁剪面**: 设置过大数值导致近距离物体被裁剪，应保持合理范围0.1-1.0
- **光照计算顺序**: 在错误的渲染阶段进行光照计算，如在顶点着色器中进行逐像素光照
- **阴影贴图偏移**: 未设置合适的阴影偏移量，导致表面产生自阴影（Peter Panning）
- **深度缓冲冲突**: 未正确管理深度测试状态，导致透明物体渲染顺序错误

### 最佳实践
- **相机层级**: 复杂场景使用多个相机分层渲染，如UI、主场景、特效分别渲染
- **光照烘焙**: 静态场景使用光照贴图替代实时计算，动态元素再添加实时光
- **阴影优化**: 根据距离使用不同分辨率的阴影贴图，远处物体使用低分辨率
- **后处理顺序**: 按正确顺序应用后处理：Bloom → Tonemap → FXAA → Color Grading
- **视锥剔除**: 对实体进行视锥剔除，避免向GPU提交不可见的几何体数据