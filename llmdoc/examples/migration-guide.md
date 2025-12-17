---
id: "examples-migration-guide"
type: "reference"
title: "Galacean Engine 版本迁移指南"
description: "提供 Galacean Engine 不同版本之间的迁移指导，包括API变更、自动迁移工具和最佳实践，帮助开发者平滑升级项目"
tags: ["examples", "migration", "version-control", "api-changes", "tools"]
context_dependency: ["architecture-overview"]
related_ids: ["common-patterns", "troubleshooting", "anti-patterns"]
---

本文档提供 Galacean Engine 不同版本之间的迁移指导，帮助开发者平滑升级项目。

## 版本兼容性矩阵

| 源版本 | 目标版本 | 兼容性 | 需要修改 |
|--------|----------|--------|-----------|
| 1.5.x | 1.6.x | ⚠️ 大部分兼容 | 少量API调整 |
| 1.4.x | 1.6.x | ❌ 不兼容 | 较多修改 |
| 1.3.x | 1.6.x | ❌ 不兼容 | 大量修改 |

## 1.5.x → 1.6.x 迁移指南

### 1. 材质系统更新

**API变更**:
```typescript
// ❌ 1.5.x 写法
material.setVector3("mainColor", new Vector3(1, 0, 0));
material.setFloat("metallic", 0.5);
material.setTexture("baseMap", texture);

// ✅ 1.6.x 写法
material.shaderData.setVector3("mainColor", new Vector3(1, 0, 0));
material.shaderData.setFloat("metallic", 0.5);
material.shaderData.setTexture("baseMap", texture);
```

**迁移脚本**:
```typescript
// 自动迁移材质设置
function migrateMaterialSettings(material: Material): void {
  // 获取所有shader属性
  const shader = material.shader;
  const properties = shader.getProperties();

  properties.forEach(property => {
    const value = material.getProperty(property.name);
    if (value !== undefined) {
      // 迁移到新的shaderData
      material.shaderData.setProperty(property.name, value);
    }
  });
}

// 批量迁移
function migrateAllMaterials(scene: Scene): void {
  const materials = scene.findComponents(Material);
  materials.forEach(migrateMaterialSettings);
}
```

### 2. 组件生命周期变更

**API变更**:
```typescript
// ❌ 1.5.x 写法
class MyComponent extends Component {
  onAwake(): void {
    // 初始化代码
  }
}

// ✅ 1.6.x 写法
class MyComponent extends Component {
  onStart(): void {
    // 初始化代码（替代onAwake）
  }
}
```

### 3. 事件系统更新

```typescript
// ❌ 1.5.x 写法
entity.on("eventName", callback);

// ✅ 1.6.x 写法
entity.addEventListener("eventName", callback);

// 或者使用新的事件管理器
engine.eventManager.addEventListener("eventName", callback);
```

### 4. 纹理加载变更

```typescript
// ❌ 1.5.x 写法
const texture = await engine.resourceManager.load<Texture2D>("texture.jpg");

// ✅ 1.6.x 写法（支持更多格式和选项）
const texture = await engine.resourceManager.load<Texture2D>("texture.jpg", {
  flipY: false,
  generateMipmaps: true,
  format: TextureFormat.RGBA8
});
```

## 1.4.x → 1.6.x 迁移指南

### 1. 组件系统重构

**重大变更**: 1.6.x 引入了新的ECS架构，需要重构组件代码。

```typescript
// ❌ 1.4.x 写法
class CustomRenderer extends Component {
  private _mesh: Mesh;
  private _material: Material;

  onEnable(): void {
    // 添加到渲染系统
    this.entity.scene.renderSystem.addRenderer(this);
  }

  render(): void {
    // 渲染逻辑
  }
}

// ✅ 1.6.x 写法
class CustomRenderer extends Component {
  @serializable
  private _mesh: Mesh;

  @serializable
  private _material: Material;

  private _meshRenderer: MeshRenderer;

  onStart(): void {
    // 使用标准渲染器
    this._meshRenderer = this.entity.addComponent(MeshRenderer);
    const meshFilter = this.entity.addComponent(MeshFilter);

    meshFilter.mesh = this._mesh;
    this._meshRenderer.material = this._material;
    this._meshRenderer.onRender = this.onRender.bind(this);
  }

  private onRender(): void {
    // 自定义渲染逻辑
  }
}
```

