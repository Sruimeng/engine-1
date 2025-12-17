/**
 * @title BVH 光线投射演示
 * @category BVH
 * @thumbnail https://mdn.alipayobjects.com/merchant_appfe/afts/img/A*omVHSr3cHpIAAAAAAAAAAAAADiR2AQ/original
 */

import {
  AmbientLight,
  AssetType,
  BackgroundMode,
  BoundingBox,
  Camera,
  DirectLight,
  Entity,
  GLTFResource,
  Logger,
  MeshRenderer,
  PBRMaterial,
  PrimitiveMesh,
  Ray as MathRay,
  Scene,
  SkyBoxMaterial,
  Vector3,
  Vector2,
  WebGLEngine,
  Color,
  Script
} from "@galacean/engine";
import { LineDrawer, OrbitControl } from "@galacean/engine-toolkit";
import { BVHTree, BVHBuilder, BVHBuildStrategy, Ray, CollisionResult } from "@galacean/engine-bvh";
import * as dat from "dat.gui";

Logger.enable();

const envList = {
  sunset: "https://gw.alipayobjects.com/os/bmw-prod/89c54544-1184-45a1-b0f5-c0b17e5c3e68.bin"
};

interface BVHStats {
  buildTime: number;
  queryTime: number;
  nodeCount: number;
  leafCount: number;
  objectCount: number;
  raycastHits: number;
}

class BVHDemo {
  // Engine & Scene
  engine: WebGLEngine;
  scene: Scene;
  skyMaterial: SkyBoxMaterial;

  // Entities
  rootEntity: Entity;
  cameraEntity: Entity;
  gltfRootEntity: Entity;
  lightEntity: Entity;
  bvhIndicatorEntity: Entity; // 显示射线/碰撞点
  lineDrawerEntity: Entity; // LineDrawer 实体

  // Components
  camera: Camera;
  controler: OrbitControl;
  light: DirectLight;
  lineDrawer: LineDrawer; // LineDrawer 组件

  // BVH
  bvh: BVHTree = null;
  bvhStats: BVHStats = {
    buildTime: 0,
    queryTime: 0,
    nodeCount: 0,
    leafCount: 0,
    objectCount: 0,
    raycastHits: 0
  };

  // GUI
  gui = new dat.GUI();
  guiState = {
    modelUrl: "fox",
    buildStrategy: "SAH",
    showBVH: false,
    showRay: true,
    showBounds: false,
    showNormals: true,
    boundsDepth: 3,
    rayLength: 50,
    autoUpdate: false,
    maxLeafSize: 8,
    raycastCount: 0,
    buildBVH: () => this.buildBVH(),
    clearBVH: () => this.clearBVH(),
    raycast: () => this.testRaycast()
  };

  // Model list (same as gltf-loader)
  modelList = {
    fox: "https://gw.alipayobjects.com/os/bmw-prod/f40ef8dd-4c94-41d4-8fac-c1d2301b6e47.glb",
    duck: "https://gw.alipayobjects.com/os/bmw-prod/6cb8f543-285c-491a-8cfd-57a1160dc9ab.glb",
    helmet: "https://gw.alipayobjects.com/os/bmw-prod/a1da72a4-023e-4bb1-9629-0f4b0f6b6fc4.glb",
    boomBox: "https://gw.alipayobjects.com/os/bmw-prod/2e98b1c0-18e8-45d0-b54e-dcad6ef05e22.glb",
    avocado: "https://gw.alipayobjects.com/os/bmw-prod/0f978c4d-1cd6-4cec-9a4c-b58c8186e063.glb"
  };

  constructor() {
    WebGLEngine.create({ canvas: "canvas" }).then((engine) => {
      this.engine = engine;
      this.scene = this.engine.sceneManager.activeScene;
      this.skyMaterial = new SkyBoxMaterial(this.engine);

      // 创建根实体
      this.rootEntity = this.scene.createRootEntity("root");
      this.cameraEntity = this.rootEntity.createChild("camera");
      this.gltfRootEntity = this.rootEntity.createChild("gltf");
      this.lightEntity = this.rootEntity.createChild("direct_light");
      this.bvhIndicatorEntity = this.rootEntity.createChild("bvh_indicator");

      // 创建 LineDrawer 实体
      this.lineDrawerEntity = this.rootEntity.createChild("line_drawer");
      const lineRenderer = this.lineDrawerEntity.addComponent(MeshRenderer);
      // @ts-ignore - LineDrawer 组件类型兼容
      this.lineDrawer = this.lineDrawerEntity.addComponent(LineDrawer);
      console.log("✅ LineDrawer 组件已创建:", this.lineDrawer);
      console.log("✅ LineDrawer MeshRenderer:", lineRenderer);

      // 组件
      this.camera = this.cameraEntity.addComponent(Camera);
      // @ts-ignore - OrbitControl 组件类型兼容
      this.controler = this.cameraEntity.addComponent(OrbitControl);
      this.light = this.lightEntity.addComponent(DirectLight);

      // 加载环境
      this.loadEnv().then(() => {
        this.initScene();
        this.initGUI();
        this.loadDefaultModel();
      });
    });
  }

