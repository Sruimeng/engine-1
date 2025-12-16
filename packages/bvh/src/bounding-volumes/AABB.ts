import { BoundingBox, Vector3, Ray, Matrix } from "@galacean/engine-math";
import { BoundingVolume } from "./BoundingVolume";

/**
 * Axis-Aligned Bounding Box (AABB) implementation.
 * Represents a rectangular box aligned with world axes.
 */
export class AABB extends BoundingVolume {
  /** Minimum corner of the box */
  public min: Vector3;

  /** Maximum corner of the box */
  public max: Vector3;

  /**
   * Constructor of AABB.
   * @param min - Minimum corner (optional)
   * @param max - Maximum corner (optional)
   */
  constructor(min: Vector3 = null, max: Vector3 = null) {
    super();
    this.min = min || new Vector3();
    this.max = max || new Vector3();

    // Update center based on min/max
    if (min && max) {
      Vector3.add(this.min, this.max, this.center);
      Vector3.scale(this.center, 0.5, this.center);
    }
  }

  /**
   * @inheritdoc
   */
  getBoundingBox(out: BoundingBox): BoundingBox {
    out.min.copyFrom(this.min);
    out.max.copyFrom(this.max);
    return out;
  }

  /**
   * @inheritdoc
   */
  intersects(other: BoundingVolume): boolean {
    if (other instanceof AABB) {
      return this.intersectsAABB(other);
    }
    // For other types, convert to BoundingBox and test
    const otherBounds = new BoundingBox();
    other.getBoundingBox(otherBounds);
    return this.intersectsBoundingBox(otherBounds);
  }

  /**
   * Check if this AABB intersects with another AABB.
   * @param other - The other AABB to test against
   * @returns True if the AABBs intersect
   */
  intersectsAABB(other: AABB): boolean {
    return !(this.min.x > other.max.x || this.max.x < other.min.x ||
             this.min.y > other.max.y || this.max.y < other.min.y ||
             this.min.z > other.max.z || this.max.z < other.min.z);
  }

  /**
   * Check if this AABB intersects with a BoundingBox.
   * @param bounds - The BoundingBox to test against
   * @returns True if the boxes intersect
   */
  private intersectsBoundingBox(bounds: BoundingBox): boolean {
    return !(this.min.x > bounds.max.x || this.max.x < bounds.min.x ||
             this.min.y > bounds.max.y || this.max.y < bounds.min.y ||
             this.min.z > bounds.max.z || this.max.z < bounds.min.z);
  }

  /**
   * @inheritdoc
   */
  intersectsRay(ray: Ray): boolean {
    return ray.intersectBox(new BoundingBox(this.min.clone(), this.max.clone())) >= 0;
  }

  /**
   * @inheritdoc
   */
  containsPoint(point: Vector3): boolean {
    return point.x >= this.min.x && point.x <= this.max.x &&
           point.y >= this.min.y && point.y <= this.max.y &&
           point.z >= this.min.z && point.z <= this.max.z;
  }

  /**
   * @inheritdoc
   */
  getSurfaceArea(): number {
    const dx = this.max.x - this.min.x;
    const dy = this.max.y - this.min.y;
    const dz = this.max.z - this.min.z;
    return 2.0 * (dx * dy + dx * dz + dy * dz);
  }

  /**
   * @inheritdoc
   */
  getVolume(): number {
    const dx = this.max.x - this.min.x;
    const dy = this.max.y - this.min.y;
    const dz = this.max.z - this.min.z;
    return dx * dy * dz;
  }

  /**
   * @inheritdoc
   */
  merge(other: BoundingVolume, out: BoundingVolume): AABB {
    if (!(out instanceof AABB)) {
      out = new AABB();
    }

    if (other instanceof AABB) {
      Vector3.min(this.min, other.min, out.min);
      Vector3.max(this.max, other.max, out.max);
    } else {
      const otherBounds = new BoundingBox();
      other.getBoundingBox(otherBounds);
      Vector3.min(this.min, otherBounds.min, out.min);
      Vector3.max(this.max, otherBounds.max, out.max);
    }

    // Update center
    Vector3.add(out.min, out.max, out.center);
    Vector3.scale(out.center, 0.5, out.center);

    return out as AABB;
  }

  /**
   * @inheritdoc
   */
  fromPoints(points: Vector3[]): void {
    if (!points || points.length === 0) {
      this.reset();
      return;
    }

    // Initialize to first point
    this.min.copyFrom(points[0]);
    this.max.copyFrom(points[0]);

    // Expand to include all points
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      Vector3.min(this.min, point, this.min);
      Vector3.max(this.max, point, this.max);
    }

    // Update center
    Vector3.add(this.min, this.max, this.center);
    Vector3.scale(this.center, 0.5, this.center);
  }

  /**
   * @inheritdoc
   */
  transform(matrix: Matrix, out: BoundingVolume): AABB {
    if (!(out instanceof AABB)) {
      out = new AABB();
    }

    // Get the 8 corners of this AABB
    const corners = this.getCorners();

    // Transform all corners
    const transformedCorners: Vector3[] = [];
    for (const corner of corners) {
      const transformed = new Vector3();
      Matrix.transformPoint(matrix, corner, transformed);
      transformedCorners.push(transformed);
    }

    // Create new AABB from transformed corners
    out.fromPoints(transformedCorners);

    return out as AABB;
  }

  /**
   * Get the 8 corners of this AABB.
   * @returns Array of 8 corner points
   */
  private getCorners(): Vector3[] {
    return [
      new Vector3(this.min.x, this.min.y, this.min.z),
      new Vector3(this.max.x, this.min.y, this.min.z),
      new Vector3(this.min.x, this.max.y, this.min.z),
      new Vector3(this.max.x, this.max.y, this.min.z),
      new Vector3(this.min.x, this.min.y, this.max.z),
      new Vector3(this.max.x, this.min.y, this.max.z),
      new Vector3(this.min.x, this.max.y, this.max.z),
      new Vector3(this.max.x, this.max.y, this.max.z)
    ];
  }

  /**
   * @inheritdoc
   */
  clone(): AABB {
    return new AABB(this.min.clone(), this.max.clone());
  }

  /**
   * @inheritdoc
   */
  isEmpty(): boolean {
    return this.min.x >= this.max.x || this.min.y >= this.max.y || this.min.z >= this.max.z;
  }

  /**
   * @inheritdoc
   */
  reset(): void {
    this.min.set(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    this.max.set(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
    this.center.set(0, 0, 0);
  }

  /**
   * Get the extent (half-size) of this AABB.
   * @param out - Output vector for the extent
   * @returns The extent vector
   */
  getExtent(out: Vector3): Vector3 {
    return Vector3.subtract(this.max, this.min, out).scale(0.5);
  }

  /**
   * Expand this AABB by a given amount.
   * @param amount - Amount to expand on all sides
   */
  expand(amount: number): void {
    this.min.x -= amount;
    this.min.y -= amount;
    this.min.z -= amount;
    this.max.x += amount;
    this.max.y += amount;
    this.max.z += amount;

    // Update center
    Vector3.add(this.min, this.max, this.center);
    Vector3.scale(this.center, 0.5, this.center);
  }
}