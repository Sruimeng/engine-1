# Galacean Engine 包架构概览

## 1. 架构分层

Galacean Engine 采用分层模块化架构，从底层核心到高层应用分为四个主要层次：

```
┌─────────────────────────────────────────────────────┐
│                    应用整合层                          │
│  ┌─────────────┐  ┌─────────────────────────────────┐ │
│  │   galacean  │  │            engine               │ │
│  │   (遗留包)   │  │          (主引擎包)              │ │
│  └─────────────┘  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│                    功能扩展层                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │  loader  │ │    ui    │ │    xr    │ │ physics  │  │
│ │ (资源加载) │ │  (UI系统) │ │  (XR扩展) │ │ (物理引擎) │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│                    渲染抽象层                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐   │
│ │ rhi-webgl│ │  shader  │ │     shader-lab       │   │
│ │(WebGL适配)│ │ (着色器)  │ │   (着色器实验室)      │   │
│ └──────────┘ └──────────┘ └──────────────────────┘   │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│                     核心基础层                        │
│ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐   │
│ │   core   │ │   math   │ │        design        │   │
│ │ (核心功能) │ │ (数学库)  │ │     (设计模式)       │   │
│ └──────────┘ └──────────┘ └──────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 2. 包详细说明

### 2.1 核心基础层

#### @galacean/core
- **功能职责**: 引擎核心功能，提供基础架构和组件系统
- **主要API**:
  - `Entity`, `Component` - 实体组件系统
  - `Scene`, `Layer` - 场景管理
  - `Camera`, `Light` - 摄像机和光照
  - `Animator`, `Renderer` - 动画和渲染器
- **使用场景**: 所有3D应用的基础，必须引入
- **依赖关系**: 依赖 math, design
- **包大小**: ~200KB (压缩后)
- **复杂度**: 高 (核心架构)

#### @galacean/math
- **功能职责**: 数学计算库，提供向量、矩阵、四元数等数学工具
- **主要API**:
  - `Vector2/3/4` - 向量运算
  - `Matrix3x3/4x4` - 矩阵变换
  - `Quaternion` - 四元数旋转
  - `Color`, `Bounding*` - 颜色和包围盒
- **使用场景**: 所有需要数学计算的场景
- **依赖关系**: 无外部依赖
- **包大小**: ~50KB (压缩后)
- **复杂度**: 中等 (纯计算)

#### @galacean/design
- **功能职责**: 设计模式库，提供架构模式和抽象基类
- **主要API**:
  - `IDisposable`, `IReference` - 资源管理接口
  - `EventDispatcher` - 事件系统
  - `Pool`, `ObjectPool` - 对象池
  - `Singleton` - 单例模式
- **使用场景**: 架构设计和资源管理
- **依赖关系**: 无外部依赖
- **包大小**: ~30KB (压缩后)
- **复杂度**: 中等 (设计模式)

### 2.2 渲染抽象层

#### @galacean/rhi-webgl
- **功能职责**: WebGL渲染硬件接口，封装WebGL/WebGL2 API
- **主要API**:
  - `WebGLCanvas` - WebGL画布
  - `WebGLRenderer` - 渲染器
  - `GLShader`, `GLTexture` - GPU资源
  - `RenderState` - 渲染状态管理
- **使用场景**: Web平台的3D渲染
- **依赖关系**: 依赖 core
- **包大小**: ~80KB (压缩后)
- **复杂度**: 高 (底层渲染)

#### @galacean/shader
- **功能职责**: 着色器管理，提供着色器编译、缓存和绑定功能
- **主要API**:
  - `Shader` - 着色器基类
  - `ShaderPass` - 着色器通道
  - `ShaderProperty` - 着色器属性
  - `ShaderPool` - 着色器池
- **使用场景**: 自定义材质和特效
- **依赖关系**: 依赖 core, rhi-webgl
- **包大小**: ~60KB (压缩后)
- **复杂度**: 中等 (着色器管理)

#### @galacean/shader-lab
- **功能职责**: 着色器实验室，提供可视化着色器编辑和代码生成
- **主要API**:
  - `ShaderGraph` - 着色器图编辑器
  - `ShaderNode` - 着色器节点
  - `ShaderBuilder` - 着色器构建器
  - `TemplateGenerator` - 模板生成器
- **使用场景**: 着色器开发和教育
- **依赖关系**: 依赖 shader, core
- **包大小**: ~100KB (压缩后)
- **复杂度**: 高 (图形学算法)

### 2.3 功能扩展层

#### @galacean/loader
- **功能职责**: 资源加载器，支持多种3D模型和纹理格式
- **主要API**:
  - `AssetLoader` - 资源加载器
  - `GLTFLoader`, `FBXLoader` - 模型加载器
  - `TextureLoader`, `CubeMapLoader` - 纹理加载器
  - `AnimationLoader` - 动画加载器
- **使用场景**: 3D资源和动画的加载
- **依赖关系**: 依赖 core
- **包大小**: ~70KB (压缩后)
- **复杂度**: 中等 (文件解析)

#### @galacean/ui
- **功能职责**: UI系统，提供2D/3D UI组件和交互功能
- **主要API**:
  - `Canvas`, `Panel` - UI画布和面板
  - `Button`, `Text`, `Image` - UI组件
  - `InputManager` - 输入管理
  - `LayoutSystem` - 布局系统
- **使用场景**: 游戏UI、数据可视化、交互界面
- **依赖关系**: 依赖 core, rhi-webgl
- **包大小**: ~90KB (压缩后)
- **复杂度**: 中等 (UI框架)

#### @galacean/physics-lite
- **功能职责**: 轻量级物理引擎，提供基础物理模拟
- **主要API**:
  - `PhysicsWorld` - 物理世界
  - `Rigidbody`, `Collider` - 刚体和碰撞体
  - `Joint` - 关节约束
  - `Raycast` - 射线检测
- **使用场景**: 简单物理交互和碰撞检测
- **依赖关系**: 依赖 core, math
- **包大小**: ~40KB (压缩后)
- **复杂度**: 中等 (物理计算)

#### @galacean/physics-physx
- **功能职责**: PhysX物理引擎集成，提供高性能物理模拟
- **主要API**:
  - `PhysXWorld` - PhysX物理世界
  - `PhysXRigidbody`, `PhysXCollider` - PhysX组件
  - `PhysXMaterial` - PhysX材质
  - `PhysXDebugRenderer` - 物理调试渲染
- **使用场景**: 复杂物理模拟和游戏开发
- **依赖关系**: 依赖 physics-lite, core
- **包大小**: ~150KB (压缩后)
- **复杂度**: 高 (物理引擎集成)

#### @galacean/xr
- **功能职责**: XR扩展基础库，提供XR抽象接口
- **主要API**:
  - `XRSession` - XR会话
  - `XRView`, `XRInputSource` - XR视图和输入
  - `XRSpace` - XR空间
  - `XRSystem` - XR系统管理
- **使用场景**: VR/AR应用开发
- **依赖关系**: 依赖 core
- **包大小**: ~50KB (压缩后)
- **复杂度**: 中等 (XR抽象)

#### @galacean/xr-webxr
- **功能职责**: WebXR API实现，Web平台的XR支持
- **主要API**:
  - `WebXRSession` - WebXR会话实现
  - `WebXRManager` - WebXR管理器
  - `WebXRInput` - WebXR输入处理
  - `WebXRHitTest` - WebXR命中测试
- **使用场景**: Web VR/AR应用
- **依赖关系**: 依赖 xr, core
- **包大小**: ~60KB (压缩后)
- **复杂度**: 中等 (WebXR集成)

### 2.4 应用整合层

#### @galacean/engine
- **功能职责**: 主引擎包，整合所有核心功能提供完整引擎
- **主要API**:
  - `Engine` - 引擎主类
  - `SceneBuilder` - 场景构建器
  - `AssetManager` - 资源管理器
  - `SystemManager` - 系统管理器
- **使用场景**: 完整的3D应用开发
- **依赖关系**: 依赖所有核心包
- **包大小**: ~400KB (压缩后)
- **复杂度**: 高 (系统集成)

#### @galacean/galacean
- **功能职责**: 遗留包，保持向后兼容性
- **主要API**: 重新导出engine包的所有API
- **使用场景**: 现有项目迁移，新项目推荐使用engine
- **依赖关系**: 依赖 engine
- **包大小**: ~5KB (仅重新导出)
- **复杂度**: 低 (兼容层)

## 3. 包大小和复杂度对比

| 包名 | 大度(KB) | 复杂度 | 层级 | 必需性 |
|------|----------|--------|------|--------|
| design | 30 | 中 | 核心 | 高 |
| math | 50 | 中 | 核心 | 高 |
| core | 200 | 高 | 核心 | 必须 |
| rhi-webgl | 80 | 高 | 渲染 | 必须 |
| shader | 60 | 中 | 渲染 | 高 |
| shader-lab | 100 | 高 | 渲染 | 低 |
| physics-lite | 40 | 中 | 扩展 | 低 |
| loader | 70 | 中 | 扩展 | 中 |
| ui | 90 | 中 | 扩展 | 低 |
| xr | 50 | 中 | 扩展 | 低 |
| physics-physx | 150 | 高 | 扩展 | 低 |
| xr-webxr | 60 | 中 | 扩展 | 低 |
| engine | 400 | 高 | 整合 | 推荐 |
| galacean | 5 | 低 | 整合 | 兼容 |

## 4. 选择指南

### 4.1 基础3D渲染
```typescript
// 最小依赖组合
import { Engine } from "@galacean/engine";
import "@galacean/rhi-webgl";
```

**场景**: 简单的3D模型展示、数据可视化
**特点**: 轻量级、快速加载

### 4.2 完整Web 3D应用
```typescript
// 推荐组合
import { Engine } from "@galacean/engine";
import "@galacean/loader";
import "@galacean/ui";
```

**场景**: 游戏、交互式应用、教育内容
**特点**: 功能完整、易于开发

### 4.3 高性能游戏开发
```typescript
// 游戏开发组合
import { Engine } from "@galacean/engine";
import "@galacean/physics-physx";
import "@galacean/shader-lab";
import "@galacean/loader";
```

**场景**: 3D游戏、物理模拟、高级特效
**特点**: 高性能、功能丰富

### 4.4 VR/AR应用
```typescript
// XR应用组合
import { Engine } from "@galacean/engine";
import "@galacean/xr-webxr";
import "@galacean/physics-lite";
```

**场景**: VR体验、AR应用、混合现实
**特点**: 沉浸式、交互性强

### 4.5 自定义渲染器
```typescript
// 自定义渲染组合
import { Core, Math, Design } from "@galacean/engine";
import { RHIWebGL } from "@galacean/rhi-webgl";
import { Shader } from "@galacean/shader";
```

**场景**: 特殊渲染需求、研究项目、引擎定制
**特点**: 灵活性高、控制力强

## 5. 最佳实践

### 5.1 按需引入
- 避免引入不必要的包以减小包大小
- 使用tree-shaking移除未使用的代码
- 考虑使用动态导入延迟加载非核心功能

### 5.2 版本兼容
- 所有包使用相同版本号
- 定期更新到最新稳定版本
- 查看CHANGELOG了解破坏性变更

### 5.3 性能优化
- 优先使用engine包而不是手动组合多个包
- 对于移动端，考虑使用physics-lite而非physics-physx
- 合理使用shader-lab避免运行时编译开销

### 5.4 开发调试
- 开发阶段使用完整包便于调试
- 生产环境按需打包
- 利用engine包的调试工具和性能分析

## 6. 迁移指南

### 6.1 从galacean到engine
```typescript
// 旧方式 (即将弃用)
import { Engine } from "@galacean/galacean";

// 新方式 (推荐)
import { Engine } from "@galacean/engine";
```

### 6.2 逐步迁移策略
1. 首先更新核心包引用
2. 逐步替换扩展包引用
3. 测试所有功能正常
4. 移除galacean包依赖

### 6.3 破坏性变更
- 包结构调整可能影响导入路径
- 某些API重命名或移除
- 构建配置需要更新

这个包架构为Galacean Engine提供了灵活、模块化、可扩展的基础架构，满足从简单3D展示到复杂游戏开发的各种需求。