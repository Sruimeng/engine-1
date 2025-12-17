---
id: "guide-material-system"
type: "guide"
title: "材质系统使用指南"
description: "详细介绍PBR材质、着色器系统、纹理管理和材质实例化"
tags: ["guide", "material", "pbr", "shader", "texture", "rendering"]
context_dependency: ["coding-conventions"]
related_ids: ["guide-rendering-basics", "guide-performance-optimization"]
---

材质系统是Galacean Engine渲染的核心，负责定义物体的外观和渲染特性。本指南详细介绍如何使用和定制材质系统。

## 目录
- [材质基础](#材质基础)
- [内置材质类型](#内置材质类型)
- [PBR材质](#pbr材质)
- [着色器系统](#着色器系统)
- [纹理管理](#纹理管理)
- [材质实例化](#材质实例化)
- [材质动画](#材质动画)
- [性能优化](#性能优化)
- [最佳实践](#最佳实践)

## 材质基础

### 什么是材质

材质（Material）定义了物体如何与光照交互，包括：
- 表面颜色和纹理
- 光照模型（漫反射、镜面反射等）
- 渲染模式（不透明、透明、裁剪）
- 物理属性（金属度、粗糙度等）

### 基本材质创建

```typescript
import { Material, Engine } from '@galacean/engine';

const engine = await Engine.init({ canvas: canvas });
const material = new Material(engine);

// 基础设置
material.name = 'MyMaterial';
material.isTransparent = false;
material.renderQueueType = RenderQueueType.Opaque;
```

### 材质属性

```typescript
// 渲染状态
material.isTransparent = false;     // 是否透明
material.alphaTest = false;         // 是否开启Alpha测试
material.cullMode = CullMode.Back;  // 裁剪模式
material.depthWrite = true;         // 是否写入深度
material.depthTest = true;          // 是否开启深度测试

// 渲染队列
material.renderQueueType = RenderQueueType.Opaque;    // 不透明队列
material.renderQueueType = RenderQueueType.Transparent; // 透明队列
material.renderQueueType = RenderQueueType.AlphaTest;   // Alpha测试队列
```

## 内置材质类型

### 1. BlinnPhong材质

```typescript
import { BlinnPhongMaterial, Color } from '@galacean/engine';

const material = new BlinnPhongMaterial(engine);

// 基础颜色
material.baseColor = new Color(1, 0, 0, 1); // 红色

// 基础纹理
const baseTexture = await engine.resourceManager.load<Texture2D>('base_color.png');
material.baseTexture = baseTexture;

// 镜面反射
material.specularColor = new Color(1, 1, 1, 1);
material.specularPower = 32;

// 自发光
material.emissiveColor = new Color(0.1, 0.1, 0.1, 1);

// 法线贴图
const normalTexture = await engine.resourceManager.load<Texture2D>('normal.png');
material.normalTexture = normalTexture;
material.normalIntensity = 1.0;
```

### 2. Unlit材质

```typescript
import { UnlitMaterial, Color } from '@galacean/engine';

const material = new UnlitMaterial(engine);

// 不受光照影响的颜色
material.baseColor = new Color(0.5, 0.8, 1.0, 1.0);

// 基础纹理
material.baseTexture = await engine.resourceManager.load<Texture2D>('unlit_texture.png');

// 平铺和偏移
material.tiling = new Vector2(2, 2);     // UV平铺
material.offset = new Vector2(0.1, 0.1);  // UV偏移

// 透明度
material.albedoTexture = await engine.resourceManager.load<Texture2D>('alpha.png');
material.alphaTestEnabled = true;
material.alphaCutoff = 0.5;
```

### 3. PBR材质

```typescript
import { PBRMaterial, Color } from '@galacean/engine';

const material = new PBRMaterial(engine);

// 基础颜色（金属度流程）
material.baseColor = new Color(0.7, 0.7, 0.7, 1.0);

// 金属度和粗糙度
material.metallic = 0.8;    // 金属度 (0-1)
material.roughness = 0.2;   // 粗糙度 (0-1)

// 基础颜色贴图
material.baseTexture = await engine.resourceManager.load<Texture2D>('albedo.png');

// 金属度贴图（R通道）
const metallicTexture = await engine.resourceManager.load<Texture2D>('metallic.png');
material.metallicTexture = metallicTexture;

// 粗糙度贴图（G通道）
const roughnessTexture = await engine.resourceManager.load<Texture2D>('roughness.png');
material.roughnessTexture = roughnessTexture;

// 金属度-粗糙度组合贴图
const metallicRoughnessTexture = await engine.resourceManager.load<Texture2D>('metallic_roughness.png');
material.metallicRoughnessTexture = metallicRoughnessTexture;

// 法线贴图
material.normalTexture = await engine.resourceManager.load<Texture2D>('normal.png');
material.normalIntensity = 1.0;

// 自发光
material.emissiveColor = new Color(0, 0, 0, 1);
material.emissiveTexture = await engine.resourceManager.load<Texture2D>('emissive.png');
material.emissiveIntensity = 1.0;

// 环境光遮蔽
material.occlusionTexture = await engine.resourceManager.load<Texture2D>('occlusion.png');
material.occlusionIntensity = 1.0;
```

### 4. 自定义着色器材质

```typescript
import { Shader, ShaderPass } from '@galacean/engine';

// 创建自定义着色器
const shader = Shader.find('CustomShader');
if (!shader) {
  throw new Error('Custom shader not found');
}

const material = new Material(engine, shader);

// 设置着色器参数
material.shaderData.setColor('u_baseColor', new Color(1, 0, 0, 1));
material.shaderData.setFloat('u_metallic', 0.5);
material.shaderData.setVector3('u_emissive', new Vector3(0.1, 0.1, 0.1));

// 设置纹理
const texture = await engine.resourceManager.load<Texture2D>('custom.png');
material.shaderData.setTexture('u_customTexture', texture);

// 设置采样器状态
const sampler = new Sampler(engine, {
  wrapModeU: WrapMode.Repeat,
  wrapModeV: WrapMode.Repeat,
  filterMode: FilterMode.Bilinear
});
material.shaderData.setSampler('u_sampler', sampler);
```

## PBR材质详解

### 金属度-粗糙度工作流程

```typescript
class PBRMaterialFactory {
  static async createMetalMaterial(engine: Engine): Promise<PBRMaterial> {
    const material = new PBRMaterial(engine);

    // 金属材质
    material.baseColor = new Color(0.7, 0.7, 0.7, 1.0); // 银色
    material.metallic = 1.0;     // 完全金属
    material.roughness = 0.1;    // 非常光滑

    return material;
  }

  static async createPlasticMaterial(engine: Engine): Promise<PBRMaterial> {
    const material = new PBRMaterial(engine);

    // 塑料材质
    material.baseColor = new Color(0.2, 0.3, 0.8, 1.0); // 蓝色塑料
    material.metallic = 0.0;     // 非金属
    material.roughness = 0.5;    // 中等粗糙度

    return material;
  }

  static async createRoughMetalMaterial(engine: Engine): Promise<PBRMaterial> {
    const material = new PBRMaterial(engine);

    // 粗糙金属（如铁锈）
    material.baseColor = new Color(0.5, 0.3, 0.1, 1.0); // 铁锈色
    material.metallic = 0.8;     // 基本金属
    material.roughness = 0.9;    // 非常粗糙

    return material;
  }
}
```

### 环境光照设置

```typescript
import { TextureCube, EnvironmentLight } from '@galacean/engine';

// 加载环境贴图
const envTexture = await engine.resourceManager.load<TextureCube>('environment.env');

// 设置场景环境光
scene.ambientLight.diffuseCubeMap = envTexture;
scene.ambientLight.specularCubeMap = envTexture;

// 创建反射探针
const reflectionProbe = scene.createRootEntity('ReflectionProbe');
const probe = reflectionProbe.addComponent(ReflectionProbe);
probe.cubeMap = envTexture;
probe.influenceSphere.radius = 50;
probe.intensity = 1.0;

// 应用到材质
const material = new PBRMaterial(engine);
material.environmentTexture = envTexture;
```

### 基于物理的材质属性

```typescript
class PhysicsBasedMaterials {
  static async createGoldMaterial(engine: Engine): Promise<PBRMaterial> {
    const material = new PBRMaterial(engine);

    // 金色的物理属性
    material.baseColor = new Color(1.0, 0.766, 0.336, 1.0);
    material.metallic = 1.0;
    material.roughness = 0.2;

    // 使用复杂F0的金属度贴图
    const metallicTexture = await engine.resourceManager.load<Texture2D>('gold_metallic.png');
    material.metallicTexture = metallicTexture;

    return material;
  }

  static async createGlassMaterial(engine: Engine): Promise<PBRMaterial> {
    const material = new PBRMaterial(engine);

    // 玻璃材质
    material.baseColor = new Color(1, 1, 1, 0.1); // 透明
    material.metallic = 0.0;
    material.roughness = 0.0; // 非常光滑

    // 设置透明度
    material.isTransparent = true;
    material.alphaTestEnabled = false;
    material.alphaTest = 0.5;

    // 设置折射率（IOR）
    material.ior = 1.5; // 玻璃的折射率

    return material;
  }

  static async createSkinMaterial(engine: Engine): Promise<PBRMaterial> {
    const material = new PBRMaterial(engine);

    // 皮肤材质
    material.baseColor = new Color(0.96, 0.78, 0.68, 1.0);
    material.metallic = 0.0;
    material.roughness = 0.4;

    // 次表面散射（需要自定义着色器）
    material.shaderData.setFloat('u_subsurface', 0.5);
    material.shaderData.setVector3('u_scatteringDistance', new Vector3(0.7, 0.3, 0.1));

    return material;
  }
}
```

## 着色器系统

### 自定义着色器创建

```typescript
// 顶点着色器代码
const vertexShaderSource = `
precision highp float;

attribute vec3 a_Position;
attribute vec2 a_TexCoord0;
attribute vec3 a_Normal;

uniform mat4 u_MVPMatrix;
uniform mat4 u_ModelMatrix;
uniform mat3 u_NormalMatrix;

varying vec2 v_UV;
varying vec3 v_Normal;
varying vec3 v_WorldPosition;

void main() {
  v_UV = a_TexCoord0;
  v_Normal = normalize(u_NormalMatrix * a_Normal);
  v_WorldPosition = (u_ModelMatrix * vec4(a_Position, 1.0)).xyz;

  gl_Position = u_MVPMatrix * vec4(a_Position, 1.0);
}
`;

// 片元着色器代码
const fragmentShaderSource = `
precision highp float;

uniform vec4 u_BaseColor;
uniform sampler2D u_BaseTexture;
uniform float u_Metallic;
uniform float u_Roughness;
uniform vec3 u_Emissive;

uniform vec3 u_CameraPosition;

varying vec2 v_UV;
varying vec3 v_Normal;
varying vec3 v_WorldPosition;

void main() {
  vec4 baseColor = u_BaseColor * texture2D(u_BaseTexture, v_UV);

  // 简单的PBR计算
  vec3 N = normalize(v_Normal);
  vec3 V = normalize(u_CameraPosition - v_WorldPosition);
  vec3 L = normalize(vec3(1.0, 1.0, 1.0)); // 简化光源

  // 漫反射
  float NdotL = max(dot(N, L), 0.0);
  vec3 diffuse = baseColor.rgb * NdotL;

  // 镜面反射
  vec3 H = normalize(L + V);
  float NdotH = max(dot(N, H), 0.0);
  float roughness = u_Roughness * u_Roughness;
  float specular = pow(NdotH, (2.0 / roughness) - 2.0) * u_Metallic;

  vec3 finalColor = diffuse + vec3(specular) + u_Emissive;

  gl_FragColor = vec4(finalColor, baseColor.a);
}
`;

// 创建着色器
const shader = Shader.create(
  'CustomPBRShader',
  vertexShaderSource,
  fragmentShaderSource
);

// 设置着色器属性
shader._attributeSemantics.set('a_Position', VertexElementSemantic.Position);
shader._attributeSemantics.set('a_TexCoord0', VertexElementSemantic.UV0);
shader._attributeSemantics.set('a_Normal', VertexElementSemantic.Normal);

// 设置Uniform语义
shader._uniformSemantics.set('u_MVPMatrix', UniformSemantic.MVPMatrix);
shader._uniformSemantics.set('u_ModelMatrix', UniformSemantic.ModelMatrix);
shader._uniformSemantics.set('u_NormalMatrix', UniformSemantic.NormalMatrix);
shader._uniformSemantics.set('u_CameraPosition', UniformSemantic.CameraPosition);

// 注册着色器
Shader.register('CustomPBRShader', shader);
```

### 着色器变体

```typescript
class MaterialVariants {
  private baseShader: Shader;
  private variants: Map<string, Shader> = new Map();

  constructor(shaderName: string) {
    this.baseShader = Shader.find(shaderName)!;
  }

  getVariant(keywords: string[]): Shader {
    const variantKey = keywords.sort().join('_');

    if (!this.variants.has(variantKey)) {
      // 创建变体着色器
      const variant = this.baseShader.clone();

      // 处理着色器关键词
      this.processKeywords(variant, keywords);

      this.variants.set(variantKey, variant);
    }

    return this.variants.get(variantKey)!;
  }

  private processKeywords(shader: Shader, keywords: string[]): void {
    // 根据关键词修改着色器代码
    if (keywords.includes('NORMAL_MAP')) {
      // 添加法线贴图支持
      this.addNormalMapSupport(shader);
    }

    if (keywords.includes('ALPHA_TEST')) {
      // 添加Alpha测试支持
      this.addAlphaTestSupport(shader);
    }
  }

  private addNormalMapSupport(shader: Shader): void {
    // 实现法线贴图支持
  }

  private addAlphaTestSupport(shader: Shader): void {
    // 实现Alpha测试支持
  }
}
```

## 纹理管理

### 纹理类型

```typescript
import {
  Texture2D, TextureCube, RenderTexture,
  WrapMode, FilterMode, TextureFormat
} from '@galacean/engine';

// 2D纹理
const texture2D = new Texture2D(engine, 512, 512, TextureFormat.R8G8B8A8);
texture2D.wrapModeU = WrapMode.Repeat;
texture2D.wrapModeV = WrapMode.Repeat;
texture2D.filterMode = FilterMode.Bilinear;
texture2D.mipMap = true;

// 立方体纹理
const cubeMap = new TextureCube(engine, 256, TextureFormat.R8G8B8A8);
cubeMap.wrapModeU = WrapMode.Clamp;
cubeMap.wrapModeV = WrapMode.Clamp;
cubeMap.filterMode = FilterMode.Trilinear;

// 渲染纹理
const renderTexture = new RenderTexture(engine, 1024, 1024, TextureFormat.R8G8B8A8);
renderTexture.depthBufferFormat = DepthBufferFormat.Depth24Stencil8;
```

### 纹理加载和生成

```typescript
class TextureManager {
  private textureCache: Map<string, Texture> = new Map();

  async loadTexture(path: string): Promise<Texture> {
    if (this.textureCache.has(path)) {
      return this.textureCache.get(path)!;
    }

    const texture = await engine.resourceManager.load<Texture>(path);
    this.textureCache.set(path, texture);
    return texture;
  }

  async createNormalMap(heightMap: Texture2D, strength: number = 1.0): Promise<Texture2D> {
    const width = heightMap.width;
    const height = heightMap.height;
    const normalMap = new Texture2D(engine, width, height, TextureFormat.R8G8B8A8);

    // 读取高度数据
    const heightData = await this.readTextureData(heightMap);
    const normalData = new Uint8Array(width * height * 4);

    // 生成法线数据
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // 计算法线
        const normal = this.calculateNormal(heightData, width, height, x, y, strength);

        // 转换到0-1范围
        normalData[idx] = (normal.x + 1) * 127.5;
        normalData[idx + 1] = (normal.y + 1) * 127.5;
        normalData[idx + 2] = (normal.z + 1) * 127.5;
        normalData[idx + 3] = 255;
      }
    }

    normalMap.setPixelBuffer(normalData);
    return normalMap;
  }

  private calculateNormal(
    data: Uint8Array, width: number, height: number,
    x: number, y: number, strength: number
  ): Vector3 {
    // 简化的法线计算
    const getHeight = (px: number, py: number) => {
      px = Math.max(0, Math.min(width - 1, px));
      py = Math.max(0, Math.min(height - 1, py));
      const idx = (py * width + px) * 4;
      return data[idx] / 255.0;
    };

    const hL = getHeight(x - 1, y);
    const hR = getHeight(x + 1, y);
    const hU = getHeight(x, y - 1);
    const hD = getHeight(x, y + 1);

    const dx = (hR - hL) * strength;
    const dy = (hD - hU) * strength;

    const normal = new Vector3(-dx, dy, 1);
    normal.normalize();
    return normal;
  }
}
```

### 纹理数组

```typescript
// 创建纹理数组
const textureArray = new Texture2DArray(engine, 512, 512, 6, TextureFormat.R8G8B8A8);

// 填充纹理数组
for (let i = 0; i < 6; i++) {
  const texture = await engine.resourceManager.load<Texture2D>(`texture_${i}.png`);
  textureArray.setImageData(i, texture);
}

// 在着色器中使用
const material = new Material(engine);
material.shaderData.setTexture('u_textureArray', textureArray);
material.shaderData.setInt('u_textureIndex', 2); // 使用第3个纹理
```

## 材质实例化

### 材质属性覆盖

```typescript
// 基础材质
const baseMaterial = new PBRMaterial(engine);
baseMaterial.baseColor = new Color(0.5, 0.5, 0.5, 1.0);
baseMaterial.metallic = 0.5;
baseMaterial.roughness = 0.5;

// 创建材质实例
const instance1 = baseMaterial.clone();
instance1.baseColor = new Color(1, 0, 0, 1); // 红色

const instance2 = baseMaterial.clone();
instance2.baseColor = new Color(0, 1, 0, 1); // 绿色

// 应用到渲染器
const renderer1 = entity1.getComponent(MeshRenderer);
renderer1.setMaterial(instance1);

const renderer2 = entity2.getComponent(MeshRenderer);
renderer2.setMaterial(instance2);
```

### 材质属性动画

```typescript
class MaterialAnimator extends Script {
  private material: Material;
  private time: number = 0;

  onAwake(): void {
    const renderer = this.entity.getComponent(MeshRenderer);
    this.material = renderer.getInstanceMaterial();
  }

  onUpdate(deltaTime: number): void {
    this.time += deltaTime;

    // 颜色动画
    const hue = (Math.sin(this.time * 2) + 1) * 0.5;
    const color = Color.fromHSV(hue * 360, 1, 1);
    this.material.shaderData.setColor('u_baseColor', color);

    // 金属度动画
    const metallic = (Math.sin(this.time * 3) + 1) * 0.5;
    this.material.shaderData.setFloat('u_metallic', metallic);

    // 粗糙度动画
    const roughness = (Math.cos(this.time * 2) + 1) * 0.5;
    this.material.shaderData.setFloat('u_roughness', roughness);
  }
}
```

### 程序化材质

```typescript
class ProceduralMaterial {
  private material: Material;
  private noiseTexture: Texture2D;

  constructor(engine: Engine) {
    this.material = new Material(engine);
    this.createNoiseTexture(engine);
  }

  private async createNoiseTexture(engine: Engine): Promise<void> {
    const size = 256;
    this.noiseTexture = new Texture2D(engine, size, size, TextureFormat.R8G8B8A8);

    // 生成Perlin噪声
    const noiseData = this.generatePerlinNoise(size, size);
    this.noiseTexture.setPixelBuffer(noiseData);

    this.material.shaderData.setTexture('u_noiseTexture', this.noiseTexture);
  }

  private generatePerlinNoise(width: number, height: number): Uint8Array {
    const data = new Uint8Array(width * height * 4);
    const scale = 0.02;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // 简化的噪声计算
        const noise = this.perlinNoise(x * scale, y * scale);
        const value = (noise + 1) * 127.5;

        data[idx] = value;     // R
        data[idx + 1] = value; // G
        data[idx + 2] = value; // B
        data[idx + 3] = 255;   // A
      }
    }

    return data;
  }

  private perlinNoise(x: number, y: number): number {
    // 简化的Perlin噪声实现
    return Math.sin(x * 2) * Math.cos(y * 2) +
           Math.sin(x * 4) * Math.cos(y * 4) * 0.5;
  }
}
```

## 性能优化

### 材质批处理

```typescript
class MaterialBatcher {
  private batchGroups: Map<string, Entity[]> = new Map();

  addEntity(entity: Entity): void {
    const renderer = entity.getComponent(MeshRenderer);
    if (!renderer) return;

    const material = renderer.getMaterial();
    const key = this.getMaterialKey(material);

    if (!this.batchGroups.has(key)) {
      this.batchGroups.set(key, []);
    }

    this.batchGroups.get(key)!.push(entity);
  }

  private getMaterialKey(material: Material): string {
    // 基于材质属性生成唯一键
    const props = [
      material.shader.name,
      material.renderQueueType.toString(),
      material.isTransparent.toString(),
      // 其他重要属性
    ];
    return props.join('|');
  }

  batchRender(): void {
    this.batchGroups.forEach((entities, materialKey) => {
      if (entities.length > 1) {
        this.renderBatched(entities);
      } else {
        this.renderSingle(entities[0]);
      }
    });
  }

  private renderBatched(entities: Entity[]): void {
    // 实现批处理渲染
    // 合并网格，一次渲染所有实体
  }

  private renderSingle(entity: Entity): void {
    // 单独渲染
  }
}
```

### LOD材质系统

```typescript
class LODMaterialManager {
  private materials: Map<number, Material> = new Map();

  constructor() {
    this.setupLODMaterials();
  }

  private setupLODMaterials(): void {
    // 高细节材质
    const highDetail = new PBRMaterial(engine);
    highDetail.baseTexture = highQualityTexture;
    highDetail.normalTexture = normalTexture;
    highDetail.roughnessTexture = roughnessTexture;
    this.materials.set(0, highDetail);

    // 中等细节材质
    const mediumDetail = new PBRMaterial(engine);
    mediumDetail.baseTexture = mediumQualityTexture;
    mediumDetail.roughness = 0.5;
    this.materials.set(1, mediumDetail);

    // 低细节材质
    const lowDetail = new UnlitMaterial(engine);
    lowDetail.baseTexture = lowQualityTexture;
    this.materials.set(2, lowDetail);
  }

  getMaterial(distance: number, lodDistances: number[]): Material {
    let lodLevel = 0;
    for (let i = 0; i < lodDistances.length; i++) {
      if (distance > lodDistances[i]) {
        lodLevel++;
      }
    }

    return this.materials.get(Math.min(lodLevel, this.materials.size - 1))!;
  }
}
```

### 纹理压缩

```typescript
class TextureCompression {
  static async loadCompressedTexture(
    engine: Engine,
    basePath: string
  ): Promise<Texture2D> {
    // 检测GPU支持
    const gpu = engine._hardwareRenderer;

    let format: TextureFormat;
    let extension: string;

    if (gpu.canCompressedTexture2D('etc2')) {
      format = TextureFormat.ETC2_RGBA8;
      extension = '.etc2.ktx';
    } else if (gpu.canCompressedTexture2D('astc')) {
      format = TextureFormat.ASTC_RGBA_6x6;
      extension = '.astc.ktx';
    } else if (gpu.canCompressedTexture2D('s3tc')) {
      format = TextureFormat.DXT5;
      extension = '.dxt5.ktx';
    } else {
      // 回退到未压缩
      return engine.resourceManager.load<Texture2D>(basePath + '.png');
    }

    return engine.resourceManager.load<Texture2D>(basePath + extension);
  }
}
```

## 最佳实践

### 1. 材质复用

```typescript
// ✅ 正确：复用材质实例
class MaterialPool {
  private static materials: Map<string, Material> = new Map();

  static getMaterial(engine: Engine, config: MaterialConfig): Material {
    const key = JSON.stringify(config);

    if (!this.materials.has(key)) {
      const material = this.createMaterial(engine, config);
      this.materials.set(key, material);
    }

    return this.materials.get(key)!;
  }

  private static createMaterial(engine: Engine, config: MaterialConfig): Material {
    // 根据配置创建材质
  }
}
```

### 2. 材质属性缓存

```typescript
class MaterialCache {
  private cachedProperties: Map<string, any> = new Map();

  updateMaterial(material: Material, properties: Record<string, any>): void {
    Object.entries(properties).forEach(([key, value]) => {
      const currentValue = this.cachedProperties.get(`${material.id}_${key}`);

      if (currentValue !== value) {
        material.shaderData.set(key, value);
        this.cachedProperties.set(`${material.id}_${key}`, value);
      }
    });
  }
}
```

### 3. 异步加载

```typescript
class AsyncMaterialLoader {
  private loadingPromises: Map<string, Promise<Material>> = new Map();

  async loadMaterial(name: string): Promise<Material> {
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name)!;
    }

    const promise = this.doLoadMaterial(name);
    this.loadingPromises.set(name, promise);

    return promise;
  }

  private async doLoadMaterial(name: string): Promise<Material> {
    // 加载材质配置
    const config = await engine.resourceManager.load(`materials/${name}.json`);

    // 加载纹理
    const textures = await Promise.all(
      config.textures.map((path: string) =>
        engine.resourceManager.load<Texture>(path)
      )
    );

    // 创建材质
    return this.createMaterial(config, textures);
  }
}
```

### 4. 材质热重载

```typescript
class MaterialHotReloader {
  private watchers: Map<string, FileWatcher> = new Map();

  watchMaterial(materialPath: string): void {
    const watcher = new FileWatcher(materialPath);

    watcher.on('change', async () => {
      console.log(`Material ${materialPath} changed, reloading...`);

      // 重新加载材质
      const newMaterial = await this.loadMaterial(materialPath);

      // 替换现有材质实例
      this.replaceMaterialInstances(newMaterial);
    });

    this.watchers.set(materialPath, watcher);
  }
}
```

通过遵循这些指南，你可以有效地使用Galacean Engine的材质系统，创建逼真、高性能的3D渲染效果。

## ⚠️ 禁止事项

### 关键约束
- **PBR物理约束**: 漫反射颜色必须在 [0,1] 范围，金属度不能超过 1.0，粗糙度必须在 [0,1] 区间
- **纹理格式**: 纹理尺寸必须是2的幂次方（1024x512等），不支持非2的幂次方纹理
- **着色器参数**: Uniform变量名称必须与着色器代码严格匹配，大小写敏感
- **材质实例**: 同一个材质实例不可同时应用到不同渲染管线的物体上

### 常见错误
- **纹理泄露**: 未正确设置纹理引用计数，导致纹理内存无法释放
- **着色器编译错误**: GLSL代码语法错误或不兼容，导致渲染黑屏
- **参数类型错误**: 使用整数类型传递浮点数Uniform值，或反之
- **过度共享材质**: 多个对象共享同一材质但需要不同参数，导致性能下降

### 最佳实践
- **材质配置化**: 使用JSON或配置文件定义材质参数，便于批量修改
- **纹理压缩**: 移动端使用ETC2或ASTC压缩格式，减少内存带宽消耗
- **LOD材质**: 远距离物体使用简化版材质（降低复杂度或纹理分辨率）
- **批处理优化**: 不同材质尽可能合并为相同着色器，减少Draw Call
- **错误回退**: 着色器编译失败时使用默认材质，避免渲染完全消失