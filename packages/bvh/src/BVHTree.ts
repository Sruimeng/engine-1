import { BoundingBox, Ray, Vector3 } from "@galacean/engine-math";
import { IBVHTree } from "./interfaces";
import { BVHNode } from "./BVHNode";
import { CollisionResult } from "./CollisionResult";

/**
 * BVH (Bounding Volume Hierarchy) tree implementation.
 * Provides efficient spatial acceleration for collision detection and ray casting.
 */
export class BVHTree implements IBVHTree {
  /** Root node of the BVH tree */
  public root: BVHNode | null;

  /** Maximum number of objects per leaf before splitting */
  public maxLeafSize: number;

  /** Maximum tree depth */
  public maxDepth: number;

  /** Enable SAH (Surface Area Heuristic) optimization */
  public enableSAH: boolean;

  /** Object ID to node mapping for fast lookup */
  private _objectMap: Map<number, BVHNode>;

  /** ID counter for new objects */
  private _nextId: number;

  /**
   * Constructor of BVHTree.
   * @param maxLeafSize - Maximum objects per leaf node (default: 8)
   * @param maxDepth - Maximum tree depth (default: 32)
   * @param enableSAH - Whether to enable SAH optimization (default: true)
   */
  constructor(maxLeafSize: number = 8, maxDepth: number = 32, enableSAH: boolean = true) {
    this.root = null;
    this.maxLeafSize = maxLeafSize;
    this.maxDepth = maxDepth;
    this.enableSAH = enableSAH;
    this._objectMap = new Map();
    this._nextId = 0;
  }

  /**
   * @inheritdoc
   */
  get count(): number {
    return this._objectMap.size;
  }

  /**
   * @inheritdoc
   */
  insert(bounds: BoundingBox, userData?: any): number {
    const id = this._nextId++;
    const node = new BVHNode(bounds, true, 0);
    node.userData = userData;

    this._objectMap.set(id, node);

    if (!this.root) {
      this.root = node;
    } else {
      this._insertNode(node);
    }

    return id;
  }

  /**
   * Insert a node into the tree.
   * @param node - Node to insert
   */
  private _insertNode(node: BVHNode): void {
    let current = this.root!;
    let depth = 0;

    while (!current.isLeaf && depth < this.maxDepth) {
      // Choose the better child for insertion
      const leftCost = this._calculateInsertionCost(current.left!, node);
      const rightCost = this._calculateInsertionCost(current.right!, node);

      if (leftCost < rightCost) {
        current = current.left!;
      } else {
        current = current.right!;
      }
      depth++;
    }

    if (current.isLeaf && depth < this.maxDepth) {
      // Split the leaf node
      this._splitLeafNode(current, node);
    } else {
      // Create a new parent and insert as sibling
      this._insertAsSibling(current, node);
    }
  }

  /**
   * Calculate the cost of inserting a node as a child of the given node.
   * @param parent - Potential parent node
   * @param node - Node to insert
   * @returns Insertion cost
   */
  private _calculateInsertionCost(parent: BVHNode, node: BVHNode): number {
    const mergedBounds = new BoundingBox();
    Vector3.min(parent.bounds.min, node.bounds.min, mergedBounds.min);
    Vector3.max(parent.bounds.max, node.bounds.max, mergedBounds.max);

    const surfaceArea = this._calculateSurfaceArea(mergedBounds);
    const originalArea = this._calculateSurfaceArea(parent.bounds);

    return surfaceArea - originalArea;
  }

  /**
   * Calculate the surface area of a bounding box.
   * @param bounds - Bounding box
   * @returns Surface area
   */
  private _calculateSurfaceArea(bounds: BoundingBox): number {
    const dx = bounds.max.x - bounds.min.x;
    const dy = bounds.max.y - bounds.min.y;
    const dz = bounds.max.z - bounds.min.z;
    return 2.0 * (dx * dy + dx * dz + dy * dz);
  }

  /**
   * Split a leaf node to accommodate a new node.
   * @param leaf - Leaf node to split
   * @param newNode - New node to insert
   */
  private _splitLeafNode(leaf: BVHNode, newNode: BVHNode): void {
    // Create new parent node
    const parent = new BVHNode(leaf.bounds.clone(), false, leaf.depth);
    parent.setLeft(leaf);
    parent.setRight(newNode);

    // Update bounds
    parent.updateBounds();

    // Replace leaf with parent in tree
    if (leaf.parent) {
      if (leaf.parent.left === leaf) {
        leaf.parent.setLeft(parent);
      } else {
        leaf.parent.setRight(parent);
      }
    } else {
      this.root = parent;
    }
  }

  /**
   * Insert a node as a sibling of an existing node.
   * @param sibling - Existing sibling node
   * @param newNode - New node to insert
   */
  private _insertAsSibling(sibling: BVHNode, newNode: BVHNode): void {
    // Create new parent
    const parent = new BVHNode(sibling.bounds.clone(), false, sibling.depth);
    parent.setLeft(sibling);
    parent.setRight(newNode);

    // Update bounds
    parent.updateBounds();

    // Replace sibling with parent
    if (sibling.parent) {
      if (sibling.parent.left === sibling) {
        sibling.parent.setLeft(parent);
      } else {
        sibling.parent.setRight(parent);
      }
    } else {
      this.root = parent;
    }
  }

