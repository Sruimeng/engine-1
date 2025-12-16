import { BoundingSphere as MathBoundingSphere, BoundingBox, Vector3, Ray, Matrix } from "@galacean/engine-math";
import { BoundingVolume } from "./BoundingVolume";

/**
 * Spherical bounding volume implementation.
 * Represents a sphere defined by center and radius.
 */
export class BoundingSphere extends BoundingVolume {
  /** Radius of the sphere */
  public radius: number;

  /**
   * Constructor of BoundingSphere.
   * @param center - Center point of the sphere
   * @param radius - Radius of the sphere
   */
  constructor(center: Vector3 = null, radius: number = 0) {
    super(center);
    this.radius = radius;
  }

  /**
   * @inheritdoc
   */
  getBoundingBox(out: BoundingBox): BoundingBox {
    const r = this.radius;
    out.min.set(this.center.x - r, this.center.y - r, this.center.z - r);
    out.max.set(this.center.x + r, this.center.y + r, this.center.z + r);
    return out;
  }

  /**
   * @inheritdoc
   */
  intersects(other: BoundingVolume): boolean {
    if (other instanceof BoundingSphere) {
      const distance = Vector3.distance(this.center, other.center);
      return distance <= (this.radius + other.radius);
    }

    // For AABB and other types, convert to BoundingBox and test
    const otherBounds = new BoundingBox();
    other.getBoundingBox(otherBounds);
    return this.intersectsBoundingBox(otherBounds);
  }

  /**
   * Check if this sphere intersects with a bounding box.
   * @param bounds - The bounding box to test against
   * @returns True if the sphere intersects the box
   */
  private intersectsBoundingBox(bounds: BoundingBox): boolean {
    // Find the closest point on the box to the sphere center
    const closestPoint = new Vector3(
      Math.max(bounds.min.x, Math.min(this.center.x, bounds.max.x)),
      Math.max(bounds.min.y, Math.min(this.center.y, bounds.max.y)),
      Math.max(bounds.min.z, Math.min(this.center.z, bounds.max.z))
    );

    // Check if the closest point is within the sphere
    const distanceSquared = Vector3.distanceSquared(this.center, closestPoint);
    return distanceSquared <= (this.radius * this.radius);
  }

  /**
   * @inheritdoc
   */
  intersectsRay(ray: Ray): boolean {
    const mathSphere = new MathBoundingSphere(this.center.clone(), this.radius);
    return ray.intersectSphere(mathSphere) >= 0;
  }

  /**
   * @inheritdoc
   */
  containsPoint(point: Vector3): boolean {
    const distanceSquared = Vector3.distanceSquared(this.center, point);
    return distanceSquared <= (this.radius * this.radius);
  }

  /**
   * @inheritdoc
   */
  getSurfaceArea(): number {
    return 4.0 * Math.PI * this.radius * this.radius;
  }

  /**
   * @inheritdoc
   */
  getVolume(): number {
    return (4.0 / 3.0) * Math.PI * this.radius * this.radius * this.radius;
  }

