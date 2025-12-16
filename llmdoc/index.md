# Galacean Engine 文档中心

欢迎来到 Galacean Engine 的官方文档中心。这里包含了引擎的完整技术文档、架构设计和开发指南。

## 📖 项目介绍

Galacean Engine 是一个高性能的 3D 引擎，采用现代化的 ECS（Entity Component System）架构设计，为开发者提供从场景管理到渲染管线的完整解决方案。

### 核心特性
- 🎮 **完整的游戏开发框架** - 基于 ECS 的高度可扩展架构
- 🚀 **高性能渲染** - 基于 WebGL/WebGPU 的渲染硬件抽象层（RHI）
- ⚡ **物理模拟** - 集成的物理引擎支持
- 🎨 **灵活的UI系统** - 强大的 UI 渲染和交互框架
- 🔧 **模块化设计** - 14 个独立包的 monorepo 架构
- 📦 **TypeScript 原生支持** - 完整的类型定义和智能提示

### 技术栈概览
- **核心框架**: TypeScript 3D 游戏引擎 v1.6.11
- **构建系统**: Rollup + SWC 快速编译
- **包管理**: pnpm workspace
- **测试框架**: Vitest (单元测试) + Playwright (E2E测试)
- **代码质量**: ESLint + Prettier + Husky
- **运行时**: 浏览器 (WebGL)、Node.js、Electron

## 📚 文档结构说明

本文档采用分层结构，按照从核心到应用的顺序组织：

```
/llmdoc/
├── index.md                 # 文档首页（当前页面）
├── api/                      # 🔧 API参考文档 - 详细的接口说明
│   ├── index.md                 # API索引和快速导航
│   ├── engine-core.md           # 引擎核心API（Engine、Scene、Entity等）
│   ├── engine-math.md           # 数学库API（Vector、Matrix、Quaternion等）
│   └── engine-rhi-webgl.md      # WebGL渲染接口API
├── reference/               # 📋 参考文档 - 项目的"宪法"
│   ├── coding-conventions.md    # ⭐ 编码规范（必读）
│   ├── data-models.md          # 数据模型与ECS架构
│   ├── tech-stack.md           # 技术栈详情
│   ├── packages-overview.md    # 📦 包概览（推荐）
│   ├── package-dependencies.md # 🔗 包依赖关系
│   ├── git-workflow.md         # Git工作流规范
│   ├── testing-standards.md    # 测试标准
│   └── shared-utilities.md     # 共享工具库
├── architecture/             # 🏗️ 架构设计 - 核心系统设计
│   ├── overview.md              # 架构总览
│   ├── system-overview.md      # 系统概览
│   ├── rendering-pipeline.md   # 🎨 渲染管线详解
│   ├── ecs-design.md          # 🧩 ECS架构设计
│   ├── shader-system.md       # ⚡ 着色器系统架构
│   ├── physics-integration.md # 🏐 物理系统集成
│   ├── resource-management.md # 📦 资源管理系统
│   └── platform-abstraction.md # 🌐 平台抽象层设计
├── guides/                   # 📖 开发指南 - 实用教程
│   └── quick-start.md           # 快速入门
├── examples/                 # 💡 示例和最佳实践
│   ├── common-patterns.md        # 常见设计模式
│   ├── performance-patterns.md   # 性能优化模式
│   ├── troubleshooting.md        # 问题排查指南
│   ├── migration-guide.md        # 版本迁移指南
│   ├── recipes.md                # 实用代码片段
│   └── anti-patterns.md          # 反模式和避坑指南
└── agent/                    # 🤖 智能体策略 - AI辅助开发
```

## ⭐ 首选阅读文档

### 📋 编码规范 - 项目的"宪法"

**[编码规范](reference/coding-conventions.md)** 是所有开发者必须阅读和遵守的核心文档。它定义了：

- **数学约定**：坐标系、矩阵格式、精度标准
- **编码标准**：TypeScript 规则、命名约定
- **最佳实践**：性能优化指南、常见陷阱
- **测试要求**：精度标准、覆盖率要求

> ⚠️ **重要提醒**：所有代码修改必须严格遵守编码规范，这些规范是项目的"宪法"，确保代码质量和一致性。

## 📋 参考文档 (Reference)

### 核心规范
- **[编码规范](reference/coding-conventions.md)** - ⭐ **必读！** 项目的根本大法
- **[数据模型与ECS架构](reference/data-models.md)** - ECS架构、核心组件和系统接口
- **[技术栈](reference/tech-stack.md)** - 引擎使用的技术栈和依赖详情

