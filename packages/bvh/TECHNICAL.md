# BVH Package Technical Documentation

## 概述

`@galacean/engine-bvh` 是为 Galacean Engine 设计的高效包围盒层次结构（Bounding Volume Hierarchy）碰撞检测系统包。该包提供了空间加速结构，用于快速进行碰撞检测、射线投射和空间查询操作。

## 架构设计

### 核心组件

#### 1. 接口层 (`src/interfaces/`)
- **IBVHNode**: BVH节点的接口定义，定义了节点的基本属性和操作
- **IBVHTree**: BVH树的接口定义，提供了完整的树操作API

#### 2. 数据结构 (`src/`)
- **BVHNode**: BVH节点的具体实现，支持二叉树结构
- **BVHTree**: BVH树的主要实现，包含插入、删除、查询等核心功能
- **CollisionResult**: 碰撞检测结果数据结构

#### 3. 包围盒系统 (`src/bounding-volumes/`)
- **BoundingVolume**: 抽象基类，定义了包围盒的通用接口
- **AABB**: 轴对齐包围盒实现
- **BoundingSphere**: 球形包围盒实现

#### 4. 射线系统 (`src/Ray.ts`)
- **Ray**: 扩展的射线类，支持更多BVH特定的射线操作

#### 5. 构建器 (`src/builders/`)
- **BVHBuilder**: BVH构建器，支持多种构建策略
- **BVHBuildStrategy**: 构建策略枚举（SAH、Median、Equal）

## 核心算法

### 1. BVH构建策略

#### SAH (Surface Area Heuristic)
- 最优但较慢的构建策略
- 基于表面积启发式优化树的构建
- 通过最小化射线检测期望成本来优化树结构

#### Median
- 平衡的树构建策略
- 按中位数分割对象
- 保证树的平衡性

#### Equal
- 最快的构建策略
- 简单地将对象平均分割
- 构建速度快但可能不是最优

### 2. 空间查询

#### 射线投射 (Ray Casting)
- 支持快速射线与BVH中对象的相交检测
- 返回按距离排序的碰撞结果
- 支持最大距离限制

#### 范围查询 (Range Query)
- 查找指定球形区域内的所有对象
- 基于AABB近似过滤，精确距离验证

#### 最近邻查询 (Nearest Neighbor)
- 查找距离指定点最近的对象
- 优化的遍历算法，减少不必要的节点访问

### 3. 动态更新

#### 对象插入
- 智能选择插入位置
- 自动维护树结构
- 支持叶子节点分裂

#### 对象更新
- 检测对象是否仍在当前包围盒内
- 必要时重新插入对象
- 优化性能避免不必要的重建

#### 对象删除
- 安全的节点删除操作
- 自动树结构维护
- 处理各种边界情况

## 性能优化

### 1. 内存管理
- 对象ID到节点的快速映射
- 缓存子树大小减少重复计算
- 标记脏节点进行延迟更新

### 2. 遍历优化
- 优先遍历距离更近的子节点
- 早期退出机制
- 按需计算树统计信息

### 3. 构建优化
- 多种构建策略适应不同场景
- SAH优化减少射线检测成本
- 支持树的重建和优化

## 使用场景

### 1. 游戏碰撞检测
- 角色与环境碰撞
- 射线检测用于武器系统
- 爆炸范围检测

### 2. 空间查询
- 查找视野内对象
- 区域内对象检测
- 路径规划中的障碍检测

### 3. 物理模拟
- 粗粒度碰撞检测
- 空间分区优化
- 粒子系统优化

## 集成指南

### 1. 安装和导入
```typescript
import { BVHTree, AABB, BoundingSphere, Ray } from '@galacean/engine-bvh';
import { BoundingBox, Vector3 } from '@galacean/engine-math';
```

### 2. 基本使用
```typescript
// 创建BVH树
const bvh = new BVHTree();

// 添加对象
const bounds = new BoundingBox(min, max);
const id = bvh.insert(bounds, userData);

// 射线检测
const ray = new Ray(origin, direction);
const results = bvh.raycast(ray);
```

### 3. 高级功能
```typescript
// 批量构建
const objects = [...] // 对象数组
const bvh = BVHBuilder.build(objects, BVHBuildStrategy.SAH);

// 空间查询
const nearby = bvh.queryRange(point, radius);

// 动态更新
bvh.update(id, newBounds);
```

## 技术特性

### 1. 坐标系统
- 遵循 Galacean Engine 的右手坐标系
- 使用列主序矩阵
- 与 engine-math 包完全兼容

### 2. TypeScript 支持
- 完整的类型定义
- 泛型支持
- 严格的类型检查

### 3. 性能指标
- O(log n) 平均查询复杂度
- 支持大规模场景（10,000+ 对象）
- 内存使用优化

## 扩展性

### 1. 自定义包围盒
- 继承 BoundingVolume 基类
- 实现特定的碰撞检测算法
- 支持任意形状的包围盒

### 2. 自定义构建策略
- 实现 IBVHBuilder 接口
- 添加新的构建算法
- 适配特定应用场景

### 3. 查询优化
- 实现特定的查询算法
- 添加缓存机制
- 支持并行查询

## 测试和验证

### 1. 单元测试
- 基本功能测试
- 边界条件测试
- 性能基准测试

### 2. 示例代码
- 基本使用示例
- 高级功能演示
- 最佳实践指南

## 未来扩展

### 1. 多线程支持
- Web Worker 集成
- 并行构建
- 异步查询

### 2. GPU 加速
- WebGL 计算着色器
- 大规模并行处理
- 实时更新

### 3. 高级算法
- 动态BVH (dBVH)
- 层次化实例化
- 混合包围盒类型

## 维护和贡献

### 1. 代码规范
- 遵循 Galacean Engine 编码规范
- 完整的 JSDoc 注释
- TypeScript 严格模式

### 2. 性能监控
- 基准测试套件
- 性能回归检测
- 内存泄漏检查

### 3. 文档更新
- API 文档同步更新
- 示例代码维护
- 技术文章撰写