  /**
   * @inheritdoc
   */
  merge(other: BoundingVolume, out: BoundingVolume): BoundingSphere {
    if (!(out instanceof BoundingSphere)) {
      out = new BoundingSphere();
    }

    if (other instanceof BoundingSphere) {
      // Calculate the distance between centers
      const centerDistance = Vector3.distance(this.center, other.center);

      // Check if one sphere contains the other
      if (centerDistance + this.radius <= other.radius) {
        out.center.copyFrom(other.center);
        out.radius = other.radius;
        return out;
      }
      if (centerDistance + other.radius <= this.radius) {
        out.center.copyFrom(this.center);
        out.radius = this.radius;
        return out;
      }

      // Calculate the new radius and center
      const newRadius = (centerDistance + this.radius + other.radius) * 0.5;
      const direction = Vector3.subtract(other.center, this.center, new Vector3()).normalize();

      out.center = Vector3.add(this.center, Vector3.scale(direction, newRadius - this.radius, new Vector3()), new Vector3());
      out.radius = newRadius;
    } else {
      // For other types, convert to bounding box and create sphere from box
      const otherBounds = new BoundingBox();
      other.getBoundingBox(otherBounds);

      // Create sphere that encompasses both volumes
      const minPoint = new Vector3();
      const maxPoint = new Vector3();

      minPoint.x = Math.min(this.center.x - this.radius, otherBounds.min.x);
      minPoint.y = Math.min(this.center.y - this.radius, otherBounds.min.y);
      minPoint.z = Math.min(this.center.z - this.radius, otherBounds.min.z);

      maxPoint.x = Math.max(this.center.x + this.radius, otherBounds.max.x);
      maxPoint.y = Math.max(this.center.y + this.radius, otherBounds.max.y);
      maxPoint.z = Math.max(this.center.z + this.radius, otherBounds.max.z);

      // Calculate center and radius from min/max
      Vector3.add(minPoint, maxPoint, out.center);
      Vector3.scale(out.center, 0.5, out.center);

      const extent = new Vector3();
      Vector3.subtract(maxPoint, minPoint, extent);
      out.radius = extent.length() * 0.5;
    }

    return out;
  }

  /**
   * @inheritdoc
   */
  fromPoints(points: Vector3[]): void {
    if (!points || points.length === 0) {
      this.reset();
      return;
    }

    // Calculate center as average of all points
    this.center.set(0, 0, 0);
    for (const point of points) {
      this.center.add(point);
    }
    Vector3.scale(this.center, 1.0 / points.length, this.center);

    // Find maximum distance from center to any point
    let maxDistanceSquared = 0;
    for (const point of points) {
      const distanceSquared = Vector3.distanceSquared(this.center, point);
      if (distanceSquared > maxDistanceSquared) {
        maxDistanceSquared = distanceSquared;
      }
    }

    this.radius = Math.sqrt(maxDistanceSquared);
  }

  /**
   * @inheritdoc
   */
  transform(matrix: Matrix, out: BoundingVolume): BoundingSphere {
    if (!(out instanceof BoundingSphere)) {
      out = new BoundingSphere();
    }

    // Transform center
    Matrix.transformPoint(matrix, this.center, out.center);

    // Transform radius (scale by the maximum scale factor)
    const scaleX = Math.sqrt(matrix.elements[0] * matrix.elements[0] + matrix.elements[1] * matrix.elements[1] + matrix.elements[2] * matrix.elements[2]);
    const scaleY = Math.sqrt(matrix.elements[4] * matrix.elements[4] + matrix.elements[5] * matrix.elements[5] + matrix.elements[6] * matrix.elements[6]);
    const scaleZ = Math.sqrt(matrix.elements[8] * matrix.elements[8] + matrix.elements[9] * matrix.elements[9] + matrix.elements[10] * matrix.elements[10]);

    const maxScale = Math.max(scaleX, scaleY, scaleZ);
    out.radius = this.radius * maxScale;

    return out;
  }

  /**
   * @inheritdoc
   */
  clone(): BoundingSphere {
    return new BoundingSphere(this.center.clone(), this.radius);
  }

  /**
   * @inheritdoc
   */
  isEmpty(): boolean {
    return this.radius <= 0;
  }

  /**
   * @inheritdoc
   */
  reset(): void {
    this.center.set(0, 0, 0);
    this.radius = 0;
  }

  /**
   * Encapsulate a point within this sphere, expanding if necessary.
   * @param point - The point to encapsulate
   */
  encapsulatePoint(point: Vector3): void {
    if (this.isEmpty()) {
      this.center.copyFrom(point);
      this.radius = 0;
      return;
    }

    const distance = Vector3.distance(this.center, point);
    if (distance > this.radius) {
      const newRadius = (distance + this.radius) * 0.5;
      const direction = Vector3.subtract(point, this.center, new Vector3()).normalize();
      this.center.add(Vector3.scale(direction, newRadius - this.radius, new Vector3()));
      this.radius = newRadius;
    }
  }
}