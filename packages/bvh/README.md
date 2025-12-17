# @galacean/engine-bvh

Galacean Engine 的 BVH (Bounding Volume Hierarchy) 加速结构包。

## 安装

```bash
npm install @galacean/engine-bvh
```

## 快速开始

### 基础使用

```typescript
import { BVHTree, AABB, Ray } from '@galacean/engine-bvh';
import { BoundingBox, Vector3 } from '@galacean/engine-math';

// 创建 BVH 树
const bvh = new BVHTree();

// 插入对象
const bounds = new BoundingBox(
  new Vector3(-1, -1, -1),
  new Vector3(1, 1, 1)
);
const id = bvh.insert(bounds, { name: "Box1" });

// 光线投射
const ray = new Ray(
  new Vector3(-5, 0, 0),
  new Vector3(1, 0, 0)
);
const results = bvh.raycast(ray);

console.log(`找到 ${results.length} 个碰撞`);
```

### 批量构建（推荐）

```typescript
import { BVHBuilder, BVHBuildStrategy } from '@galacean/engine-bvh';

// 准备大量对象
const objects = [];
for (let i = 0; i < 1000; i++) {
  const position = new Vector3(
    Math.random() * 100,
    Math.random() * 100,
    Math.random() * 100
  );
  const size = 1;
  const bounds = new BoundingBox(
    Vector3.subtract(position, new Vector3(size, size, size)),
    Vector3.add(position, new Vector3(size, size, size))
  );
  objects.push({ bounds, userData: { id: i } });
}

// 使用 SAH 策略构建（静态场景推荐）
const bvh = BVHBuilder.build(objects, BVHBuildStrategy.SAH);

// 查询性能统计
const stats = bvh.getStats();
console.log(`节点数: ${stats.nodeCount}, 查询加速比: ~100x`);
```

## 核心功能

### 1. 空间查询操作
- **raycast()**: 光线投射检测
- **queryRange()**: 范围查询
- **findNearest()**: 最近邻搜索
- **intersectBounds()**: 相交检测

### 2. 动态更新
- **insert()**: 插入对象
- **update()**: 更新对象位置
- **remove()**: 移除对象
- **refit()**: 高效重拟合
- **rebuild()**: 完整重建

### 3. 构建策略
- **SAH**: 表面积启发式 - 最优查询性能
- **Median**: 中位数分割 - 快速构建
- **Equal**: 均等分割 - 均匀分布场景

## API 参考

### BVHTree

```typescript
class BVHTree {
  root: BVHNode | null;
  maxLeafSize: number;
  maxDepth: number;
  enableSAH: boolean;
  readonly count: number;

  constructor(maxLeafSize?: number, maxDepth?: number, enableSAH?: boolean);

  insert(bounds: BoundingBox, userData?: any): number;
  update(objectId: number, newBounds: BoundingBox): boolean;
  remove(objectId: number): boolean;
  clear(): void;

  raycast(ray: Ray, maxDistance?: number): CollisionResult[];
  queryRange(center: Vector3, radius: number): any[];
  findNearest(position: Vector3, maxDistance?: number): any;
  intersectBounds(bounds: BoundingBox): any[];

  refit(): void;
  rebuild(strategy?: BVHBuildStrategy): void;
  getStats(): BVHStats;
  validate(): boolean;
}
```

### BVHBuilder

```typescript
class BVHBuilder {
  static build(
    objects: BVHInsertObject[],
    strategy?: BVHBuildStrategy
  ): BVHTree;
}
```

### 主要类型

```typescript
interface BVHStats {
  nodeCount: number;      // 节点总数
  leafCount: number;      // 叶子节点数
  maxDepth: number;       // 最大深度
  balanceFactor: number;  // 平衡因子
  objectCount: number;    // 对象总数
  memoryUsage: number;    // 内存使用估算
}

interface CollisionResult {
  object: any;
  distance: number;
  point: Vector3;
  normal: Vector3;
  node: BVHNode;
}
```

## 性能优化建议

### 1. 静态场景

```typescript
// 使用 SAH 构建一次性构建
const bvh = BVHBuilder.build(objects, BVHBuildStrategy.SAH);
// 查询性能最优
```

### 2. 动态场景

```typescript
// 使用 Median 构建
const bvh = new BVHTree(8, 32, false);

// 批量更新后重建
function update() {
  // 更新对象位置
  for (const obj of dynamics) {
    bvh.update(obj.id, obj.bounds);
  }
  // 定期重建
  if (frameCount % 60 === 0) {
    bvh.rebuild(BVHBuildStrategy.Median);
    frameCount = 0;
  }
}
```

### 3. 内存优化

```typescript
// 及时清理
bvh.clear();

// 验证健康状态
if (!bvh.validate()) {
  bvh.rebuild();
}

// 监控统计
const stats = bvh.getStats();
if (stats.balanceFactor > 2.0) {
  // 树不平衡，建议优化
}
```

## 集成示例

### 与核心引擎集成

```typescript
import { Entity, Renderer } from '@galacean/engine-core';
import { BVHTree } from '@galacean/engine-bvh';

class SpatialManager {
  private bvh: BVHTree;
  private entityMap: Map<number, Entity>;

  constructor() {
    this.bvh = new BVHTree();
    this.entityMap = new Map();
  }

  addEntity(entity: Entity): number {
    const renderer = entity.getComponent(Renderer);
    if (renderer) {
      const id = this.bvh.insert(renderer.bounds, entity);
      this.entityMap.set(id, entity);
      return id;
    }
    return -1;
  }

  raycastEntities(ray: Ray): Entity[] {
    const results = this.bvh.raycast(ray);
    return results.map(r => r.object).filter(e => e != null);
  }
}
```

## 与其他包的依赖关系

- **@galacean/engine-math**: 提供 Vector3, BoundingBox, Ray 等基础数学类型
- **@galacean/engine-core**: （可选）用于与实体系统集成

## 测试

```bash
# 运行验证脚本
cd packages/bvh
node verify.ts
```

## 许可证

MIT