  loadEnv() {
    return new Promise((resolve) => {
      this.engine.resourceManager
        .load<AmbientLight>({
          type: AssetType.Env,
          url: envList.sunset
        })
        .then((env) => {
          this.scene.ambientLight = env;
          this.skyMaterial.texture = env.specularTexture;
          this.skyMaterial.textureDecodeRGBM = true;
          resolve(true);
        });
    });
  }

  initScene() {
    this.engine.canvas.resizeByClientSize();
    this.controler.minDistance = 0;
    this.controler.maxDistance = 100;

    // 灯光设置
    // @ts-ignore - intensity 属性在 Light 基类上存在
    this.light.intensity = 1.5;
    this.lightEntity.transform.setRotation(45, 45, 0);

    // 背景
    this.scene.background.mode = BackgroundMode.Sky;
    this.scene.background.sky.material = this.skyMaterial;
    this.scene.background.sky.mesh = PrimitiveMesh.createCuboid(this.engine, 1, 1, 1);

    // 鼠标点击事件 - 光线投射
    // 使用原生 DOM 事件来处理点击
    const canvas = this.engine.canvas._webCanvas as HTMLCanvasElement;
    canvas.addEventListener("click", (event: MouseEvent) => {
      if (this.bvh) {
        this.performRaycastFromCamera(event.offsetX, event.offsetY);
      } else {
        console.log("⚠️ BVH 尚未构建，请先点击 '构建 BVH' 按钮");
      }
    });

    // 注册每帧更新回调，用于绘制 LineDrawer 内容
    // 关键：LineDrawer.drawLine 必须在 LineDrawer 的 onLateUpdate 之前调用
    // 使用 Script 组件来确保正确的执行时序
    const demo = this;

    // 创建一个绘制脚本，在 onUpdate 阶段调用绘制方法
    class DrawScript extends Script {
      private _demo: BVHDemo;

      constructor(entity: Entity) {
        super(entity);
        this._demo = demo;
      }

      override onUpdate(deltaTime: number): void {
        this._demo.drawDebugVisualization();
      }
    }

    // 将绘制脚本添加到 lineDrawerEntity 上
    this.lineDrawerEntity.addComponent(DrawScript);

    this.engine.run();
  }

  loadDefaultModel() {
    this.loadModel(this.modelList[this.guiState.modelUrl]);
  }

  loadModel(url: string) {
    // 清理旧模型
    if (this.gltfRootEntity) {
      this.gltfRootEntity.destroy();
    }
    this.gltfRootEntity = this.rootEntity.createChild("gltf");

    this.engine.resourceManager
      .load<GLTFResource>({
        type: AssetType.GLTF,
        url
      })
      .then((asset) => {
        const defaultSceneRoot = asset.instantiateSceneRoot();
        this.gltfRootEntity = defaultSceneRoot;
        this.rootEntity.addChild(defaultSceneRoot);

        // 自动调整相机位置
        this.centerCameraOnModel();

        console.log("✅ 模型加载完成，点击 '构建 BVH' 开始");
      })
      .catch((e) => {
        console.error("模型加载失败:", e);
      });
  }

