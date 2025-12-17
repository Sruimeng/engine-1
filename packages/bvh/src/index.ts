/**
 * @galacean/engine-bvh - BVH 空间加速结构包
 *
 * 高效的 BVH (Bounding Volume Hierarchy) 实现，用于：
 * - 碰撞检测
 * - 光线投射 (Raycast)
 * - 空间范围查询
 * - 最近邻搜索
 */

// 核心类
export { BVHTree } from './BVHTree';
export { BVHNode } from './BVHNode';

// 包围体
export { BoundingVolume } from './BoundingVolume';
export { AABB } from './AABB';
export { BoundingSphere } from './BoundingSphere';

// 几何类
export { Ray } from './Ray';
export { CollisionResult } from './CollisionResult';

// 构建器
export { BVHBuilder } from './BVHBuilder';

// 枚举
export { BVHBuildStrategy, BoundingVolumeType } from './enums';

// 类型
export type {
  BVHStats,
  BVHInsertObject,
  CollisionResult as CollisionResultType,
  SpatialQueryResult
} from './types';

// 工具函数
export {
  unionBounds,
  boundsVolume,
  boundsSurfaceArea,
  boundsIntersects,
  getLongestAxis,
  toAABB,
  toBoundingSphere,
  PerformanceTimer
} from './utils';

/**
 * 当前版本号
 */
export const VERSION = '1.6.11';