  /**
   * @inheritdoc
   */
  remove(id: number): boolean {
    const node = this._objectMap.get(id);
    if (!node) {
      return false;
    }

    this._removeNode(node);
    this._objectMap.delete(id);
    return true;
  }

  /**
   * Remove a node from the tree.
   * @param node - Node to remove
   */
  private _removeNode(node: BVHNode): void {
    if (!node.parent) {
      // Removing root
      this.root = null;
      return;
    }

    const parent = node.parent;
    const sibling = parent.left === node ? parent.right : parent.left;

    if (parent.parent) {
      // Replace parent with sibling in grandparent
      if (parent.parent.left === parent) {
        parent.parent.setLeft(sibling);
      } else {
        parent.parent.setRight(sibling);
      }
    } else {
      // Parent is root, replace with sibling
      this.root = sibling;
      if (sibling) {
        sibling.parent = null;
        sibling.depth = 0;
      }
    }
  }

  /**
   * @inheritdoc
   */
  update(id: number, bounds: BoundingBox): boolean {
    const node = this._objectMap.get(id);
    if (!node) {
      return false;
    }

    // Check if object still fits in current bounds
    if (this._containsBounds(node.bounds, bounds)) {
      node.bounds.copyFrom(bounds);
      return true;
    }

    // Object moved outside current bounds, remove and reinsert
    this._removeNode(node);
    node.bounds.copyFrom(bounds);
    node.parent = null;
    node.depth = 0;
    this._insertNode(node);

    return true;
  }

  /**
   * Check if one bounding box contains another.
   * @param outer - Outer bounding box
   * @param inner - Inner bounding box
   * @returns True if outer contains inner
   */
  private _containsBounds(outer: BoundingBox, inner: BoundingBox): boolean {
    return outer.min.x <= inner.min.x && outer.min.y <= inner.min.y && outer.min.z <= inner.min.z &&
           outer.max.x >= inner.max.x && outer.max.y >= inner.max.y && outer.max.z >= inner.max.z;
  }

  /**
   * @inheritdoc
   */
  raycast(ray: Ray, maxDistance: number = Infinity, results: CollisionResult[] = []): CollisionResult[] {
    if (!this.root) {
      return results;
    }

    this._raycastNode(this.root, ray, maxDistance, results);

    // Sort results by distance
    results.sort((a, b) => a.distance - b.distance);

    return results;
  }

  /**
   * Perform ray casting on a node and its children.
   * @param node - Node to test
   * @param ray - Ray to cast
   * @param maxDistance - Maximum distance
   * @param results - Results array
   */
  private _raycastNode(node: BVHNode, ray: Ray, maxDistance: number, results: CollisionResult[]): void {
    // Test ray against node bounds
    const distance = ray.intersectBox(node.bounds);
    if (distance < 0 || distance > maxDistance) {
      return;
    }

    if (node.isLeaf) {
      // Check if we already have this result (avoid duplicates)
      const existingResult = results.find(r => r.object === node.userData);
      if (!existingResult && node.userData !== null) {
        const point = new Vector3();
        ray.getPoint(distance, point);
        results.push(new CollisionResult(node.userData, distance, point));
      }
    } else {
      // Test children
      if (node.left) {
        this._raycastNode(node.left, ray, maxDistance, results);
      }
      if (node.right) {
        this._raycastNode(node.right, ray, maxDistance, results);
      }
    }
  }

  /**
   * @inheritdoc
   */
  intersectBounds(bounds: BoundingBox, results: any[] = []): any[] {
    if (!this.root) {
      return results;
    }

    this._intersectNode(this.root, bounds, results);
    return results;
  }

  /**
   * Test bounds intersection for a node and its children.
   * @param node - Node to test
   * @param bounds - Bounds to test against
   * @param results - Results array
   */
  private _intersectNode(node: BVHNode, bounds: BoundingBox, results: any[]): void {
    // Test bounds intersection
    if (!this._boundsIntersect(node.bounds, bounds)) {
      return;
    }

    if (node.isLeaf) {
      if (node.userData !== null && !results.includes(node.userData)) {
        results.push(node.userData);
      }
    } else {
      if (node.left) {
        this._intersectNode(node.left, bounds, results);
      }
      if (node.right) {
        this._intersectNode(node.right, bounds, results);
      }
    }
  }

