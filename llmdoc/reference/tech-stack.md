# 技术栈 (Tech Stack)

本文档详细说明了 Galacean Engine 1.6.11 的技术栈架构、构建系统、开发工具和项目结构。

## 核心框架

### Galacean Engine
- **版本**: 1.6.11
- **类型**: 3D 游戏引擎和渲染框架
- **语言**: TypeScript
- **目标平台**: 浏览器、Node.js、Electron
- **许可证**: MIT

### 核心架构特点
- 模块化设计：14个独立的 npm 包
- 渲染硬件抽象层 (RHI) 架构
- 组件化实体系统 (ECS)
- 可插拔的物理引擎支持
- 基于 WebGL/WebGPU 的渲染管线

## 构建系统

### Rollup
- **版本**: 2.36.1
- **用途**: 主要打包工具
- **特性**:
  - 支持多种输出格式：ES Module、UMD、CommonJS
  - 代码分割和 Tree-shaking
  - 插件生态系统

### TypeScript
- **版本**: 5.1.6
- **配置**:
  - 目标: ESNext
  - 模块: ESNext
  - 启用装饰器支持
  - 生成声明文件
  - 路径别名支持 (`@/*` -> `src/*`)

### SWC (Speedy Web Compiler)
- **版本**: 1.3.49
- **用途**: 快速 TypeScript/JavaScript 编译
- **特性**:
  - 比 tsc 快 20-70 倍
  - 支持现代 JavaScript 特性
  - 与 Rollup 集成

### 构建配置
- **主配置文件**: `rollup.config.js`
- **环境变量**:
  - `BUILD_TYPE`: MODULE | UMD | ALL
  - `NODE_ENV`: development | release
- **输出目录**: `dist/`
- **类型声明目录**: `types/`

## 包管理

### pnpm Workspace
- **版本**: 9.3.0
- **配置文件**: `pnpm-workspace.yaml`
- **工作区包含**:
  - `packages/*`: 所有核心包
  - `tests`: 测试套件
  - `examples`: 示例项目
  - `e2e`: 端到端测试

### 包结构
```
packages/
├── core/           # 核心引擎功能
├── math/           # 数学库
├── rhi-webgl/      # WebGL RHI 实现
├── shader/         # 着色器系统
├── shader-lab/     # 着色器编辑器
├── loader/         # 资源加载器
├── physics-lite/   # 轻量级物理引擎
├── physics-physx/  # PhysX 物理引擎
├── ui/             # UI 系统
├── xr/             # XR 基础
├── xr-webxr/       # WebXR 实现
├── design/         # 设计系统
└── galacean/       # 主包（聚合包）
```

### 依赖管理
- 使用 `workspace:*` 协议管理内部包依赖
- 外部依赖发布到 npm registry
- 严格的版本控制和发布流程

## 运行时环境

### 浏览器支持
- **最低要求**:
  - WebGL 1.0 支持
  - ES5 兼容性（通过 SWC 转换）
- **推荐要求**:
  - WebGL 2.0 支持
  - 现代浏览器（Chrome、Firefox、Safari、Edge）

### Node.js
- **用途**:
  - 开发服务器
  - 构建工具
  - 测试运行时
- **版本**: 当前 LTS

### Electron
- **版本**: 13.x
- **用途**: 桌面应用和工具

## 开发工具

### 测试框架

#### Vitest
- **版本**: 2.1.3
- **配置文件**: `tests/vitest.config.ts`
- **特性**:
  - 单元测试和集成测试
  - 浏览器测试（通过 Playwright provider）
  - 代码覆盖率报告（@vitest/coverage-v8）
  - 快速热重载

#### Playwright
- **版本**: 1.53.1
- **配置文件**: `playwright.config.ts`
- **用途**:
  - 端到端测试
  - 浏览器自动化
  - 视觉回归测试
- **支持浏览器**: Chromium（主要）

### 代码质量工具

#### ESLint
- **版本**: 8.44.0
- **解析器**: @typescript-eslint/parser
- **插件**:
  - @typescript-eslint
  - prettier
- **环境**: browser、node

#### Prettier
- **版本**: 3.0.0
- **集成**: ESLint plugin
- **用途**: 代码格式化

#### Husky
- **版本**: 8.0.0
- **用途**: Git hooks 管理
- **配置**:
  - pre-commit: lint-staged
  - commit-msg: commitlint

### 开发脚本

#### 主要命令
```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev              # 开发构建
pnpm watch            # 监视模式
pnpm watch:umd        # UMD 监视模式

# 构建
pnpm build            # Module + Types
pnpm b:module         # 仅 Module
pnpm b:umd            # 仅 UMD
pnpm b:all            # 所有格式

# 测试
pnpm test             # 单元测试
pnpm coverage         # 覆盖率报告
pnpm e2e              # 端到端测试

# 代码质量
pnpm lint             # ESLint 检查

# 示例
pnpm examples         # 运行示例项目
```

## 项目架构特点

### 模块化设计
- **独立包**: 每个功能模块都是独立的 npm 包
- **清晰依赖**: 明确定义包之间的依赖关系
- **可选功能**: 物理引擎、XR 等功能可选集成

### 渲染抽象
- **RHI (Rendering Hardware Interface)**: 统一的渲染接口
- **多后端支持**: WebGL、WebGPU（规划中）
- **着色器系统**: GLSL 管理和编译

### 开发工作流
1. **开发阶段**: 使用 pnpm workspace 进行本地开发
2. **构建阶段**: Rollup + SWC 快速构建
3. **测试阶段**: Vitest + Playwright 全面测试
4. **发布阶段**: 自动化版本管理和 npm 发布

### 性能优化
- **Tree-shaking**: 按需加载
- **代码分割**: 减少初始包大小
- **快速编译**: SWC 提升开发体验
- **资源优化**: 自动压缩和优化

## 版本管理

### 发布流程
- **工具**: bumpp
- **策略**: 语义化版本 (SemVer)
- **自动化**:
  - 版本号更新
  - Changelog 生成
  - Git tag 创建
  - npm 包发布

### 发布通道
- **稳定版**: npm registry
- **测试版**: 可配置 beta 标签
- **内部版本**: workspace protocol

## 生态系统

### 工具链
- **IDE 支持**: TypeScript 语言服务
- **调试**: Source maps 支持
- **文档**: TypeScript API 文档生成

### 社区
- **仓库**: https://github.com/galacean/engine
- **问题跟踪**: GitHub Issues
- **文档**: 在线文档站点

## 未来规划

### 技术演进
- **WebGPU**: 下一代图形 API 支持
- **WebAssembly**: 性能关键模块迁移
- **模块联邦**: 更灵活的模块加载

### 工具改进
- **Vite 迁移**: 考虑迁移到 Vite 作为构建工具
- **Monorepo 工具**: 优化大型 monorepo 管理
- **CI/CD**: 增强自动化流程

---

*最后更新: 2024-12-17*
*版本: Galacean Engine 1.6.11*