### 包架构
- **[包概览](reference/packages-overview.md)** - 📦 **推荐！** 14个包的详细功能说明和选择指南
- **[包依赖关系](reference/package-dependencies.md)** - 🔗 包之间的依赖关系和影响分析

### 工作流程
- **[Git工作流](reference/git-workflow.md)** - 提交规范、分支策略
- **[测试标准](reference/testing-standards.md)** - 单元测试、集成测试规范
- **[共享工具库](reference/shared-utilities.md)** - 通用工具和辅助函数

## 🔧 API参考文档 (API Reference)

- **[API索引](api/index.md)** - 📋 所有模块的快速导航和概览
- **[引擎核心API](api/engine-core.md)** - 🎮 Engine、Scene、Entity、Component等核心类
- **[数学库API](api/engine-math.md)** - 📐 Vector、Matrix、Quaternion等数学类型
- **[WebGL渲染API](api/engine-rhi-webgl.md)** - 🎨 WebGL设备、缓冲区、纹理等渲染接口

## 🏗️ 架构文档 (Architecture)

- **[架构概览](architecture/overview.md)** - 整体架构设计和模块关系
- **[系统概览](architecture/system-overview.md)** - 各子系统的详细说明
- **[渲染管线详解](architecture/rendering-pipeline.md)** - 🎨 完整的渲染管线架构、数据流和优化策略
- **[ECS架构设计](architecture/ecs-design.md)** - 🧩 Entity-Component-System的设计思想和实现细节
- **[着色器系统架构](architecture/shader-system.md)** - ⚡ 着色器编译、缓存和跨平台支持
- **[物理系统集成](architecture/physics-integration.md)** - 🏐 物理引擎集成、碰撞检测和优化策略
- **[资源管理系统](architecture/resource-management.md)** - 📦 资源加载、缓存和内存管理详解
- **[平台抽象层设计](architecture/platform-abstraction.md)** - 🌐 RHI设计和跨平台渲染支持

## 📖 开发指南 (Guides)

- **[快速入门](guides/quick-start.md)** - 引擎的快速上手指南
- **[场景管理指南](guides/scene-management.md)** - 🎬 场景创建、切换和管理
- **[ECS组件系统](guides/component-system.md)** - 🧩 Entity-Component-System使用指南
- **[材质系统指南](guides/material-system.md)** - 🎨 PBR材质、着色器和纹理管理
- **[动画系统指南](guides/animation-system.md)** - 🎞️ 骨骼动画、变形动画和动画状态机
- **[渲染基础指南](guides/rendering-basics.md)** - 📐 相机、光照、阴影和渲染优化
- **[性能优化指南](guides/performance-optimization.md)** - ⚡ 帧率优化、内存管理和性能调优
- **[资源加载管理](guides/asset-loading.md)** - 📦 异步加载、缓存和资源管理
- **[UI开发指南](guides/ui-development.md)** - 🖱️ Canvas系统、UI组件和交互事件

## 💡 示例和最佳实践 (Examples)

### 设计模式和架构
- **[常见设计模式](examples/common-patterns.md)** - 🎯 ECS架构、组件通信、资源管理等核心模式
- **[反模式指南](examples/anti-patterns.md)** - ⚠️ 需要避免的常见错误和陷阱

### 性能优化
- **[性能优化模式](examples/performance-patterns.md)** - 🚀 渲染、内存、计算优化策略
- **[实用代码片段](examples/recipes.md)** - 🍳 开箱即用的代码解决方案

### 开发支持
- **[问题排查指南](examples/troubleshooting.md)** - 🔧 常见问题的诊断和解决方案
- **[版本迁移指南](examples/migration-guide.md)** - 🔄 跨版本升级指导

### 🎯 快速导航

| 开发需求 | 推荐文档 | 说明 |
|---------|----------|------|
| 🚀 快速开始 | [快速入门](guides/quick-start.md) | 5分钟上手引擎 |
| 📋 API查询 | [API索引](api/index.md) | 完整的API参考 |
| 🎮 场景开发 | [场景管理指南](guides/scene-management.md) | 场景创建和管理 |
| 🧩 ECS系统 | [ECS组件系统](guides/component-system.md) | 组件化开发 |
| 🎨 渲染开发 | [渲染管线详解](architecture/rendering-pipeline.md) | 深入渲染机制 |
| ⚡ 性能优化 | [性能优化模式](examples/performance-patterns.md) | 性能调优技巧 |
| 🔧 问题解决 | [问题排查指南](examples/troubleshooting.md) | 常见问题解决 |

