import { BVHTree, BVHBuilder, BVHBuildStrategy, AABB, BoundingSphere } from "../src";
import { BoundingBox, Vector3, Ray } from "@galacean/engine-math";

/**
 * Basic tests for BVH functionality.
 * These tests verify the core BVH operations work correctly.
 */
export class BasicBVHTests {
  /**
   * Test basic BVH tree creation and object insertion.
   */
  static testBasicOperations(): boolean {
    console.log("Testing basic BVH operations...");

    try {
      // Create BVH tree
      const bvh = new BVHTree();

      // Test initial state
      if (bvh.count !== 0 || bvh.root !== null) {
        console.error("❌ Initial BVH state is incorrect");
        return false;
      }

      // Insert objects
      const box1 = new BoundingBox(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
      const box2 = new BoundingBox(new Vector3(2, 2, 2), new Vector3(4, 4, 4));

      const id1 = bvh.insert(box1, "test1");
      const id2 = bvh.insert(box2, "test2");

      if (bvh.count !== 2) {
        console.error("❌ BVH count is incorrect after insertion");
        return false;
      }

      if (bvh.root === null) {
        console.error("❌ BVH root is null after insertion");
        return false;
      }

      console.log("✅ Basic operations test passed");
      return true;
    } catch (error) {
      console.error("❌ Basic operations test failed:", error);
      return false;
    }
  }

  /**
   * Test ray casting functionality.
   */
  static testRayCasting(): boolean {
    console.log("Testing ray casting...");

    try {
      const bvh = new BVHTree();

      // Create test objects
      const box = new BoundingBox(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
      bvh.insert(box, "target");

      // Test ray that should hit
      const hitRay = new Ray(new Vector3(-5, 0, 0), new Vector3(1, 0, 0));
      const hitResults = bvh.raycast(hitRay);

      if (hitResults.length !== 1) {
        console.error("❌ Ray casting: Expected 1 hit, got", hitResults.length);
        return false;
      }

      if (hitResults[0].object !== "target") {
        console.error("❌ Ray casting: Wrong object hit");
        return false;
      }

      if (hitResults[0].distance < 0) {
        console.error("❌ Ray casting: Invalid distance");
        return false;
      }

      // Test ray that should miss
      const missRay = new Ray(new Vector3(0, 5, 0), new Vector3(0, 1, 0));
      const missResults = bvh.raycast(missRay);

      if (missResults.length !== 0) {
        console.error("❌ Ray casting: Expected 0 hits for missing ray");
        return false;
      }

      console.log("✅ Ray casting test passed");
      return true;
    } catch (error) {
      console.error("❌ Ray casting test failed:", error);
      return false;
    }
  }

  /**
   * Test spatial queries.
   */
  static testSpatialQueries(): boolean {
    console.log("Testing spatial queries...");

    try {
      const bvh = new BVHTree();

      // Create test objects in a pattern
      const positions = [
        new Vector3(0, 0, 0),
        new Vector3(2, 0, 0),
        new Vector3(5, 0, 0),
        new Vector3(0, 3, 0)
      ];

      positions.forEach((pos, index) => {
        const bounds = new BoundingBox(
          Vector3.subtract(pos, new Vector3(0.5, 0.5, 0.5), new Vector3()),
          Vector3.add(pos, new Vector3(0.5, 0.5, 0.5), new Vector3())
        );
        bvh.insert(bounds, `object${index}`);
      });

      // Test range query
      const queryPoint = new Vector3(0, 0, 0);
      const nearbyObjects = bvh.queryRange(queryPoint, 2.5);

      if (nearbyObjects.length < 2) {
        console.error("❌ Range query: Expected at least 2 objects, got", nearbyObjects.length);
        return false;
      }

      // Test nearest neighbor
      const nearest = bvh.findNearest(new Vector3(4.5, 0, 0));
      if (nearest !== "object2") {
        console.error("❌ Nearest query: Wrong object returned");
        return false;
      }

      console.log("✅ Spatial queries test passed");
      return true;
    } catch (error) {
      console.error("❌ Spatial queries test failed:", error);
      return false;
    }
  }

  /**
   * Test BVH building strategies.
   */
  static testBVHBuilders(): boolean {
    console.log("Testing BVH builders...");

    try {
      // Create test objects
      const objects: Array<{ bounds: BoundingBox; userData: any }> = [];
      for (let i = 0; i < 20; i++) {
        const pos = new Vector3(
          Math.random() * 10 - 5,
          Math.random() * 10 - 5,
          Math.random() * 10 - 5
        );
        const bounds = new BoundingBox(
          Vector3.subtract(pos, new Vector3(0.5, 0.5, 0.5), new Vector3()),
          Vector3.add(pos, new Vector3(0.5, 0.5, 0.5), new Vector3())
        );
        objects.push({ bounds, userData: i });
      }

      // Test each building strategy
      const strategies = [BVHBuildStrategy.SAH, BVHBuildStrategy.Median, BVHBuildStrategy.Equal];

      for (const strategy of strategies) {
        const bvh = BVHBuilder.build(objects, strategy);

        if (bvh.count !== objects.length) {
          console.error(`❌ Builder ${strategy}: Wrong object count`);
          return false;
        }

        if (bvh.root === null) {
          console.error(`❌ Builder ${strategy}: Root is null`);
          return false;
        }

        const stats = bvh.getStats();
        if (stats.nodeCount === 0 || stats.leafCount === 0) {
          console.error(`❌ Builder ${strategy}: Invalid stats`);
          return false;
        }
      }

      console.log("✅ BVH builders test passed");
      return true;
    } catch (error) {
      console.error("❌ BVH builders test failed:", error);
      return false;
    }
  }

  /**
   * Test object removal and updates.
   */
  static testRemovalAndUpdates(): boolean {
    console.log("Testing object removal and updates...");

    try {
      const bvh = new BVHTree();

      // Insert test object
      const originalBounds = new BoundingBox(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
      const id = bvh.insert(originalBounds, "testObject");

      if (bvh.count !== 1) {
        console.error("❌ Removal/Updates: Object not inserted properly");
        return false;
      }

      // Test update
      const newBounds = new BoundingBox(new Vector3(5, 5, 5), new Vector3(7, 7, 7));
      const updateSuccess = bvh.update(id, newBounds);

      if (!updateSuccess) {
        console.error("❌ Removal/Updates: Update failed");
        return false;
      }

      // Verify update worked by ray casting
      const hitRay = new Ray(new Vector3(0, 0, 0), new Vector3(1, 1, 1).normalize());
      const hitResults = bvh.raycast(hitRay);

      if (hitResults.length !== 1) {
        console.error("❌ Removal/Updates: Ray casting after update failed");
        return false;
      }

      // Test removal
      const removeSuccess = bvh.remove(id);

      if (!removeSuccess) {
        console.error("❌ Removal/Updates: Removal failed");
        return false;
      }

      if (bvh.count !== 0) {
        console.error("❌ Removal/Updates: Object count wrong after removal");
        return false;
      }

      if (bvh.root !== null) {
        console.error("❌ Removal/Updates: Root not null after removing all objects");
        return false;
      }

      console.log("✅ Removal and updates test passed");
      return true;
    } catch (error) {
      console.error("❌ Removal and updates test failed:", error);
      return false;
    }
  }

  /**
   * Test bounding volume implementations.
   */
  static testBoundingVolumes(): boolean {
    console.log("Testing bounding volume implementations...");

    try {
      // Test AABB
      const aabb = new AABB(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));

      const testPointInside = new Vector3(0, 0, 0);
      const testPointOutside = new Vector3(2, 2, 2);

      if (!aabb.containsPoint(testPointInside)) {
        console.error("❌ Bounding volumes: AABB point containment test failed");
        return false;
      }

      if (aabb.containsPoint(testPointOutside)) {
        console.error("❌ Bounding volumes: AABB point containment test failed (false positive)");
        return false;
      }

      const surfaceArea = aabb.getSurfaceArea();
      const expectedArea = 24; // 2*(2*2 + 2*2 + 2*2) = 24

      if (Math.abs(surfaceArea - expectedArea) > 0.001) {
        console.error("❌ Bounding volumes: AABB surface area calculation failed");
        return false;
      }

      // Test BoundingSphere
      const sphere = new BoundingSphere(new Vector3(0, 0, 0), 2);

      if (!sphere.containsPoint(new Vector3(1, 1, 1))) {
        console.error("❌ Bounding volumes: Sphere point containment test failed");
        return false;
      }

      if (sphere.containsPoint(new Vector3(3, 0, 0))) {
        console.error("❌ Bounding volumes: Sphere point containment test failed (false positive)");
        return false;
      }

      const sphereArea = sphere.getSurfaceArea();
      const expectedSphereArea = 4 * Math.PI * 4; // 4πr² where r=2

      if (Math.abs(sphereArea - expectedSphereArea) > 0.001) {
        console.error("❌ Bounding volumes: Sphere surface area calculation failed");
        return false;
      }

      console.log("✅ Bounding volumes test passed");
      return true;
    } catch (error) {
      console.error("❌ Bounding volumes test failed:", error);
      return false;
    }
  }

  /**
   * Run all tests.
   */
  static runAll(): boolean {
    console.log("🧪 Running BVH Basic Tests...\n");

    const tests = [
      this.testBasicOperations,
      this.testRayCasting,
      this.testSpatialQueries,
      this.testBVHBuilders,
      this.testRemovalAndUpdates,
      this.testBoundingVolumes
    ];

    let passed = 0;
    let total = tests.length;

    for (const test of tests) {
      if (test()) {
        passed++;
      }
      console.log();
    }

    console.log(`📊 Test Results: ${passed}/${total} tests passed`);

    if (passed === total) {
      console.log("🎉 All tests passed! BVH package is working correctly.");
      return true;
    } else {
      console.log("❌ Some tests failed. Please check the implementation.");
      return false;
    }
  }
}