### 2. 物理系统迁移

```typescript
// ❌ 1.4.x 写法
const rigidBody = entity.addComponent(RigidBody);
rigidBody.mass = 10;
rigidBody.velocity = new Vector3(0, 5, 0);

// ✅ 1.6.x 写法（使用物理配置）
const rigidBody = entity.addComponent(RigidBody);
const physicsConfig = new PhysicsConfig();
physicsConfig.mass = 10;
physicsConfig.linearVelocity = new Vector3(0, 5, 0);
rigidBody.setConfig(physicsConfig);
```

### 3. 着色器系统更新

```typescript
// ❌ 1.4.x 写法
const shader = new Shader(engine, vertexShaderSource, fragmentShaderSource);

// ✅ 1.6.x 写法（使用ShaderLab）
const shader = Shader.find("PBR"); // 使用预定义着色器

// 或者创建自定义着色器
const customShader = new Shader(engine, {
  vertex: vertexShaderSource,
  fragment: fragmentShaderSource,
  attributes: ["position", "normal", "uv"],
  uniforms: {
    "worldMatrix": "mat4",
    "viewMatrix": "mat4",
    "projectionMatrix": "mat4",
    "mainTexture": "sampler2D"
  }
});
```

## 自动迁移工具

### TypeScript 代码迁移器

```typescript
import * as ts from 'typescript';
import * as fs from 'fs';

class CodeMigrator {
  private sourceVersion: string;
  private targetVersion: string;

  constructor(sourceVersion: string, targetVersion: string) {
    this.sourceVersion = sourceVersion;
    this.targetVersion = targetVersion;
  }

  migrateFile(filePath: string): void {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest
    );

    const transformer = this.createTransformer();
    const result = ts.transform(sourceFile, [transformer]);

    const printer = ts.createPrinter();
    const transformedCode = printer.printFile(result.transformed[0]);

    fs.writeFileSync(filePath, transformedCode);
    console.log(`Migrated: ${filePath}`);
  }

  private createTransformer(): ts.TransformerFactory<ts.SourceFile> {
    return context => {
      const visit: ts.Visitor = node => {
        // 处理属性访问
        if (ts.isPropertyAccessExpression(node)) {
          if (this.needsMigration(node)) {
            return this.migratePropertyAccess(node);
          }
        }

        // 处理方法调用
        if (ts.isCallExpression(node)) {
          if (this.needsMethodMigration(node)) {
            return this.migrateMethodCall(node);
          }
        }

        return ts.visitEachChild(node, visit, context);
      };

      return sourceFile => ts.visitNode(sourceFile, visit);
    };
  }

  private needsMigration(node: ts.PropertyAccessExpression): boolean {
    const migrations = {
      "material.setVector": "material.shaderData.setVector3",
      "material.setFloat": "material.shaderData.setFloat",
      "material.setTexture": "material.shaderData.setTexture",
      "entity.on": "entity.addEventListener"
    };

    const accessText = node.expression.getText() + "." + node.name.getText();
    return Object.keys(migrations).includes(accessText);
  }

  private migratePropertyAccess(node: ts.PropertyAccessExpression): ts.PropertyAccessExpression {
    // 实现具体的属性迁移逻辑
    return node; // 简化示例
  }

  private needsMethodMigration(node: ts.CallExpression): boolean {
    // 检查方法调用是否需要迁移
    return false;
  }

  private migrateMethodCall(node: ts.CallExpression): ts.CallExpression {
    // 实现方法调用迁移逻辑
    return node;
  }
}

// 使用示例
const migrator = new CodeMigrator("1.5.0", "1.6.0");

// 迁移单个文件
migrator.migrateFile("src/components/MyComponent.ts");

// 批量迁移
const files = glob.sync("src/**/*.ts");
files.forEach(file => migrator.migrateFile(file));
```

