import { BoundingBox } from "@galacean/engine-math";

/**
 * Interface for BVH (Bounding Volume Hierarchy) node.
 * BVH nodes form a binary tree structure that accelerates collision detection.
 */
export interface IBVHNode {
  /** Unique identifier for this node */
  readonly id: number;

  /** Bounding volume that contains all children of this node */
  readonly bounds: BoundingBox;

  /** Parent node in the tree hierarchy, null for root node */
  parent: IBVHNode | null;

  /** Left child node, null for leaf nodes */
  left: IBVHNode | null;

  /** Right child node, null for leaf nodes */
  right: IBVHNode | null;

  /** Whether this node is a leaf node (contains actual objects) */
  readonly isLeaf: boolean;

  /** User-defined data associated with this node (only for leaf nodes) */
  userData: any;

  /** Depth of this node in the tree (root is 0) */
  readonly depth: number;

  /** Number of objects in this subtree (including this node if it's a leaf) */
  readonly subtreeSize: number;
}