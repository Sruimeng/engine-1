import { Ray as MathRay, BoundingBox, BoundingSphere, Plane, Vector3 } from "@galacean/engine-math";

/**
 * Extended Ray class with additional BVH-specific functionality.
 * Builds upon the core engine Ray class.
 */
export class Ray extends MathRay {
  /**
   * Constructor of Ray.
   * @param origin - The origin vector
   * @param direction - The direction vector
   */
  constructor(origin: Vector3 = null, direction: Vector3 = null) {
    super(origin, direction);
  }

  /**
   * Get the closest point on this ray to another point.
   * @param point - The point to find the closest point to
   * @param out - The output closest point on the ray
   * @returns The closest point on the ray
   */
  getClosestPoint(point: Vector3, out: Vector3): Vector3 {
    const v = Vector3.subtract(point, this.origin, new Vector3());
    const t = Vector3.dot(v, this.direction);
    return this.getPoint(t, out);
  }

  /**
   * Calculate the squared distance from a point to this ray.
   * @param point - The point to calculate distance to
   * @returns The squared distance
   */
  distanceSquaredToPoint(point: Vector3): number {
    const closestPoint = new Vector3();
    this.getClosestPoint(point, closestPoint);
    return Vector3.distanceSquared(point, closestPoint);
  }

  /**
   * Calculate the distance from a point to this ray.
   * @param point - The point to calculate distance to
   * @returns The distance
   */
  distanceToPoint(point: Vector3): number {
    return Math.sqrt(this.distanceSquaredToPoint(point));
  }

  /**
   * Check if this ray intersects with an oriented bounding box.
   * @param center - Center of the OBB
   * @param halfExtents - Half extents of the OBB
   * @param rotation - Rotation matrix of the OBB
   * @returns The distance to intersection, -1 if no intersection
   */
  intersectOBB(center: Vector3, halfExtents: Vector3, rotation: import("@galacean/engine-math").Matrix): number {
    // Transform ray to OBB's local space
    const invRotation = new import("@galacean/engine-math").Matrix();
    rotation.invert(invRotation);

    const localOrigin = new Vector3();
    const localDirection = new Vector3();

    invRotation.transformPoint(this.origin, localOrigin);
    invRotation.transformNormal(this.direction, localDirection);

    // Create local ray
    const localRay = new Ray(localOrigin, localDirection);

    // Calculate local bounds
    const localMin = Vector3.subtract(center, halfExtents, new Vector3());
    const localMax = Vector3.add(center, halfExtents, new Vector3());

    // Test intersection in local space
    return localRay.intersectBox(new BoundingBox(localMin, localMax));
  }

  /**
   * Get multiple intersection points with a bounding box.
   * Useful for cases where ray starts inside or passes through the box.
   * @param box - The bounding box to test
   * @param entryPoint - Output for entry intersection point
   * @param exitPoint - Output for exit intersection point
   * @returns True if ray intersects the box
   */
  intersectBoxPoints(box: BoundingBox, entryPoint: Vector3, exitPoint: Vector3): boolean {
    const t1 = new Array(3).fill(0);
    const t2 = new Array(3).fill(0);

    // Calculate intersection distances for each axis
    for (let i = 0; i < 3; i++) {
      const origin = this.origin.getByIndex(i);
      const direction = this.direction.getByIndex(i);
      const min = box.min.getByIndex(i);
      const max = box.max.getByIndex(i);

      if (Math.abs(direction) < 1e-6) {
        // Ray is parallel to this axis
        if (origin < min || origin > max) {
          return false; // No intersection
        }
        t1[i] = -Infinity;
        t2[i] = Infinity;
      } else {
        t1[i] = (min - origin) / direction;
        t2[i] = (max - origin) / direction;
      }
    }

    // Find entry and exit distances
    let tNear = Math.max(t1[0], t1[1], t1[2]);
    let tFar = Math.min(t2[0], t2[1], t2[2]);

    // Check if intersection is valid
    if (tNear > tFar || tFar < 0) {
      return false;
    }

    // Clamp entry point to positive distance
    tNear = Math.max(0, tNear);

    // Calculate intersection points
    this.getPoint(tNear, entryPoint);
    this.getPoint(tFar, exitPoint);

    return true;
  }

  /**
   * Check if this ray intersects with a capsule.
   * @param start - Start point of capsule
   * @param end - End point of capsule
   * @param radius - Radius of capsule
   * @returns The distance to intersection, -1 if no intersection
   */
  intersectCapsule(start: Vector3, end: Vector3, radius: number): number {
    // Simplified capsule intersection: treat as cylinder with hemispherical ends
    const capsuleAxis = Vector3.subtract(end, start, new Vector3());
    const capsuleLength = capsuleAxis.length();

    if (capsuleLength < 1e-6) {
      // Capsule is just a sphere
      const sphere = new BoundingSphere(start, radius);
      return this.intersectSphere(sphere);
    }

    capsuleAxis.normalize();

    // Calculate closest points between ray and capsule axis
    const rayToCapsule = Vector3.subtract(start, this.origin, new Vector3());
    const a = Vector3.dot(this.direction, this.direction);
    const b = Vector3.dot(this.direction, rayToCapsule);
    const c = Vector3.dot(rayToCapsule, rayToCapsule);
    const d = Vector3.dot(this.direction, capsuleAxis);
    const e = Vector3.dot(rayToCapsule, capsuleAxis);

    const denominator = a - d * d;
    let t: number;
    let s: number;

    if (Math.abs(denominator) < 1e-6) {
      // Ray is parallel to capsule axis
      t = 0;
      s = e;
    } else {
      t = (d * e - b) / denominator;
      s = (e - d * t) / 1.0; // capsule axis is normalized
    }

    // Clamp t to ray range
    t = Math.max(0, t);

    // Clamp s to capsule segment
    s = Math.max(0, Math.min(capsuleLength, s));

    // Calculate closest points
    const rayPoint = new Vector3();
    this.getPoint(t, rayPoint);

    const capsulePoint = new Vector3();
    Vector3.scale(capsuleAxis, s, capsulePoint);
    Vector3.add(start, capsulePoint, capsulePoint);

    // Check distance between closest points
    const distance = Vector3.distance(rayPoint, capsulePoint);
    if (distance <= radius) {
      return t;
    }

    return -1;
  }

  /**
   * Transform this ray by a matrix.
   * @param matrix - The transformation matrix
   * @param out - The output transformed ray
   * @returns The transformed ray
   */
  transform(matrix: import("@galacean/engine-math").Matrix, out: Ray): Ray {
    const transformedOrigin = new Vector3();
    const transformedDirection = new Vector3();

    matrix.transformPoint(this.origin, transformedOrigin);
    matrix.transformNormal(this.direction, transformedDirection);
    transformedDirection.normalize();

    if (!out) {
      out = new Ray();
    }

    out.origin.copyFrom(transformedOrigin);
    out.direction.copyFrom(transformedDirection);

    return out;
  }

  /**
   * Clone this ray.
   * @returns A new ray with the same properties
   */
  clone(): Ray {
    return new Ray(this.origin.clone(), this.direction.clone());
  }
}