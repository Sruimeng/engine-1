# Galacean Engine 快速入门

## 安装

### 使用npm
```bash
npm install @galacean/engine
```

### 使用pnpm（推荐）
```bash
pnpm add @galacean/engine
```

### 使用CDN
```html
<script src="https://unpkg.com/@galacean/engine/dist/index.umd.js"></script>
```

## 基础示例

### 1. 创建引擎实例

```typescript
import { WebGLEngine } from "@galacean/engine";

async function main() {
  // 创建canvas元素
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  document.body.appendChild(canvas);

  // 创建引擎实例
  const engine = await WebGLEngine.create({ canvas });

  // 获取默认场景
  const scene = engine.sceneManager.activeScene;

  // 开始运行
  engine.run();
}

main();
```

### 2. 创建基础场景

```typescript
import {
  WebGLEngine,
  Scene,
  Entity,
  Camera,
  MeshRenderer,
  PrimitiveMesh,
  BlinnPhongMaterial,
  Vector3,
  Color
} from "@galacean/engine";

async function createBasicScene() {
  // 创建引擎
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const engine = await WebGLEngine.create({ canvas });
  const scene = engine.sceneManager.activeScene;

  // 创建根实体
  const rootEntity = scene.createRootEntity("root");

  // 创建摄像机
  const cameraEntity = rootEntity.createChild("camera");
  const camera = cameraEntity.addComponent(Camera);
  cameraEntity.transform.position = new Vector3(0, 0, 10);

  // 创建立方体
  const cubeEntity = rootEntity.createChild("cube");
  const renderer = cubeEntity.addComponent(MeshRenderer);

  // 创建网格和材质
  const mesh = PrimitiveMesh.createCuboid(engine, 2, 2, 2);
  const material = new BlinnPhongMaterial(engine);
  material.baseColor = new Color(1, 0, 0, 1); // 红色

  renderer.mesh = mesh;
  renderer.setMaterial(material);

  // 添加旋转动画
  cubeEntity.transform.setRotation(45, 45, 0);

  // 运行引擎
  engine.run();
}
```

### 3. 添加光照

```typescript
import {
  DirectLight,
  AmbientLight,
  Color,
  Vector3
} from "@galacean/engine";

function setupLighting(scene: Scene, rootEntity: Entity) {
  // 环境光
  const ambientLight = rootEntity.addComponent(AmbientLight);
  ambientLight.color = new Color(0.2, 0.2, 0.2);
  ambientLight.intensity = 0.5;

  // 方向光（模拟太阳光）
  const directLightEntity = rootEntity.createChild("direct_light");
  const directLight = directLightEntity.addComponent(DirectLight);
  directLight.color = new Color(1, 1, 1);
  directLight.intensity = 1;
  directLightEntity.transform.rotation = new Vector3(-45, -45, 0);
}
```

### 4. 加载模型

```typescript
import { GLTFResource } from "@galacean/engine-loader";

async function loadModel(engine: WebGLEngine, scene: Scene) {
  // 使用资源管理器加载模型
  const model = await engine.resourceManager.load<GLTFResource>(
    "assets/models/car.glb"
  );

  if (model) {
    const modelEntity = model.defaultSceneRoot;
    scene.addChild(modelEntity);

    // 调整模型位置和缩放
    modelEntity.transform.position = new Vector3(0, 0, 0);
    modelEntity.transform.scale = new Vector3(1, 1, 1);
  }
}
```

### 5. 添加脚本

```typescript
import { Script } from "@galacean/engine";
import { Vector3 } from "@galacean/engine-math";

class RotationScript extends Script {
  private _rotationSpeed: Vector3 = new Vector3(0, 45, 0); // 度/秒

  onUpdate(): void {
    // 每帧更新旋转
    const deltaTime = this.engine.time.deltaTime;
    const rotation = this._rotationSpeed.clone();
    rotation.scale(deltaTime / 1000); // 转换为弧度

    this.entity.transform.rotate(rotation);
  }
}

// 使用脚本
const cubeEntity = rootEntity.createChild("cube");
const rotationScript = cubeEntity.addComponent(RotationScript);
```

## 常用功能

### 材质和纹理