### 配置文件迁移

```typescript
// 场景配置迁移
function migrateSceneConfig(config15x: any): any {
  const config16x = {
    version: "1.6.0",
    entities: []
  };

  // 迁移实体
  config15x.entities.forEach(entity15 => {
    const entity16 = {
      name: entity15.name,
      components: []
    };

    // 迁移组件
    entity15.components.forEach(comp15 => {
      const comp16 = migrateComponent(comp15);
      if (comp16) {
        entity16.components.push(comp16);
      }
    });

    config16x.entities.push(entity16);
  });

  return config16x;
}

function migrateComponent(component15: any): any | null {
  switch (component15.type) {
    case "MeshRenderer":
      return {
        type: "MeshRenderer",
        properties: {
          material: migrateMaterial(component15.properties.material),
          castShadows: component15.properties.castShadows,
          receiveShadows: component15.properties.receiveShadows
        }
      };

    case "RigidBody":
      return {
        type: "RigidBody",
        properties: migratePhysicsProperties(component15.properties)
      };

    case "CustomComponent":
      // 移除不再支持的组件
      console.warn(`Component ${component15.type} is no longer supported in 1.6.x`);
      return null;

    default:
      return component15;
  }
}

function migrateMaterial(material15: any): any {
  if (material15.version.startsWith("1.5")) {
    return {
      version: "1.6.0",
      shader: material15.shader,
      shaderData: migrateShaderData(material15.properties)
    };
  }
  return material15;
}
```

## 迁移检查清单

### 迁移前准备

- [ ] 备份项目代码和资源
- [ ] 记录当前功能和性能基准
- [ ] 列出使用的第三方插件
- [ ] 检查自定义着色器兼容性

### 代码迁移

- [ ] 更新组件生命周期方法
- [ ] 迁移材质属性设置
- [ ] 更新事件系统调用
- [ ] 修改物理系统配置
- [ ] 更新着色器代码

### 资源迁移

- [ ] 检查纹理格式兼容性
- [ ] 更新模型导入设置
- [ ] 迁移材质配置
- [ ] 检查动画数据

### 测试验证

- [ ] 单元测试通过
- [ ] 功能测试验证
- [ ] 性能基准对比
- [ ] 兼容性测试

### 常见迁移问题及解决方案

#### 1. 材质显示异常

```typescript
// 1.6.x 中材质属性访问方式改变
function fixMaterialProperties(material: Material): void {
  // 检查并修复shaderData
  if (!material.shaderData) {
    material.shaderData = new ShaderData();
  }

  // 确保必要的属性存在
  if (!material.shaderData.hasProperty("mainTexture")) {
    material.shaderData.setTexture("mainTexture", getFallbackTexture());
  }
}
```

#### 2. 动画系统兼容性

```typescript
// 1.6.x 的动画系统重构
function migrateAnimationSystem(clip: AnimationClip): AnimationClip {
  // 迁移动画曲线
  clip.curves.forEach(curve => {
    if (curve.propertyPath.includes("material.")) {
      // 更新材质属性路径
      curve.propertyPath = curve.propertyPath.replace(
        "material.",
        "material.shaderData."
      );
    }
  });

  return clip;
}
```

#### 3. 网格数据格式

```typescript
// 1.6.x 支持更多网格格式
function migrateMeshFormat(mesh: ModelMesh): void {
  // 检查并更新网格属性
  if (mesh.vertexBufferFormat === "legacy") {
    // 转换为新的顶点格式
    const newBuffer = convertVertexBufferFormat(
      mesh.vertexBuffer,
      "newFormat"
    );
    mesh.setVertexBuffer(newBuffer);
  }
}
```

