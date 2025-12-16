import { BoundingBox, Vector3 } from "@galacean/engine-math";
import { BVHTree } from "../BVHTree";
import { BVHNode } from "../BVHNode";

/**
 * BVH builder with different construction strategies.
 * Provides various algorithms for building optimal BVH trees.
 */
export class BVHBuilder {
  /**
   * Build a BVH tree from an array of objects with bounding boxes.
   * @param objects - Array of objects with bounds and userData
   * @param strategy - Building strategy to use
   * @returns A new BVH tree
   */
  static build(
    objects: Array<{ bounds: BoundingBox; userData: any }>,
    strategy: BVHBuildStrategy = BVHBuildStrategy.SAH
  ): BVHTree {
    if (!objects || objects.length === 0) {
      return new BVHTree();
    }

    switch (strategy) {
      case BVHBuildStrategy.SAH:
        return this._buildSAH(objects);
      case BVHBuildStrategy.Median:
        return this._buildMedian(objects);
      case BVHBuildStrategy.Equal:
        return this._buildEqual(objects);
      default:
        return this._buildSAH(objects);
    }
  }

  /**
   * Build BVH using Surface Area Heuristic (SAH).
   * @param objects - Objects to build tree from
   * @returns BVH tree with SAH optimization
   */
  private static _buildSAH(objects: Array<{ bounds: BoundingBox; userData: any }>): BVHTree {
    const tree = new BVHTree(8, 32, true);

    if (objects.length === 1) {
      tree.insert(objects[0].bounds, objects[0].userData);
      return tree;
    }

    const root = this._buildSAHNode(objects, 0);
    tree.root = root;

    // Update object map
    const leaves: BVHNode[] = [];
    root.getLeaves(leaves);
    for (let i = 0; i < leaves.length; i++) {
      (tree as any)._objectMap.set(i, leaves[i]);
    }

    return tree;
  }

  /**
   * Recursively build BVH node using SAH.
   * @param objects - Objects for this node
   * @param depth - Current depth
   * @returns New BVH node
   */
  private static _buildSAHNode(
    objects: Array<{ bounds: BoundingBox; userData: any }>,
    depth: number
  ): BVHNode {
    // Calculate bounds for all objects
    const bounds = new BoundingBox();
    this._calculateBounds(objects, bounds);

    // Base case: leaf node
    if (objects.length <= 8 || depth >= 32) {
      const node = new BVHNode(bounds, true, depth);
      if (objects.length === 1) {
        node.userData = objects[0].userData;
      } else {
        // Store array of objects
        node.userData = objects.map(obj => obj.userData);
      }
      return node;
    }

    // Find best split using SAH
    const split = this._findBestSAHSplit(objects, bounds);

    if (!split) {
      // Couldn't find good split, create leaf
      const node = new BVHNode(bounds, true, depth);
      node.userData = objects.map(obj => obj.userData);
      return node;
    }

    // Create internal node and recurse
    const node = new BVHNode(bounds, false, depth);
    node.left = this._buildSAHNode(split.leftObjects, depth + 1);
    node.right = this._buildSAHNode(split.rightObjects, depth + 1);
    node.left.parent = node;
    node.right.parent = node;

    return node;
  }