  centerCameraOnModel() {
    const renderers: MeshRenderer[] = [];
    this.gltfRootEntity.getComponentsIncludeChildren(MeshRenderer, renderers);

    if (renderers.length === 0) return;

    const bounds = new BoundingBox();
    bounds.min.set(Infinity, Infinity, Infinity);
    bounds.max.set(-Infinity, -Infinity, -Infinity);

    renderers.forEach((renderer) => {
      const rb = renderer.bounds;
      bounds.min.x = Math.min(bounds.min.x, rb.min.x);
      bounds.min.y = Math.min(bounds.min.y, rb.min.y);
      bounds.min.z = Math.min(bounds.min.z, rb.min.z);
      bounds.max.x = Math.max(bounds.max.x, rb.max.x);
      bounds.max.y = Math.max(bounds.max.y, rb.max.y);
      bounds.max.z = Math.max(bounds.max.z, rb.max.z);
    });

    const center = new Vector3();
    bounds.getCenter(center);

    const extent = new Vector3();
    bounds.getExtent(extent);
    const size = extent.length();

    // 设置控制器目标和相机位置
    this.controler.target.copyFrom(center);
    this.cameraEntity.transform.setPosition(center.x, center.y + size * 0.5, size * 3);
    this.camera.farClipPlane = size * 20;
    this.camera.nearClipPlane = size * 0.01;
    this.controler.maxDistance = size * 10;
  }

  // ==================== BVH 核心功能 ====================

  buildBVH() {
    if (!this.gltfRootEntity) {
      console.warn("请先加载模型");
      return;
    }

    console.time("BVH构建");
    const startTime = performance.now();

    // 1. 收集所有可渲染对象
    const renderers: MeshRenderer[] = [];
    this.gltfRootEntity.getComponentsIncludeChildren(MeshRenderer, renderers);

    if (renderers.length === 0) {
      console.warn("模型中没有可渲染对象");
      return;
    }

    console.log(`📦 收集到 ${renderers.length} 个可渲染对象`);

    // 2. 准备 BVH 对象数组
    const objects = renderers.map((renderer, index) => {
      return {
        bounds: renderer.bounds.clone(),
        userData: {
          id: index,
          renderer: renderer,
          name: renderer.entity.name
        }
      };
    });

    // 3. 选择构建策略
    let strategy: BVHBuildStrategy;
    switch (this.guiState.buildStrategy) {
      case "SAH":
        strategy = BVHBuildStrategy.SAH;
        break;
      case "Median":
        strategy = BVHBuildStrategy.Median;
        break;
      case "Equal":
        strategy = BVHBuildStrategy.Equal;
        break;
    }

    // 4. 构建 BVH
    const bvh = BVHBuilder.build(objects, strategy);
    this.bvh = bvh;

    // 5. 统计信息
    const stats = bvh.getStats();
    const buildTime = performance.now() - startTime;
    console.timeEnd("BVH构建");

    this.bvhStats = {
      buildTime: buildTime,
      queryTime: 0,
      nodeCount: stats.nodeCount,
      leafCount: stats.leafCount,
      objectCount: stats.objectCount,
      raycastHits: 0
    };

    // 6. 更新 GUI 显示
    this.updateStatsDisplay();

    console.log(`✅ BVH 构建完成`);
    console.log(`   - 构建时间: ${buildTime.toFixed(2)}ms`);
    console.log(`   - 节点数: ${stats.nodeCount}`);
    console.log(`   - 叶子数: ${stats.leafCount}`);
    console.log(`   - 对象数: ${stats.objectCount}`);

    // 7. 显示性能提升倍数
    const acceleration = this.bvhStats.objectCount / Math.max(1, this.bvhStats.leafCount);
    console.log(`   - 预计加速比: ~${acceleration.toFixed(1)}x`);
  }

  clearBVH() {
    if (this.bvh) {
      this.bvh.clear();
      this.bvh = null;
      this.bvhStats = {
        buildTime: 0,
        queryTime: 0,
        nodeCount: 0,
        leafCount: 0,
        objectCount: 0,
        raycastHits: 0
      };
      this.updateStatsDisplay();
      this.clearIndicators();
      console.log("✅ BVH 已清空");
    }
  }

