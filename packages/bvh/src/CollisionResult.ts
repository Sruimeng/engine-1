import { Vector3, Vector2 } from "@galacean/engine-math";

/**
 * Represents the result of a collision detection operation.
 * Contains information about the intersection point, distance, and involved objects.
 */
export class CollisionResult {
  /** The object that was hit */
  public object: any;

  /** Distance from the ray origin to the intersection point */
  public distance: number;

  /** World space position where the intersection occurred */
  public point: Vector3;

  /** Normal vector at the intersection point (if available) */
  public normal: Vector3 | null;

  /** UV coordinates at the intersection point (if available) */
  public uv: Vector2 | null;

  /** The BVH node that contains the hit object */
  public node: any;

  /**
   * Constructor of CollisionResult.
   * @param object - The hit object
   * @param distance - Distance to intersection
   * @param point - Intersection point
   * @param normal - Surface normal at intersection (optional)
   * @param uv - UV coordinates at intersection (optional)
   */
  constructor(
    object: any = null,
    distance: number = 0,
    point: Vector3 = null,
    normal: Vector3 = null,
    uv: Vector2 = null
  ) {
    this.object = object;
    this.distance = distance;
    this.point = point || new Vector3();
    this.normal = normal;
    this.uv = uv;
    this.node = null;
  }

  /**
   * Reset this collision result to default values.
   */
  public reset(): void {
    this.object = null;
    this.distance = 0;
    this.point.set(0, 0, 0);
    this.normal = null;
    this.uv = null;
    this.node = null;
  }

  /**
   * Copy values from another collision result.
   * @param other - The collision result to copy from
   */
  public copyFrom(other: CollisionResult): void {
    this.object = other.object;
    this.distance = other.distance;
    this.point.copyFrom(other.point);
    this.normal = other.normal ? this.normal.copyFrom(other.normal) : null;
    this.uv = other.uv ? this.uv.copyFrom(other.uv) : null;
    this.node = other.node;
  }

  /**
   * Create a clone of this collision result.
   * @returns A new collision result with the same values
   */
  public clone(): CollisionResult {
    return new CollisionResult(
      this.object,
      this.distance,
      this.point.clone(),
      this.normal ? this.normal.clone() : null,
      this.uv ? this.uv.clone() : null
    );
  }

  /**
   * Check if this collision result represents a valid hit.
   * @returns True if there was a valid collision
   */
  public isValid(): boolean {
    return this.object !== null && this.distance >= 0;
  }
}