  /**
   * Find the best split using Surface Area Heuristic.
   * @param objects - Objects to split
   * @param bounds - Total bounds
   * @returns Split information or null
   */
  private static _findBestSAHSplit(
    objects: Array<{ bounds: BoundingBox; userData: any }>,
    bounds: BoundingBox
  ): { leftObjects: any[]; rightObjects: any[]; cost: number } | null {
    let bestSplit: { leftObjects: any[]; rightObjects: any[]; cost: number } | null = null;
    let bestCost = Infinity;

    // Try splitting on each axis
    for (let axis = 0; axis < 3; axis++) {
      // Sort objects by center position on this axis
      const sorted = objects.slice().sort((a, b) => {
        const aCenter = (a.bounds.min.getByIndex(axis) + a.bounds.max.getByIndex(axis)) * 0.5;
        const bCenter = (b.bounds.min.getByIndex(axis) + b.bounds.max.getByIndex(axis)) * 0.5;
        return aCenter - bCenter;
      });

      // Try different split positions
      for (let i = 1; i < sorted.length; i++) {
        const leftObjects = sorted.slice(0, i);
        const rightObjects = sorted.slice(i);

        const leftBounds = new BoundingBox();
        const rightBounds = new BoundingBox();

        this._calculateBounds(leftObjects, leftBounds);
        this._calculateBounds(rightObjects, rightBounds);

        const cost = this._calculateSAHCost(
          bounds, leftBounds, rightBounds,
          leftObjects.length, rightObjects.length
        );

        if (cost < bestCost) {
          bestCost = cost;
          bestSplit = {
            leftObjects,
            rightObjects,
            cost
          };
        }
      }
    }

    return bestSplit;
  }

  /**
   * Calculate SAH cost for a split.
   * @param parentBounds - Parent node bounds
   * @param leftBounds - Left child bounds
   * @param rightBounds - Right child bounds
   * @param leftCount - Number of objects in left
   * @param rightCount - Number of objects in right
   * @returns SAH cost
   */
  private static _calculateSAHCost(
    parentBounds: BoundingBox,
    leftBounds: BoundingBox,
    rightBounds: BoundingBox,
    leftCount: number,
    rightCount: number
  ): number {
    const parentArea = this._calculateSurfaceArea(parentBounds);
    const leftArea = this._calculateSurfaceArea(leftBounds);
    const rightArea = this._calculateSurfaceArea(rightBounds);

    // SAH cost: traversal cost + left child cost + right child cost
    return 1.0 + (leftArea / parentArea) * leftCount + (rightArea / parentArea) * rightCount;
  }

  /**
   * Build BVH using median split.
   * @param objects - Objects to build tree from
   * @returns BVH tree with median splits
   */
  private static _buildMedian(objects: Array<{ bounds: BoundingBox; userData: any }>): BVHTree {
    const tree = new BVHTree(8, 32, false);

    if (objects.length === 1) {
      tree.insert(objects[0].bounds, objects[0].userData);
      return tree;
    }

    const root = this._buildMedianNode(objects, 0);
    tree.root = root;

    // Update object map
    const leaves: BVHNode[] = [];
    root.getLeaves(leaves);
    for (let i = 0; i < leaves.length; i++) {
      (tree as any)._objectMap.set(i, leaves[i]);
    }

    return tree;
  }

  /**
   * Recursively build BVH node using median split.
   * @param objects - Objects for this node
   * @param depth - Current depth
   * @returns New BVH node
   */
  private static _buildMedianNode(
    objects: Array<{ bounds: BoundingBox; userData: any }>,
    depth: number
  ): BVHNode {
    // Calculate bounds for all objects
    const bounds = new BoundingBox();
    this._calculateBounds(objects, bounds);

    // Base case: leaf node
    if (objects.length <= 8 || depth >= 32) {
      const node = new BVHNode(bounds, true, depth);
      node.userData = objects.length === 1 ? objects[0].userData : objects.map(obj => obj.userData);
      return node;
    }

    // Find axis with maximum extent
    const extents = Vector3.subtract(bounds.max, bounds.min, new Vector3());
    const splitAxis = extents.x >= extents.y && extents.x >= extents.z ? 0 :
                     extents.y >= extents.z ? 1 : 2;

    // Sort objects by center position on split axis
    const sorted = objects.slice().sort((a, b) => {
      const aCenter = (a.bounds.min.getByIndex(splitAxis) + a.bounds.max.getByIndex(splitAxis)) * 0.5;
      const bCenter = (b.bounds.min.getByIndex(splitAxis) + b.bounds.max.getByIndex(splitAxis)) * 0.5;
      return aCenter - bCenter;
    });

    // Split at median
    const medianIndex = Math.floor(sorted.length / 2);
    const leftObjects = sorted.slice(0, medianIndex);
    const rightObjects = sorted.slice(medianIndex);

    // Create internal node and recurse
    const node = new BVHNode(bounds, false, depth);
    node.left = this._buildMedianNode(leftObjects, depth + 1);
    node.right = this._buildMedianNode(rightObjects, depth + 1);
    node.left.parent = node;
    node.right.parent = node;

    return node;
  }

