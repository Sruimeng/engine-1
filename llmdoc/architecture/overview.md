---
id: "architecture-overview"
type: "architecture"
title: "Galacean Engine 架构概览"
description: "Galacean Engine 是一个模块化的 3D 引擎，采用分层架构设计"
tags: ["架构", "ECS", "渲染管线", "模块化", "分层设计"]
context_dependency: []
related_ids: ["architecture-system-overview", "architecture-ecs-design", "architecture-rendering-pipeline"]
---

# Galacean Engine 架构概览

## 整体架构

Galacean Engine 是一个模块化的 3D 引擎，采用分层架构设计：

```
┌─────────────────────────────────────────────────────┐
│                   应用层 (Application)                │
├─────────────────────────────────────────────────────┤
│                   API层 (Core API)                   │
├─────────────────────────────────────────────────────┤
│            功能模块 (Feature Modules)                │
│  ┌──────────┬──────────┬──────────┬─────────────┐   │
│  │   渲染    │   物理    │    UI     │    动画     │   │
│  │ Renderer │ Physics  │    UI    │ Animation   │   │
│  └──────────┴──────────┴──────────┴─────────────┘   │
├─────────────────────────────────────────────────────┤
│              引擎核心 (Engine Core)                  │
│  ┌──────────┬──────────┬──────────┬─────────────┐   │
│  │  实体系统  │  组件系统  │  场景管理  │  资源管理   │   │
│  │ Entity   │Component │  Scene   │   Asset    │   │
│  │ System   │  System  │  Manager  │   Manager  │   │
│  └──────────┴──────────┴──────────┴─────────────┘   │
├─────────────────────────────────────────────────────┤
│              数学库 (Math Library)                  │
├─────────────────────────────────────────────────────┤
│         渲染硬件接口 (RHI)                           │
│  ┌──────────┬──────────┬──────────┬─────────────┐   │
│  │  WebGL   │ WebGPU   │  Metal   │    DX12     │   │
│  └──────────┴──────────┴──────────┴─────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 核心模块

### 1. 数学库 (Math)
- **Vector2/3/4**: 向量运算
- **Matrix/Matrix3x3**: 矩阵变换
- **Quaternion**: 四元数旋转
- **Color**: 颜色管理
- **BoundingVolume**: 包围体计算
- **MathUtil**: 数学工具类

### 2. 引擎核心 (Core)
- **Engine**: 引擎主类
- **Entity**: 实体节点
- **Component**: 组件基类
- **Transform**: 变换组件
- **Scene**: 场景管理
- **Camera**: 摄像机系统

### 3. 渲染系统
- **Renderer**: 渲染器
- **Material**: 材质系统
- **Shader**: 着色器管理
- **Mesh**: 网格数据
- **Texture**: 纹理管理
- **Light**: 光照系统

### 4. RHI (Rendering Hardware Interface)
- **统一的渲染接口**
- **多平台支持**
- **资源管理**
- **命令缓冲**

## 数据流

### 渲染流程
```
场景更新 → 视锥剔除 → 渲染排序 → 绘制调用 → GPU渲染
    ↓         ↓         ↓         ↓        ↓
Transform  Culling  Sorting  DrawCalls  GPU
```

### 渲染管线
1. **更新阶段**
   - 更新场景树
   - 计算世界矩阵
   - 更新动画

2. **剔除阶段**
   - 视锥剔除
   - 遮挡剔除
   - 距离剔除

3. **排序阶段**
   - 材质排序
   - 深度排序
   - 透明度排序

4. **绘制阶段**
   - 生成绘制命令
   - 设置渲染状态
   - 执行绘制

## 组件系统架构

### ECS (Entity-Component-System)
```
Entity (实体)
  ├── Transform (变换组件)
  ├── Renderer (渲染组件)
  ├── Camera (摄像机组件)
  ├── Light (光照组件)
  ├── Script (脚本组件)
  └── CustomComponent (自定义组件)
```

### 组件生命周期
```
onAwake() → onEnable() → onStart() → onUpdate() → onLateUpdate()
    ↓           ↓          ↓          ↓           ↓
   创建        激活        开始        更新        延迟更新
                                          ↓
                                    onDisable() → onDestroy()
                                      禁用          销毁
```

## 内存管理

### 对象池模式
- **减少GC压力**
- **预分配常用对象**
- **智能回收策略**

### 引用计数
- **资源自动管理**
- **避免内存泄漏**
- **循环引用检测**

## 性能优化策略

### 渲染优化
- **批处理 (Batching)**
- **实例化 (Instancing)**
- **LOD (Level of Detail)**
- **遮挡剔除 (Occlusion Culling)**

### 计算优化
- **脏标记 (Dirty Flags)**
- **惰性求值 (Lazy Evaluation)**
- **空间分割 (Spatial Partitioning)**
- **多线程 (Web Workers)**

## 扩展性设计

### 插件架构
- **模块化加载**
- **生命周期管理**
- **依赖注入**

### 自定义渲染
- **渲染管线的可编程性**
- **自定义材质和着色器**
- **后处理效果**

## 平台支持

### 浏览器
- **Chrome/Edge (WebGL/WebGPU)**
- **Firefox (WebGL)**
- **Safari (WebGL)**

### 其他平台
- **Node.js (离屏渲染)**
- **Electron (桌面应用)**
- **WebGL到WebGL2的渐进增强**

## ⚠️ 禁止事项

### 关键约束 (🚫)
- 🚫 **禁止**在引擎核心层直接调用平台特定API
- 🚫 **禁止**在ECS系统间共享可变状态
- 🚫 **禁止**在渲染管线中硬编码平台相关代码

### 常见错误 (❌)
- ❌ **错误**: 在Component中包含复杂业务逻辑
- ❌ **错误**: 忽略资源引用计数导致内存泄漏
- ❌ **错误**: 在渲染循环中进行同步I/O操作
- ❌ **错误**: 直接修改其他系统的组件数据

### 最佳实践 (✅)
- ✅ **推荐**: 使用数据驱动的ECS设计模式
- ✅ **推荐**: 利用脏标记优化性能
- ✅ **推荐**: 通过抽象层实现跨平台兼容
- ✅ **推荐**: 批量处理系统更新减少开销