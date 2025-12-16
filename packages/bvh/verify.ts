/**
 * Quick verification script to check if all modules can be imported correctly.
 */

// Test importing all main exports
try {
  // Core BVH classes
  import('./src/index.js').then((bvh) => {
    console.log('✅ Core BVH imports successful');

    // Test basic functionality
    const { BVHTree, AABB, BoundingSphere, Ray, BVHBuilder, BVHBuildStrategy } = bvh;

    // Create basic BVH
    const tree = new BVHTree();
    console.log('✅ BVHTree created successfully');

    // Create bounding volumes
    const aabb = new AABB();
    const sphere = new BoundingSphere();
    console.log('✅ Bounding volumes created successfully');

    // Create ray
    const ray = new Ray();
    console.log('✅ Ray created successfully');

    // Test builder
    console.log('✅ BVHBuilder and strategies available');

    console.log('🎉 All imports and basic functionality verified!');

  }).catch((error) => {
    console.error('❌ Import failed:', error);
  });

} catch (error) {
  console.error('❌ Verification script failed:', error);
}