  performRaycastFromCamera(x: number, y: number) {
    if (!this.bvh) return;

    const startTime = performance.now();

    // 从相机创建射线
    const screenPoint = new Vector2(x, y);
    const ray = this.camera.screenPointToRay(screenPoint, new MathRay());

    // 转换为 BVH 射线
    const bvhRay = new Ray(
      new Vector3(ray.origin.x, ray.origin.y, ray.origin.z),
      new Vector3(ray.direction.x, ray.direction.y, ray.direction.z)
    );

    // 执行光线投射
    const results = this.bvh.raycast(bvhRay, 1000); // 最大距离 1000

    const queryTime = performance.now() - startTime;

    // 更新统计
    this.bvhStats.queryTime = queryTime;
    this.bvhStats.raycastHits = results.length;

    // 可视化
    this.visualizeRaycast(ray, results);

    // 更新 GUI
    this.updateStatsDisplay();

    // 控制台输出
    if (results.length > 0) {
      console.log(`🎯 命中 ${results.length} 个对象 (查询时间: ${queryTime.toFixed(2)}ms)`);
      results.slice(0, 5).forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.object.name} (距离: ${result.distance.toFixed(2)})`);
      });
    } else {
      console.log(`❌ 未命中任何对象 (查询时间: ${queryTime.toFixed(2)}ms)`);
    }
  }

  testRaycast() {
    if (!this.bvh) {
      console.warn("请先构建 BVH");
      return;
    }

    // 随机创建 10 条射线进行测试
    const center = this.controler.target.clone();
    const tests = 10;
    let totalTime = 0;
    let totalHits = 0;

    for (let i = 0; i < tests; i++) {
      const direction = new Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      direction.normalize();

      const ray = new Ray(center.clone(), direction);
      const startTime = performance.now();
      const results = this.bvh.raycast(ray, 100);
      totalTime += performance.now() - startTime;
      totalHits += results.length;
    }

    console.log(`📊 ${tests} 条随机射线测试:`);
    console.log(`   平均查询时间: ${(totalTime / tests).toFixed(2)}ms`);
    console.log(`   总命中数: ${totalHits}`);
  }

  // ==================== 可视化 ====================

  // 存储需要绘制的可视化数据
  private _rayVisualization: { start: Vector3; end: Vector3; color: Color } | null = null;
  private _hitPoints: { point: Vector3; normal: Vector3 | null; isFirst: boolean }[] = [];
  private _bvhBoxes: { bounds: BoundingBox; color: Color }[] = [];

  /**
   * 使用 LineDrawer 绘制线段（注意：LineDrawer 不支持单独颜色参数）
   */
  drawLineWithLineDrawer(start: Vector3, end: Vector3) {
    LineDrawer.drawLine(start, end);
  }

  /**
   * 使用 LineDrawer 绘制线框包围盒
   */
  drawWireframeBoxWithLineDrawer(bounds: BoundingBox) {
    const center = new Vector3();
    bounds.getCenter(center);
    const extent = new Vector3();
    bounds.getExtent(extent);
    // drawCuboid 使用的是半尺寸，所以 extent 就是正确的值
    LineDrawer.drawCuboid(extent.x * 2, extent.y * 2, extent.z * 2, center);
  }

  /**
   * 根据深度获取颜色（用于 BVH 层级可视化）
   */
  getDepthColor(depth: number, maxDepth: number): Color {
    const t = depth / Math.max(1, maxDepth);
    // 从红色 -> 黄色 -> 绿色 -> 蓝色
    const color = new Color();
    if (t < 0.33) {
      color.set(1, t * 3, 0, 1);
    } else if (t < 0.66) {
      color.set(1 - (t - 0.33) * 3, 1, 0, 1);
    } else {
      color.set(0, 1 - (t - 0.66) * 3, (t - 0.66) * 3, 1);
    }
    return color;
  }

  /**
   * 收集 BVH 包围盒数据用于可视化
   */
  collectBVHBoundsData() {
    this._bvhBoxes = [];

    if (!this.bvh || !this.bvh.root) {
      return;
    }

    const maxDepth = this.guiState.boundsDepth;
    const stats = this.bvh.getStats();
    const treeMaxDepth = stats.maxDepth;


    // 遍历 BVH 树
    const traverseNode = (node: any, depth: number) => {
      if (!node || depth > maxDepth) return;


      // 获取深度对应的颜色
      const color = this.getDepthColor(depth, treeMaxDepth);

      // 添加到数组
      this._bvhBoxes.push({ bounds: node.bounds, color });

      // 递归子节点
      if (!node.isLeaf) {
        if (node.left) traverseNode(node.left, depth + 1);
        if (node.right) traverseNode(node.right, depth + 1);
      }
    };

    traverseNode(this.bvh.root, 0);
    console.log(`📦 收集到 ${this._bvhBoxes.length} 个 BVH 包围盒`);
  }

  visualizeRaycast(mathRay: MathRay, results: CollisionResult[]) {
    // 清除旧的碰撞点实体
    this.clearIndicators();

    // 重置可视化数据
    this._hitPoints = [];

    // 1. 保存射线数据
    if (this.guiState.showRay) {
      const rayLength = this.guiState.rayLength;
      const endPoint = new Vector3();
      Vector3.scale(mathRay.direction, rayLength, endPoint);
      Vector3.add(mathRay.origin, endPoint, endPoint);

      // 克隆 origin 和 direction
      const startClone = new Vector3();
      startClone.copyFrom(mathRay.origin);

      this._rayVisualization = {
        start: startClone,
        end: endPoint,
        color: new Color(0, 0.5, 1, 1)
      };

      console.log("📍 射线可视化数据:", {
        start: this._rayVisualization.start,
        end: this._rayVisualization.end
      });
    } else {
      this._rayVisualization = null;
    }

    // 2. 收集碰撞点数据并创建碰撞点标记实体
    if (results.length > 0) {
      results.slice(0, 10).forEach((result, index) => {
        if (result.point) {
          this._hitPoints.push({
            point: result.point.clone(),
            normal: result.normal ? result.normal.clone() : null,
            isFirst: index === 0
          });

          // 创建碰撞点标记（小球）
          const sphereSize = index === 0 ? 0.04 : 0.025;
          const sphere = PrimitiveMesh.createSphere(this.engine, sphereSize, 12);
          const entity = this.bvhIndicatorEntity.createChild(`hit_${index}`);
          entity.transform.setPosition(result.point.x, result.point.y, result.point.z);
          const renderer = entity.addComponent(MeshRenderer);
          renderer.mesh = sphere;

          const mat = new PBRMaterial(this.engine);
          if (index === 0) {
            mat.baseColor.set(1, 0, 0, 1);
            mat.emissiveColor.set(0.5, 0, 0, 1);
          } else {
            mat.baseColor.set(1, 0.5, 0, 1);
          }
          mat.roughness = 0.3;
          renderer.setMaterial(mat);
        }
      });
    }

    // 3. 收集 BVH 包围盒数据
    if (this.guiState.showBounds) {
      this.collectBVHBoundsData();
    } else {
      this._bvhBoxes = [];
    }
  }

  /**
   * 每帧绘制 LineDrawer 内容（需要在 onUpdate 中调用）
   */
  drawDebugVisualization() {
    // 设置默认颜色为青色（射线颜色）
    if (this.lineDrawer) {
      this.lineDrawer.color = new Color(0, 0.8, 1, 1);
    }

    // 测试绘制一条固定的线段，验证 LineDrawer 是否正常工作
    // 使用模型中心附近的坐标
    const center = this.controler?.target || new Vector3(0, 0, 0);
    const testStart = new Vector3(center.x, center.y, center.z);
    const testEnd = new Vector3(center.x + 2, center.y + 2, center.z + 2);
    LineDrawer.drawLine(testStart, testEnd);

    // 同时绘制一个立方体
    LineDrawer.drawCuboid(1, 1, 1, center);

    // 绘制射线
    if (this._rayVisualization && this.guiState.showRay) {
      // 创建新的 Vector3 对象来确保数据正确
      const rayStart = new Vector3(
        this._rayVisualization.start.x,
        this._rayVisualization.start.y,
        this._rayVisualization.start.z
      );
      const rayEnd = new Vector3(
        this._rayVisualization.end.x,
        this._rayVisualization.end.y,
        this._rayVisualization.end.z
      );

      console.log("🖊️ 绘制射线:", rayStart, "->", rayEnd);
      LineDrawer.drawLine(rayStart, rayEnd);

      // 如果有碰撞点，绘制到第一个碰撞点的线段
      if (this._hitPoints.length > 0) {
        const firstHit = this._hitPoints[0];
        const hitPoint = new Vector3(firstHit.point.x, firstHit.point.y, firstHit.point.z);
        LineDrawer.drawLine(rayStart, hitPoint);
      }
    }

    // 绘制法线
    if (this.guiState.showNormals) {
      this._hitPoints.forEach((hit) => {
        if (hit.normal) {
          const normalLength = hit.isFirst ? 0.15 : 0.08;
          const normalEnd = new Vector3();
          Vector3.scale(hit.normal, normalLength, normalEnd);
          Vector3.add(hit.point, normalEnd, normalEnd);
          LineDrawer.drawLine(hit.point, normalEnd);
        }
      });
    }

    // 绘制 BVH 包围盒
    if (this.guiState.showBounds) {
      this._bvhBoxes.forEach((box) => {
        this.drawWireframeBoxWithLineDrawer(box.bounds);
      });
    }
  }

  clearIndicators() {
    // 清除旧的指示器实体
    const children = this.bvhIndicatorEntity.children.slice();
    children.forEach((child) => child.destroy());
  }

  /**
   * 可视化 BVH 包围盒（收集数据用于 LineDrawer 绘制）
   */
  visualizeBVHBounds() {
    this.collectBVHBoundsData();
  }

  /**
   * 清除 BVH 包围盒可视化数据
   */
  clearBoundsVisualization() {
    this._bvhBoxes = [];
  }

  // ==================== GUI ====================

  initGUI() {
    // 模型加载
    const modelFolder = this.gui.addFolder("模型加载");
    modelFolder
      .add(this.guiState, "modelUrl", Object.keys(this.modelList))
      .name("选择模型")
      .onChange((v) => {
        this.loadModel(this.modelList[v]);
        this.clearBVH();
      });
    modelFolder.open();

    // BVH 配置
    const bvhConfigFolder = this.gui.addFolder("BVH 配置");
    bvhConfigFolder.add(this.guiState, "buildStrategy", ["SAH", "Median", "Equal"]).name("构建策略");
    bvhConfigFolder
      .add(this.guiState, "maxLeafSize", 4, 16, 1)
      .name("叶子大小")
      .onChange((v) => {
        if (this.bvh) {
          this.bvh.maxLeafSize = v;
        }
      });
    bvhConfigFolder.open();

    // BVH 操作
    const bvhActionFolder = this.gui.addFolder("BVH 操作");
    bvhActionFolder.add(this.guiState, "buildBVH").name("🔨 构建 BVH");
    bvhActionFolder.add(this.guiState, "clearBVH").name("🗑️ 清空 BVH");
    bvhActionFolder.add(this.guiState, "raycast").name("🎲 随机测试");
    bvhActionFolder.open();

    // 交互和显示
    const interactFolder = this.gui.addFolder("🎨 可视化控制");
    interactFolder
      .add(this.guiState, "showRay")
      .name("显示射线")
      .onChange(() => {
        if (!this.guiState.showRay) {
          this.clearIndicators();
        }
      });
    interactFolder.add(this.guiState, "rayLength", 5, 100, 1).name("射线长度");
    interactFolder
      .add(this.guiState, "showBounds")
      .name("显示 BVH 包围盒")
      .onChange(() => {
        if (this.guiState.showBounds) {
          this.visualizeBVHBounds();
        } else {
          this.clearBoundsVisualization();
        }
      });
    interactFolder
      .add(this.guiState, "boundsDepth", 0, 10, 1)
      .name("包围盒层级深度")
      .onChange(() => {
        if (this.guiState.showBounds) {
          this.visualizeBVHBounds();
        }
      });
    interactFolder.add(this.guiState, "showNormals").name("显示碰撞法线");
    interactFolder.add(this.guiState, "autoUpdate").name("自动测试");
    interactFolder.add(this.guiState, "raycastCount").name("点击命中数").listen();
    interactFolder.open();

    // 性能统计显示
    this.statsFolder = this.gui.addFolder("📊 性能统计");
    this.updateStatsDisplay();
    this.statsFolder.open();
  }

  statsFolder: dat.GUI;

  updateStatsDisplay() {
    if (!this.statsFolder) return;

    // 清除旧的子项
    const controllers = this.statsFolder.__controllers.slice();
    controllers.forEach((c) => this.statsFolder.remove(c));

    // 添加新的统计项
    this.statsFolder.add(this.bvhStats, "buildTime").name("构建时间(ms)").listen();
    this.statsFolder.add(this.bvhStats, "queryTime").name("查询时间(ms)").listen();
    this.statsFolder.add(this.bvhStats, "nodeCount").name("节点数").listen();
    this.statsFolder.add(this.bvhStats, "leafCount").name("叶子数").listen();
    this.statsFolder.add(this.bvhStats, "objectCount").name("对象数").listen();
    this.statsFolder.add(this.bvhStats, "raycastHits").name("击中数").listen();

    // 计算加速比
    if (this.bvhStats.objectCount > 0 && this.bvhStats.leafCount > 0) {
      const accel = (this.bvhStats.objectCount / this.bvhStats.leafCount).toFixed(1) + "x";
      const dummy = { accel: accel };
      this.statsFolder.add(dummy, "accel").name("预计加速比");
    }
  }

  // 每帧更新（如果启用自动更新）
  update() {
    if (this.guiState.autoUpdate && this.bvh) {
      // 每隔一段时间重新测试性能
      if (Math.random() < 0.01) {
        this.testRaycast();
      }
    }
  }
}

// 启动应用
new BVHDemo();
