// 简单的类型检查
import { BVHTree, BVHBuilder, AABB, BoundingSphere, Ray, BVHBuildStrategy } from './src/index';
import { BoundingBox, Vector3 } from '@galacean/engine-math';

console.log('✅ 所有导出正确');
console.log('✅ BVHTree:', typeof BVHTree);
console.log('✅ BVHBuilder:', typeof BVHBuilder);
console.log('✅ AABB:', typeof AABB);
console.log('✅ BoundingSphere:', typeof BoundingSphere);
console.log('✅ Ray:', typeof Ray);
console.log('✅ BVHBuildStrategy:', BVHBuildStrategy);