```typescript
// 创建材质
const material = new BlinnPhongMaterial(engine);

// 设置基础颜色
material.baseColor = new Color(0.5, 0.5, 1, 1);

// 设置纹理
const texture = await engine.resourceManager.load<Texture>("assets/textures/diffuse.jpg");
material.baseTexture = texture;

// 设置金属度和粗糙度（PBR材质）
if (material instanceof PBRMaterial) {
  material.metallic = 0.8;
  material.roughness = 0.2;
}
```

### 动画系统

```typescript
import { Animator } from "@galacean/engine";

// 添加动画组件
const animatorEntity = modelEntity.createChild("animator");
const animator = animatorEntity.addComponent(Animator);

// 加载动画剪辑
const animationClip = await engine.resourceManager.load<AnimationClip>(
  "assets/animations/run.anim"
);

animator.addAnimationClip(animationClip, "run");
animator.play("run");
```

### 物理系统

```typescript
import {
  StaticCollider,
  DynamicCollider,
  BoxColliderShape
} from "@galacean/engine-physics-lite";

// 添加静态碰撞体
const groundEntity = rootEntity.createChild("ground");
const groundCollider = groundEntity.addComponent(StaticCollider);
const groundShape = new BoxColliderShape();
groundShape.size = new Vector3(20, 1, 20);
groundCollider.addShape(groundShape);

// 添加动态碰撞体
const boxEntity = rootEntity.createChild("box");
const boxCollider = boxEntity.addComponent(DynamicCollider);
const boxShape = new BoxColliderShape();
boxShape.size = new Vector3(2, 2, 2);
boxCollider.addShape(boxShape);
```

## 性能优化技巧

### 1. 对象池

```typescript
// 使用对象池减少GC压力
class GameObjectPool {
  private static _pool: Entity[] = [];

  static getEntity(scene: Scene): Entity {
    let entity = this._pool.pop();
    if (!entity) {
      entity = scene.createRootEntity();
    }
    return entity;
  }

  static releaseEntity(entity: Entity): void {
    entity.parent = null;
    this._pool.push(entity);
  }
}
```

### 2. 批处理

```typescript
// 合并相同材质的网格
const mergedMesh = MeshMerger.merge([
  mesh1,
  mesh2,
  mesh3
]);
```

### 3. LOD (Level of Detail)

```typescript
import { LODGroup } from "@galacean/engine";

// 创建LOD组
const lodGroup = entity.addComponent(LODGroup);

// 添加不同细节级别
lodGroup.addLODLevel(0, highDetailMesh);    // 0-10米
lodGroup.addLODLevel(10, mediumDetailMesh); // 10-30米
lodGroup.addLODLevel(30, lowDetailMesh);    // 30米以上
```

## 调试技巧

### 1. 开启调试模式

```typescript
const engine = await WebGLEngine.create({
  canvas,
  enableDebug: true
});
```

### 2. 性能监控

```typescript
// 监控帧率
engine.on("frameUpdate", () => {
  const fps = engine.time.frameRate;
  if (fps < 30) {
    console.warn("Low FPS detected:", fps);
  }
});

// 监控绘制调用
engine.on("frameEnd", () => {
  const drawCalls = engine.renderStatistics.drawCalls;
  console.log("Draw calls:", drawCalls);
});
```

### 3. 可视化调试

```typescript
import { DebugTools } from "@galacean/engine";

// 添加调试工具
const debugTools = rootEntity.addComponent(DebugTools);
debugTools.showWireframe = true;
debugTools.showBounds = true;
```

## 常见问题

### Q: 如何处理WebGL上下文丢失？
```typescript
engine.canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  engine.destroy();
});

engine.canvas.addEventListener("webglcontextrestored", async () => {
  await engine.recreate();
});
```

### Q: 如何优化移动端性能？
```typescript
const engine = await WebGLEngine.create({
  canvas,
  pixelRatio: window.devicePixelRatio > 1.5 ? 1.5 : window.devicePixelRatio
});
```

### Q: 如何加载自定义着色器？
```typescript
const shader = await engine.resourceManager.load<Shader>(
  "assets/shaders/custom.shader"
);

const material = new Material(engine, shader);
material.setFloat("u_time", 0);
```

## 下一步

- 查看[API文档](../reference/api/)
- 学习[高级特性](../guides/advanced/)
- 了解[性能优化](../guides/performance/)
- 浏览[示例项目](../examples/)