  /**
   * Build BVH using equal splits.
   * @param objects - Objects to build tree from
   * @returns BVH tree with equal splits
   */
  private static _buildEqual(objects: Array<{ bounds: BoundingBox; userData: any }>): BVHTree {
    const tree = new BVHTree(8, 32, false);

    if (objects.length === 1) {
      tree.insert(objects[0].bounds, objects[0].userData);
      return tree;
    }

    const root = this._buildEqualNode(objects, 0);
    tree.root = root;

    // Update object map
    const leaves: BVHNode[] = [];
    root.getLeaves(leaves);
    for (let i = 0; i < leaves.length; i++) {
      (tree as any)._objectMap.set(i, leaves[i]);
    }

    return tree;
  }

  /**
   * Recursively build BVH node using equal splits.
   * @param objects - Objects for this node
   * @param depth - Current depth
   * @returns New BVH node
   */
  private static _buildEqualNode(
    objects: Array<{ bounds: BoundingBox; userData: any }>,
    depth: number
  ): BVHNode {
    // Calculate bounds for all objects
    const bounds = new BoundingBox();
    this._calculateBounds(objects, bounds);

    // Base case: leaf node
    if (objects.length <= 8 || depth >= 32) {
      const node = new BVHNode(bounds, true, depth);
      node.userData = objects.length === 1 ? objects[0].userData : objects.map(obj => obj.userData);
      return node;
    }

    // Split objects in half
    const midIndex = Math.floor(objects.length / 2);
    const leftObjects = objects.slice(0, midIndex);
    const rightObjects = objects.slice(midIndex);

    // Create internal node and recurse
    const node = new BVHNode(bounds, false, depth);
    node.left = this._buildEqualNode(leftObjects, depth + 1);
    node.right = this._buildEqualNode(rightObjects, depth + 1);
    node.left.parent = node;
    node.right.parent = node;

    return node;
  }

  /**
   * Calculate bounds for a collection of objects.
   * @param objects - Objects to calculate bounds for
   * @param out - Output bounds
   */
  private static _calculateBounds(
    objects: Array<{ bounds: BoundingBox; userData: any }>,
    out: BoundingBox
  ): void {
    if (objects.length === 0) {
      out.min.set(0, 0, 0);
      out.max.set(0, 0, 0);
      return;
    }

    out.min.copyFrom(objects[0].bounds.min);
    out.max.copyFrom(objects[0].bounds.max);

    for (let i = 1; i < objects.length; i++) {
      Vector3.min(out.min, objects[i].bounds.min, out.min);
      Vector3.max(out.max, objects[i].bounds.max, out.max);
    }
  }

  /**
   * Calculate surface area of a bounding box.
   * @param bounds - Bounding box
   * @returns Surface area
   */
  private static _calculateSurfaceArea(bounds: BoundingBox): number {
    const dx = bounds.max.x - bounds.min.x;
    const dy = bounds.max.y - bounds.min.y;
    const dz = bounds.max.z - bounds.min.z;
    return 2.0 * (dx * dy + dx * dz + dy * dz);
  }
}

/**
 * BVH building strategies.
 */
export enum BVHBuildStrategy {
  /** Surface Area Heuristic - optimal but slower */
  SAH,
  /** Median split - balanced tree */
  Median,
  /** Equal split - fast but less optimal */
  Equal
}