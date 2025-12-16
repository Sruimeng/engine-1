import { BoundingBox, Ray } from "@galacean/engine-math";
import { IBVHNode } from "./IBVHNode";
import { CollisionResult } from "../CollisionResult";

/**
 * Interface for BVH (Bounding Volume Hierarchy) tree.
 * Provides spatial acceleration structure for fast collision detection and spatial queries.
 */
export interface IBVHTree {
  /** Number of nodes currently in the tree */
  readonly count: number;

  /** Maximum depth of the tree */
  readonly maxDepth: number;

  /** Root node of the BVH tree */
  readonly root: IBVHNode | null;

  /**
   * Insert a new object into the BVH tree.
   * @param bounds - Bounding volume of the object
   * @param userData - User-defined data associated with the object
   * @returns Unique identifier for the inserted object
   */
  insert(bounds: BoundingBox, userData?: any): number;

  /**
   * Remove an object from the BVH tree.
   * @param id - Unique identifier of the object to remove
   * @returns True if object was found and removed, false otherwise
   */
  remove(id: number): boolean;

  /**
   * Update the bounding volume of an existing object.
   * @param id - Unique identifier of the object to update
   * @param bounds - New bounding volume
   * @returns True if object was found and updated, false otherwise
   */
  update(id: number, bounds: BoundingBox): boolean;

  /**
   * Perform ray casting against all objects in the tree.
   * @param ray - Ray to cast
   * @param maxDistance - Maximum distance to check (optional)
   * @param results - Array to store collision results (optional)
   * @returns Array of collision results sorted by distance
   */
  raycast(ray: Ray, maxDistance?: number, results?: CollisionResult[]): CollisionResult[];

  /**
   * Find all objects whose bounding volumes intersect with the given bounds.
   * @param bounds - Bounding volume to test against
   * @param results - Array to store intersecting objects (optional)
   * @returns Array of intersecting objects
   */
  intersectBounds(bounds: BoundingBox, results?: any[]): any[];

  /**
   * Find all objects within the specified range from a point.
   * @param point - Center point of the query
   * @param radius - Query radius
   * @param results - Array to store found objects (optional)
   * @returns Array of objects within range
   */
  queryRange(point: import("@galacean/engine-math").Vector3, radius: number, results?: any[]): any[];

  /**
   * Find the nearest object to the given point.
   * @param point - Query point
   * @param maxDistance - Maximum search distance (optional)
   * @returns Nearest object or null if none found
   */
  findNearest(point: import("@galacean/engine-math").Vector3, maxDistance?: number): any;

  /**
   * Rebuild the entire BVH tree for optimal performance.
   * This operation can be expensive and should be used sparingly.
   */
  rebuild(): void;

  /**
   * Optimize the tree structure using SAH (Surface Area Heuristic).
   * @returns True if optimization was performed, false if tree was already optimal
   */
  optimize(): boolean;

  /**
   * Clear all objects from the tree.
   */
  clear(): void;

  /**
   * Get statistics about the tree structure.
   * @returns Tree statistics including node count, depth, and balance metrics
   */
  getStats(): {
    nodeCount: number;
    leafCount: number;
    maxDepth: number;
    averageDepth: number;
    balanceFactor: number;
  };
}