## 🤖 智能体策略 (Agent)

- **[策略文档](agent/strategy-*.md)** - AI辅助开发的策略和规程

## 🎯 阅读顺序建议

### 新手入门路径
1. **[项目介绍](#-项目介绍)** - 了解引擎概况
2. **[编码规范](reference/coding-conventions.md)** - 掌握基础规范
3. **[快速入门](guides/quick-start.md)** - 动手实践
4. **[数据模型](reference/data-models.md)** - 理解ECS架构

### 深度开发路径
1. **[包概览](reference/packages-overview.md)** - 了解引擎包结构
2. **[架构概览](architecture/overview.md)** - 理解整体设计
3. **[技术栈](reference/tech-stack.md)** - 熟悉技术细节
4. **[包依赖关系](reference/package-dependencies.md)** - 理解包间关系
5. **[测试标准](reference/testing-standards.md)** - 编写高质量测试
6. **[Git工作流](reference/git-workflow.md)** - 规范协作流程

### 专业开发路径
1. **[API索引](api/index.md)** - 熟悉引擎API体系
2. **[ECS组件系统](guides/component-system.md)** - 掌握组件化开发
3. **[渲染管线详解](architecture/rendering-pipeline.md)** - 深入渲染机制
4. **[性能优化指南](guides/performance-optimization.md)** - 优化应用性能
5. **[常见设计模式](examples/common-patterns.md)** - 学习最佳实践
6. **[问题排查指南](examples/troubleshooting.md)** - 解决实际问题

### 快速导航

| 需求 | 推荐文档 |
|------|----------|
| 🚀 快速开始 | [快速入门](guides/quick-start.md) |
| 📝 编码前必读 | [编码规范](reference/coding-conventions.md) |
| 📦 了解包结构 | [包概览](reference/packages-overview.md) |
| 🏗️ 了解架构 | [架构概览](architecture/overview.md) |
| 🎨 渲染管线 | [渲染管线详解](architecture/rendering-pipeline.md) |
| 🧩 ECS系统 | [ECS架构设计](architecture/ecs-design.md) |
| ⚡ 着色器开发 | [着色器系统架构](architecture/shader-system.md) |
| 🏐 物理引擎 | [物理系统集成](architecture/physics-integration.md) |
| 📦 资源管理 | [资源管理系统](architecture/resource-management.md) |
| 🌐 跨平台开发 | [平台抽象层设计](architecture/platform-abstraction.md) |
| 🔧 深入开发 | [数据模型](reference/data-models.md) |
| 🔗 包依赖分析 | [包依赖关系](reference/package-dependencies.md) |
| 🤝 协作开发 | [Git工作流](reference/git-workflow.md) |
| 🧪 编写测试 | [测试标准](reference/testing-standards.md) |
| 💡 设计模式 | [常见设计模式](examples/common-patterns.md) |
| 🚀 性能优化 | [性能优化模式](examples/performance-patterns.md) |
| 🔧 问题排查 | [问题排查指南](examples/troubleshooting.md) |

## 💡 重要提醒

### 代码修改流程
1. **阅读规范** - 修改前务必阅读 [编码规范](reference/coding-conventions.md)
2. **遵循约定** - 严格遵守数学约定、命名规则和编码标准
3. **编写测试** - 按照 [测试标准](reference/testing-standards.md) 编写测试用例
4. **提交代码** - 遵循 [Git工作流](reference/git-workflow.md) 规范提交

### 关键原则
- **零容差**: `1e-6` - 所有浮点比较必须使用 `MathUtil.equals()`
- **列主序**: 矩阵存储采用列主序格式
- **右手系**: 使用右手坐标系
- **TypeScript优先**: 所有代码必须有类型定义

## 🤝 贡献指南

欢迎为文档和引擎贡献代码和建议：

1. **Issue报告** - 在 GitHub 上创建 issue 描述问题
2. **代码贡献** - Fork 项目，遵循编码规范提交 PR
3. **文档改进** - 直接提交文档相关的 PR

### 贡献原则
- 遵循既有的编码规范和文档风格
- 确保测试覆盖率不降低
- 提供清晰的 commit message
- 更新相关文档

---

> 💡 **提示**：建议将此页面加入书签，作为日常开发的快速入口。