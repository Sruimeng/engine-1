import { BoundingBox, Vector3 } from "@galacean/engine-math";
import { IBVHNode } from "./interfaces";

/**
 * Implementation of BVH (Bounding Volume Hierarchy) node.
 * Represents a node in the binary tree structure used for spatial acceleration.
 */
export class BVHNode implements IBVHNode {
  /** Counter for generating unique node IDs */
  private static _idCounter: number = 0;

  /** Unique identifier for this node */
  public readonly id: number;

  /** Bounding volume that contains all children of this node */
  public bounds: BoundingBox;

  /** Parent node in the tree hierarchy */
  public parent: BVHNode | null;

  /** Left child node */
  public left: BVHNode | null;

  /** Right child node */
  public right: BVHNode | null;

  /** User-defined data associated with this node */
  public userData: any;

  /** Depth of this node in the tree */
  public depth: number;

  /** Cached subtree size for optimization */
  private _subtreeSize: number = 0;

  /** Whether this subtree needs size recalculation */
  private _subtreeSizeDirty: boolean = true;

  /**
   * Constructor of BVHNode.
   * @param bounds - Initial bounding volume for this node
   * @param isLeaf - Whether this node is a leaf node
   * @param depth - Depth of this node in the tree
   */
  constructor(bounds: BoundingBox = null, isLeaf: boolean = false, depth: number = 0) {
    this.id = BVHNode._idCounter++;
    this.bounds = bounds || new BoundingBox();
    this.parent = null;
    this.left = null;
    this.right = null;
    this.userData = null;
    this.depth = depth;
  }

  /**
   * Check if this node is a leaf node.
   * @returns True if this node is a leaf node
   */
  get isLeaf(): boolean {
    return this.left === null && this.right === null;
  }

  /**
   * Get the number of objects in this subtree.
   * @returns Number of objects in subtree
   */
  get subtreeSize(): number {
    if (this._subtreeSizeDirty) {
      this._recalculateSubtreeSize();
    }
    return this._subtreeSize;
  }

  /**
   * Mark this subtree as needing size recalculation.
   */
  public markSubtreeSizeDirty(): void {
    this._subtreeSizeDirty = true;
    if (this.parent) {
      this.parent.markSubtreeSizeDirty();
    }
  }

  /**
   * Recalculate the subtree size for this node.
   */
  private _recalculateSubtreeSize(): void {
    if (this.isLeaf) {
      this._subtreeSize = 1;
    } else {
      let size = 0;
      if (this.left) {
        size += this.left.subtreeSize;
      }
      if (this.right) {
        size += this.right.subtreeSize;
      }
      this._subtreeSize = size;
    }
    this._subtreeSizeDirty = false;
  }

  /**
   * Set the left child of this node.
   * @param node - The left child node
   */
  public setLeft(node: BVHNode | null): void {
    if (this.left) {
      this.left.parent = null;
    }
    this.left = node;
    if (node) {
      node.parent = this;
      node.depth = this.depth + 1;
      this._updateChildDepths(node);
    }
    this.markSubtreeSizeDirty();
  }

  /**
   * Set the right child of this node.
   * @param node - The right child node
   */
  public setRight(node: BVHNode | null): void {
    if (this.right) {
      this.right.parent = null;
    }
    this.right = node;
    if (node) {
      node.parent = this;
      node.depth = this.depth + 1;
      this._updateChildDepths(node);
    }
    this.markSubtreeSizeDirty();
  }

  /**
   * Update depths for all children of a node.
   * @param node - The node whose children need depth updates
   */
  private _updateChildDepths(node: BVHNode): void {
    const queue: BVHNode[] = [node];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.left) {
        current.left.depth = current.depth + 1;
        queue.push(current.left);
      }
      if (current.right) {
        current.right.depth = current.depth + 1;
        queue.push(current.right);
      }
    }
  }

  /**
   * Update the bounding volume to contain both children.
   */
  public updateBounds(): void {
    if (this.isLeaf) {
      return;
    }

    // Reset bounds
    this.bounds.min.set(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    this.bounds.max.set(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

    // Merge bounds from children
    if (this.left) {
      Vector3.min(this.bounds.min, this.left.bounds.min, this.bounds.min);
      Vector3.max(this.bounds.max, this.left.bounds.max, this.bounds.max);
    }
    if (this.right) {
      Vector3.min(this.bounds.min, this.right.bounds.min, this.bounds.min);
      Vector3.max(this.bounds.max, this.right.bounds.max, this.bounds.max);
    }

    // Mark parent for bounds update
    if (this.parent) {
      this.parent.updateBounds();
    }
  }

  /**
   * Get all leaf nodes in this subtree.
   * @param results - Array to store leaf nodes (optional)
   * @returns Array of leaf nodes
   */
  public getLeaves(results: BVHNode[] = []): BVHNode[] {
    if (this.isLeaf) {
      results.push(this);
    } else {
      if (this.left) {
        this.left.getLeaves(results);
      }
      if (this.right) {
        this.right.getLeaves(results);
      }
    }
    return results;
  }

  /**
   * Get the maximum depth of this subtree.
   * @returns Maximum depth
   */
  public getMaxDepth(): number {
    if (this.isLeaf) {
      return this.depth;
    }

    let leftDepth = this.depth;
    let rightDepth = this.depth;

    if (this.left) {
      leftDepth = this.left.getMaxDepth();
    }
    if (this.right) {
      rightDepth = this.right.getMaxDepth();
    }

    return Math.max(leftDepth, rightDepth);
  }

  /**
   * Check if this subtree is balanced.
   * A tree is balanced if the depth difference between left and right subtrees is at most 1.
   * @returns True if balanced, false otherwise
   */
  public isBalanced(): boolean {
    if (this.isLeaf) {
      return true;
    }

    const leftHeight = this.left ? this.left.getSubtreeHeight() : 0;
    const rightHeight = this.right ? this.right.getSubtreeHeight() : 0;

    return Math.abs(leftHeight - rightHeight) <= 1 &&
           (!this.left || this.left.isBalanced()) &&
           (!this.right || this.right.isBalanced());
  }

  /**
   * Get the height of this subtree (number of edges to deepest leaf).
   * @returns Height of subtree
   */
  public getSubtreeHeight(): number {
    if (this.isLeaf) {
      return 0;
    }

    const leftHeight = this.left ? this.left.getSubtreeHeight() : 0;
    const rightHeight = this.right ? this.right.getSubtreeHeight() : 0;

    return Math.max(leftHeight, rightHeight) + 1;
  }

  /**
   * Clone this node (deep copy).
   * @returns A new node with the same properties
   */
  public clone(): BVHNode {
    const cloned = new BVHNode(this.bounds.clone(), this.isLeaf, this.depth);
    cloned.userData = this.userData;

    if (this.left) {
      cloned.left = this.left.clone();
      cloned.left.parent = cloned;
    }
    if (this.right) {
      cloned.right = this.right.clone();
      cloned.right.parent = cloned;
    }

    return cloned;
  }

  /**
   * Reset this node to an empty state.
   */
  public reset(): void {
    this.bounds.min.set(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    this.bounds.max.set(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
    this.left = null;
    this.right = null;
    this.userData = null;
    this._subtreeSize = 0;
    this._subtreeSizeDirty = true;
  }
}