## 最佳实践

### 1. 渐进式迁移

```typescript
// 分阶段迁移策略
class MigrationPlanner {
  private phases: MigrationPhase[] = [
    new APIUpdatePhase(),
    new ComponentSystemPhase(),
    new RenderSystemPhase(),
    new PhysicsSystemPhase()
  ];

  async executeMigration(): Promise<void> {
    for (const phase of this.phases) {
      console.log(`Starting phase: ${phase.name}`);

      try {
        await phase.execute();
        console.log(`Completed phase: ${phase.name}`);
      } catch (error) {
        console.error(`Failed phase: ${phase.name}`, error);
        // 回滚或修复
        await phase.rollback();
        throw error;
      }
    }
  }
}
```

### 2. 版本兼容层

```typescript
// 创建兼容层，支持旧API在版本中工作
namespace CompatibilityLayer {
  export function setMaterialProperty(
    material: Material,
    name: string,
    value: any
  ): void {
    if (material.shaderData) {
      // 1.6.x API
      material.shaderData.setProperty(name, value);
    } else {
      // 1.5.x API
      material.setProperty(name, value);
    }
  }
}

// 使用兼容层
CompatibilityLayer.setMaterialProperty(material, "mainColor", color);
```

### 3. 测试驱动的迁移

```typescript
// 为迁移编写测试
describe("Migration from 1.5 to 1.6", () => {
  let scene15x: Scene;
  let scene16x: Scene;

  beforeEach(async () => {
    // 加载1.5.x的场景
    scene15x = await loadScene("scenes/legacy_15x.json");

    // 迁移到1.6.x
    scene16x = migrateScene(scene15x);
  });

  test("Material properties are correctly migrated", () => {
    const materials = scene16x.findComponents(Material);
    materials.forEach(material => {
      expect(material.shaderData).toBeDefined();
      expect(material.shaderData.getProperty("mainColor")).toBeDefined();
    });
  });

  test("Animation clips are correctly migrated", () => {
    const animators = scene16x.findComponents(Animator);
    animators.forEach(animator => {
      const clips = animator.clips;
      clips.forEach(clip => {
        clip.curves.forEach(curve => {
          expect(curve.propertyPath).not.toContain("material.");
        });
      });
    });
  });
});
```

## 总结

版本迁移需要：

1. **充分准备**: 备份代码、了解变更、制定计划
2. **分步实施**: 使用迁移工具、分阶段迁移
3. **测试验证**: 功能测试、性能对比、兼容性检查
4. **文档更新**: 更新项目文档、迁移记录

记住：**迁移后需要充分测试**，确保所有功能正常工作后再发布。建议在迁移过程中使用版本控制，保留每一步的变更记录。

## ⚠️ 禁止事项

### 关键约束
- 🚫 **直接覆盖源代码**: 始终备份项目后再进行迁移操作
- 🚫 **跳过测试**: 每个迁移步骤后都必须进行完整测试
- 🚫 **一次性大范围修改**: 应该采用分阶段、逐步迁移的策略
- 🚫 **忽视性能回归**: 迁移后必须进行性能基准测试

### 常见错误
- ❌ 没有备份就直接开始迁移
- ❌ 忽略API破坏性变更，导致运行时错误
- ❌ 一次性升级跨多个大版本
- ❌ 不更新依赖库版本导致兼容性问题
- ❌ 忽略自定义着色器和插件的兼容性

### 最佳实践提醒
- ✅ 迁移前创建完整的项目备份
- ✅ 使用版本控制系统记录每一步变更
- ✅ 先在小模块中测试迁移方案
- ✅ 建立回滚计划，随时准备撤销变更
- ✅ 保持文档更新，记录遇到的问题和解决方案