import { BVHTree, BVHBuilder, BVHBuildStrategy, AABB, BoundingSphere } from "../src";
import { BoundingBox, Vector3, Ray } from "@galacean/engine-math";

/**
 * Basic usage examples for the BVH package.
 */
export class BasicUsage {
  /**
   * Example 1: Creating a simple BVH tree and adding objects.
   */
  static example1(): void {
    console.log("=== BVH Basic Usage Example 1 ===");

    // Create a new BVH tree
    const bvh = new BVHTree();

    // Create some bounding boxes for objects
    const box1 = new BoundingBox(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
    const box2 = new BoundingBox(new Vector3(2, 2, 2), new Vector3(4, 4, 4));
    const box3 = new BoundingBox(new Vector3(-3, -3, -3), new Vector3(-1, -1, -1));

    // Insert objects into the BVH
    const id1 = bvh.insert(box1, { name: "Object1", type: "enemy" });
    const id2 = bvh.insert(box2, { name: "Object2", type: "player" });
    const id3 = bvh.insert(box3, { name: "Object3", type: "powerup" });

    console.log(`Inserted ${bvh.count} objects into BVH`);

    // Get tree statistics
    const stats = bvh.getStats();
    console.log("Tree statistics:", stats);
  }

  /**
   * Example 2: Ray casting against BVH.
   */
  static example2(): void {
    console.log("=== BVH Ray Casting Example ===");

    const bvh = new BVHTree();

    // Create some objects
    const objects = [
      { bounds: new BoundingBox(new Vector3(-2, -2, -2), new Vector3(0, 0, 0)), userData: "Box A" },
      { bounds: new BoundingBox(new Vector3(1, 1, 1), new Vector3(3, 3, 3)), userData: "Box B" },
      { bounds: new BoundingBox(new Vector3(-1, -1, 5), new Vector3(1, 1, 7)), userData: "Box C" }
    ];

    for (const obj of objects) {
      bvh.insert(obj.bounds, obj.userData);
    }

    // Cast rays and find intersections
    const rays = [
      new Ray(new Vector3(-5, 0, 0), new Vector3(1, 0, 0)), // Should hit Box A
      new Ray(new Vector3(0, 0, 0), new Vector3(1, 1, 1)),  // Should hit Box B
      new Ray(new Vector3(0, 0, 4), new Vector3(0, 0, 1))   // Should hit Box C
    ];

    for (let i = 0; i < rays.length; i++) {
      const results = bvh.raycast(rays[i]);
      console.log(`Ray ${i + 1} hit ${results.length} objects:`);
      for (const result of results) {
        console.log(`  - ${result.object} at distance ${result.distance.toFixed(2)}`);
      }
    }
  }

  /**
   * Example 3: Spatial queries.
   */
  static example3(): void {
    console.log("=== BVH Spatial Queries Example ===");

    const bvh = new BVHTree();

    // Create a grid of objects
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        const bounds = new BoundingBox(
          new Vector3(x - 0.4, -0.5, z - 0.4),
          new Vector3(x + 0.4, 0.5, z + 0.4)
        );
        bvh.insert(bounds, { id: `${x},${z}`, position: { x, z } });
      }
    }

    console.log(`Created grid with ${bvh.count} objects`);

    // Query objects in range
    const queryPoint = new Vector3(0, 0, 0);
    const queryRadius = 2.0;
    const nearbyObjects = bvh.queryRange(queryPoint, queryRadius);

    console.log(`Found ${nearbyObjects.length} objects within radius ${queryRadius} of origin:`);
    for (const obj of nearbyObjects) {
      console.log(`  - Object ${obj.id} at position (${obj.position.x}, ${obj.position.z})`);
    }

    // Find nearest object
    const nearest = bvh.findNearest(new Vector3(1.2, 0, 1.2));
    console.log(`Nearest object to (1.2, 0, 1.2): ${nearest ? nearest.id : "none"}`);
  }

  /**
   * Example 4: Using different bounding volume types.
   */
  static example4(): void {
    console.log("=== BVH Different Bounding Volumes Example ===");

    const bvh = new BVHTree();

    // Create AABB objects
    const aabb1 = new AABB(new Vector3(-2, -2, -2), new Vector3(0, 0, 0));
    const aabb2 = new AABB(new Vector3(1, 1, 1), new Vector3(3, 3, 3));

    // Create BoundingSphere objects
    const sphere1 = new BoundingSphere(new Vector3(0, 0, 2), 1.5);
    const sphere2 = new BoundingSphere(new Vector3(-3, 0, -3), 1.0);

    // Convert to BoundingBox for BVH insertion
    const sphere1Bounds = new BoundingBox();
    const sphere2Bounds = new BoundingBox();
    sphere1.getBoundingBox(sphere1Bounds);
    sphere2.getBoundingBox(sphere2Bounds);

    bvh.insert(new BoundingBox(aabb1.min, aabb1.max), aabb1);
    bvh.insert(new BoundingBox(aabb2.min, aabb2.max), aabb2);
    bvh.insert(sphere1Bounds, sphere1);
    bvh.insert(sphere2Bounds, sphere2);

    console.log(`BVH contains ${bvh.count} objects with different bounding volume types`);

    // Test intersections
    const testRay = new Ray(new Vector3(-5, -5, -5), new Vector3(1, 1, 1));
    const hits = bvh.raycast(testRay);

    console.log(`Ray hits ${hits.length} objects:`);
    for (const hit of hits) {
      if (hit.object instanceof AABB) {
        console.log(`  - AABB at (${hit.object.min.x}, ${hit.object.min.y}, ${hit.object.min.z})`);
      } else if (hit.object instanceof BoundingSphere) {
        console.log(`  - Sphere with center (${hit.object.center.x}, ${hit.object.center.y}, ${hit.object.center.z}) and radius ${hit.object.radius}`);
      }
    }
  }

  /**
   * Example 5: Building BVH with different strategies.
   */
  static example5(): void {
    console.log("=== BVH Building Strategies Example ===");

    // Create many objects
    const objects: Array<{ bounds: BoundingBox; userData: any }> = [];
    for (let i = 0; i < 100; i++) {
      const position = new Vector3(
        Math.random() * 20 - 10,
        Math.random() * 20 - 10,
        Math.random() * 20 - 10
      );
      const size = Math.random() * 2 + 0.5;
      const bounds = new BoundingBox(
        Vector3.subtract(position, new Vector3(size, size, size), new Vector3()),
        Vector3.add(position, new Vector3(size, size, size), new Vector3())
      );
      objects.push({ bounds, userData: `Object${i}` });
    }

    // Build BVH with different strategies
    const strategies = [BVHBuildStrategy.SAH, BVHBuildStrategy.Median, BVHBuildStrategy.Equal];

    for (const strategy of strategies) {
      console.log(`\nBuilding BVH with ${BVHBuildStrategy[strategy]} strategy:`);
      const bvh = BVHBuilder.build(objects, strategy);
      const stats = bvh.getStats();
      console.log(`  Nodes: ${stats.nodeCount}, Leaves: ${stats.leafCount}`);
      console.log(`  Max depth: ${stats.maxDepth}, Avg depth: ${stats.averageDepth.toFixed(2)}`);
      console.log(`  Balance factor: ${stats.balanceFactor.toFixed(2)}`);
    }
  }

  /**
   * Run all examples.
   */
  static runAll(): void {
    this.example1();
    console.log();
    this.example2();
    console.log();
    this.example3();
    console.log();
    this.example4();
    console.log();
    this.example5();
  }
}