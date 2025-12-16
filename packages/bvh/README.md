# @galacean/engine-bvh

A subpackage of `@galacean/engine`.

Bounding Volume Hierarchy (BVH) collision detection system for Galacean Engine. This package provides efficient spatial acceleration structures for fast collision detection and ray casting operations.

## Features

- **BVH Tree**: Efficient hierarchical acceleration structure
- **Bounding Volumes**: Support for AABB, Sphere, and custom bounding volumes
- **Collision Detection**: Ray casting, intersection testing, and spatial queries
- **Dynamic Updates**: Fast refitting and rebuilding algorithms
- **SAH Optimization**: Surface Area Heuristic for optimal tree construction
- **Memory Efficient**: Optimized memory layout and pooling

## Usage

```typescript
import { BVHTree, BoundingBox, Ray } from '@galacean/engine-bvh';

// Create BVH tree
const bvh = new BVHTree();

// Add objects to BVH
const bounds = new BoundingBox();
// ... setup bounds
const objectId = bvh.insert(bounds, userData);

// Perform ray casting
const ray = new Ray(origin, direction);
const results = bvh.raycast(ray);

// Update object bounds
bvh.update(objectId, newBounds);

// Remove object
bvh.remove(objectId);
```

## API Reference

### Core Classes

- `BVHTree`: Main BVH implementation
- `BVHNode`: Tree node structure
- `BoundingVolume`: Base class for bounding volumes
- `CollisionResult`: Collision detection result data

### Bounding Volume Types

- `AABB`: Axis-Aligned Bounding Box
- `BoundingSphere`: Spherical bounding volume

### Query Operations

- `raycast()`: Ray intersection testing
- `intersectBounds()`: Bounds intersection testing
- `queryRange()`: Spatial range queries
- `findNearest()`: Nearest neighbor searches

## License

MIT