  /**
   * Test if two bounding boxes intersect.
   * @param a - First bounds
   * @param b - Second bounds
   * @returns True if they intersect
   */
  private _boundsIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return !(a.min.x > b.max.x || a.max.x < b.min.x ||
             a.min.y > b.max.y || a.max.y < b.min.y ||
             a.min.z > b.max.z || a.max.z < b.min.z);
  }

  /**
   * @inheritdoc
   */
  queryRange(point: Vector3, radius: number, results: any[] = []): any[] {
    if (!this.root) {
      return results;
    }

    const queryBounds = new BoundingBox();
    queryBounds.min.set(point.x - radius, point.y - radius, point.z - radius);
    queryBounds.max.set(point.x + radius, point.y + radius, point.z + radius);

    this._intersectNode(this.root, queryBounds, results);

    // Filter by actual distance (since we're using AABB approximation)
    return results.filter(obj => {
      const node = this._findNodeByObject(obj);
      return node && this._pointDistanceToBounds(point, node.bounds) <= radius;
    });
  }

  /**
   * Find a node by its associated object.
   * @param obj - Object to find
   * @returns Node containing the object or null
   */
  private _findNodeByObject(obj: any): BVHNode | null {
    for (const node of this._objectMap.values()) {
      if (node.userData === obj) {
        return node;
      }
    }
    return null;
  }

  /**
   * Calculate distance from point to bounding box bounds.
   * @param point - The point
   * @param bounds - Bounding box
   * @returns Distance to bounds
   */
  private _pointDistanceToBounds(point: Vector3, bounds: BoundingBox): number {
    const dx = Math.max(bounds.min.x - point.x, 0, point.x - bounds.max.x);
    const dy = Math.max(bounds.min.y - point.y, 0, point.y - bounds.max.y);
    const dz = Math.max(bounds.min.z - point.z, 0, point.z - bounds.max.z);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * @inheritdoc
   */
  findNearest(point: Vector3, maxDistance: number = Infinity): any {
    if (!this.root) {
      return null;
    }

    let nearestObj: any = null;
    let nearestDistance = maxDistance;

    this._findNearestNode(this.root, point, nearestDistance, (obj, distance) => {
      if (distance < nearestDistance) {
        nearestObj = obj;
        nearestDistance = distance;
      }
    });

    return nearestObj;
  }

  /**
   * Recursively find nearest object.
   * @param node - Current node
   * @param point - Query point
   * @param maxDistance - Maximum distance
   * @param callback - Callback for potential nearest objects
   */
  private _findNearestNode(node: BVHNode, point: Vector3, maxDistance: number, callback: (obj: any, distance: number) => void): void {
    const distance = this._pointDistanceToBounds(point, node.bounds);
    if (distance > maxDistance) {
      return;
    }

    if (node.isLeaf && node.userData !== null) {
      callback(node.userData, distance);
    } else {
      // Test children in order of distance to point
      const leftDistance = node.left ? this._pointDistanceToBounds(point, node.left.bounds) : Infinity;
      const rightDistance = node.right ? this._pointDistanceToBounds(point, node.right.bounds) : Infinity;

      if (leftDistance < rightDistance) {
        if (node.left) this._findNearestNode(node.left, point, maxDistance, callback);
        if (node.right) this._findNearestNode(node.right, point, maxDistance, callback);
      } else {
        if (node.right) this._findNearestNode(node.right, point, maxDistance, callback);
        if (node.left) this._findNearestNode(node.left, point, maxDistance, callback);
      }
    }
  }

  /**
   * @inheritdoc
   */
  rebuild(): void {
    const objects: Array<{ bounds: BoundingBox; userData: any }> = [];

    // Collect all objects
    for (const node of this._objectMap.values()) {
      objects.push({
        bounds: node.bounds.clone(),
        userData: node.userData
      });
    }

    // Clear tree
    this.clear();

    // Rebuild tree
    for (const obj of objects) {
      this.insert(obj.bounds, obj.userData);
    }
  }

  /**
   * @inheritdoc
   */
  optimize(): boolean {
    if (!this.enableSAH || !this.root) {
      return false;
    }

    // Simple optimization: check if tree is unbalanced
    const isBalanced = this.root.isBalanced();
    if (!isBalanced) {
      this.rebuild();
      return true;
    }

    return false;
  }

  /**
   * @inheritdoc
   */
  clear(): void {
    this.root = null;
    this._objectMap.clear();
    this._nextId = 0;
  }

  /**
   * @inheritdoc
   */
  getStats() {
    if (!this.root) {
      return {
        nodeCount: 0,
        leafCount: 0,
        maxDepth: 0,
        averageDepth: 0,
        balanceFactor: 1.0
      };
    }

    const leafNodes: BVHNode[] = [];
    this.root.getLeaves(leafNodes);

    const nodeCount = this.count;
    const leafCount = leafNodes.length;
    const maxDepth = this.root.getMaxDepth();

    let totalDepth = 0;
    for (const leaf of leafNodes) {
      totalDepth += leaf.depth;
    }
    const averageDepth = leafCount > 0 ? totalDepth / leafCount : 0;

    // Balance factor: 1.0 is perfectly balanced, 0.0 is completely unbalanced
    const balanceFactor = this.root.isBalanced() ? 1.0 : 0.5;

    return {
      nodeCount,
      leafCount,
      maxDepth,
      averageDepth,
      balanceFactor
    };
  }
}