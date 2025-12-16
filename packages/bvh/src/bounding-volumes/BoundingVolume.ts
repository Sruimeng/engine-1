import { BoundingBox, Vector3, Ray } from "@galacean/engine-math";
import { IClone } from "@galacean/engine-math";

/**
 * Abstract base class for all bounding volume types.
 * Provides common interface for different bounding volume implementations.
 */
export abstract class BoundingVolume implements IClone<BoundingVolume> {
  /** The center point of the bounding volume */
  public center: Vector3;

  /**
   * Constructor of BoundingVolume.
   * @param center - Center point of the bounding volume
   */
  constructor(center: Vector3 = null) {
    this.center = center || new Vector3();
  }

  /**
   * Get the axis-aligned bounding box that contains this bounding volume.
   * @param out - The output bounding box
   * @returns The axis-aligned bounding box
   */
  abstract getBoundingBox(out: BoundingBox): BoundingBox;

  /**
   * Check if this bounding volume intersects with another bounding volume.
   * @param other - The other bounding volume to test against
   * @returns True if the volumes intersect
   */
  abstract intersects(other: BoundingVolume): boolean;

  /**
   * Check if this bounding volume intersects with a ray.
   * @param ray - The ray to test against
   * @returns True if the ray intersects this volume
   */
  abstract intersectsRay(ray: Ray): boolean;

  /**
   * Check if a point is inside this bounding volume.
   * @param point - The point to test
   * @returns True if the point is inside this volume
   */
  abstract containsPoint(point: Vector3): boolean;

  /**
   * Get the surface area of this bounding volume.
   * Used for SAH (Surface Area Heuristic) calculations.
   * @returns The surface area
   */
  abstract getSurfaceArea(): number;

  /**
   * Get the volume of this bounding volume.
   * @returns The volume
   */
  abstract getVolume(): number;

  /**
   * Merge this bounding volume with another to create a containing volume.
   * @param other - The other bounding volume to merge with
   * @param out - The output merged bounding volume
   * @returns The merged bounding volume
   */
  abstract merge(other: BoundingVolume, out: BoundingVolume): BoundingVolume;

  /**
   * Update this bounding volume based on a set of points.
   * @param points - Array of points to enclose
   */
  abstract fromPoints(points: Vector3[]): void;

  /**
   * Transform this bounding volume by a matrix.
   * @param matrix - The transformation matrix
   * @param out - The output transformed bounding volume
   * @returns The transformed bounding volume
   */
  abstract transform(matrix: import("@galacean/engine-math").Matrix, out: BoundingVolume): BoundingVolume;

  /**
   * Clone this bounding volume.
   * @returns A new bounding volume with the same properties
   */
  abstract clone(): BoundingVolume;

  /**
   * Check if this bounding volume is empty (has no size).
   * @returns True if the volume is empty
   */
  abstract isEmpty(): boolean;

  /**
   * Reset this bounding volume to an empty state.
   */
  abstract reset(): void;
}