# Galacean Engine 测试规范

本文档定义了 Galacean Engine 的测试标准、策略和最佳实践。

## 测试框架

### 单元测试
- **框架**: Vitest 2.1.3
- **断言库**: expect API (内置)
- **模拟**: vi.fn(), vi.mock()
- **覆盖率**: @vitest/coverage-v8

### E2E测试
- **框架**: Playwright 1.53.1
- **浏览器**: Chromium (主要)
- **视觉回归**: odiff-bin 图像比较

## 测试类型

### 1. 单元测试
测试独立的函数、类和模块。

**文件结构**:
```
tests/src/
├── math/
│   ├── Matrix.test.ts
│   ├── Vector3.test.ts
│   └── Quaternion.test.ts
├── core/
│   ├── Transform.test.ts
│   ├── Entity.test.ts
│   └── Component.test.ts
└── ...
```

**基本结构**:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { ClassName } from "@galacean/engine";

describe("ClassName", () => {
  let instance: ClassName;

  beforeEach(() => {
    // 每个测试前的初始化
    instance = new ClassName();
  });

  it("should do something", () => {
    // 测试逻辑
    expect(result).toBe(expected);
  });
});
```

### 2. 集成测试
测试多个组件的协作。

```typescript
describe("Transform Integration", () => {
  it("should update world matrix when parent changes", async () => {
    const engine = await WebGLEngine.create({ canvas });
    const scene = engine.sceneManager.scenes[0];
    const parent = scene.createRootEntity("parent");
    const child = parent.createChild("child");

    parent.transform.position.set(10, 0, 0);
    engine.update();

    expect(child.transform.worldPosition.x).toBe(10);
  });
});
```

### 3. E2E测试
测试完整的用户场景。

```typescript
import { test, expect } from "@playwright/test";

test("render a simple scene", async ({ page }) => {
  await page.goto("/examples/basic");
  await page.waitForLoadState("networkidle");

  // 截图对比
  await expect(page).toHaveScreenshot("basic-scene.png");
});
```

## 数学测试标准

### 精度要求
- **浮点比较**: 必须使用 `MathUtil.equals(a, b)`
- **容差值**: `1e-6` (MathUtil.zeroTolerance)
- **矩阵运算**: 结果必须在容差范围内

```typescript
it("should multiply matrices correctly", () => {
  const a = new Matrix(1, 2, 3.3, 4, 5, 6, 7, 8, 9, 10.9, 11, 12, 13, 14, 15, 16);
  const b = new Matrix(16, 15, 14, 13, 12, 11, 10, 9, 8.88, 7, 6, 5, 4, 3, 2, 1);
  const out = new Matrix();
  const expected = new Matrix(386, 456.6, 506.8, 560, 274, 325, 361.6, 400, 162.88, 195.16, 219.304, 243.52, 50, 61.8, 71.2, 80);

  Matrix.multiply(a, b, out);
  expect(Matrix.equals(out, expected)).toBe(true);
});
```

### 边界值测试
必须测试的边界情况：
- 零值 (0)
- 极小值 (`MathUtil.zeroTolerance`)
- 极大值 (`Number.MAX_VALUE`)
- 特殊值 (`NaN`, `Infinity`, `-Infinity`)

```typescript
it("should handle zero vector", () => {
  const v = new Vector3(0, 0, 0);
  expect(v.length()).toBe(0);
});

it("should handle very small values", () => {
  const a = 1e-7;
  const b = 0;
  expect(MathUtil.equals(a, b)).toBe(true);
});
```

### 几何测试
- **相交测试**: AABB、Sphere、Frustum、Ray
- **投影测试**: 点到平面、点到直线
- **变换测试**: 平移、旋转、缩放的组合

## 测试覆盖率要求

### 覆盖指标
- **行覆盖率**: 100%
- **分支覆盖率**: 100%
- **函数覆盖率**: 100%
- **语句覆盖率**: 100%

### 覆盖配置
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        global: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        }
      }
    }
  }
});
```

## 测试命名规范

### 描述命名
- **describe**: 测试的类或功能模块
- **it**: 具体的测试场景，使用 "should + 期望结果" 格式

```typescript
describe("Vector3", () => {
  describe("add", () => {
    it("should add two vectors correctly", () => {
      // 测试正常加法
    });

    it("should handle zero vector addition", () => {
      // 测试与零向量相加
    });

    it("should not modify original vectors", () => {
      // 测试原始向量不被修改
    });
  });
});
```

### 测试分类
- **单元测试**: `[Class].test.ts`
- **集成测试**: `[Feature].integration.test.ts`
- **E2E测试**: `[Scenario].e2e.test.ts`

## 测试数据和夹具

### 测试数据
```typescript
// 使用辅助函数创建测试数据
function createTestMatrix(): Matrix {
  return new Matrix(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
}

function createTestVector3(): Vector3 {
  return new Vector3(1, 2, 3);
}
```

### 测试夹具
```typescript
// tests/fixtures/engine.ts
import { WebGLEngine } from "@galacean/engine";

export async function createTestEngine(): Promise<WebGLEngine> {
  const canvas = document.createElement("canvas");
  return await WebGLEngine.create({ canvas });
}

// tests/fixtures/scene.ts
export function createTestScene(engine: WebGLEngine): Scene {
  const scene = engine.sceneManager.scenes[0];
  scene.createRootEntity("root");
  return scene;
}
```

## 异步测试

### Promise测试
```typescript
it("should load resource asynchronously", async () => {
  const engine = await createTestEngine();
  const resource = await engine.resourceManager.load<Model>("model.glb");

  expect(resource).toBeDefined();
  expect(resource.meshes.length).toBeGreaterThan(0);
});
```

### 超时设置
```typescript
it("should complete within time limit", async () => {
  const result = await longRunningOperation();
  expect(result).toBeTruthy();
}, 5000); // 5秒超时
```

## Mock和Stub

### Mock对象
```typescript
import { vi } from "vitest";

it("should call callback on event", () => {
  const callback = vi.fn();
  const emitter = new EventEmitter();

  emitter.on("test", callback);
  emitter.emit("test", "data");

  expect(callback).toHaveBeenCalledWith("data");
  expect(callback).toHaveBeenCalledTimes(1);
});
```

### Stub方法
```typescript
it("should use stubbed method", () => {
  const originalMethod = Math.random;
  Math.random = vi.fn(() => 0.5);

  const result = someFunctionUsingRandom();

  expect(result).toBe(expectedValue);

  // 恢复原方法
  Math.random = originalMethod;
});
```

## 性能测试

### 基准测试
```typescript
it("should complete within performance budget", () => {
  const start = performance.now();

  // 执行操作1000次
  for (let i = 0; i < 1000; i++) {
    performOperation();
  }

  const duration = performance.now() - start;
  expect(duration).toBeLessThan(16); // 应该在一帧内完成
});
```

### 内存测试
```typescript
it("should not create excessive objects", () => {
  const initialObjects = countObjects();

  // 执行可能创建对象的操作
  performOperation();

  // 强制垃圾回收（如果可能）
  if (global.gc) global.gc();

  const finalObjects = countObjects();
  expect(finalObjects - initialObjects).toBeLessThan(10);
});
```

## 视觉回归测试

### 截图测试
```typescript
test("render correctly", async ({ page }) => {
  await page.goto("/examples/scene");
  await page.waitForLoadState("networkidle");

  // 等待渲染完成
  await page.waitForFunction(() => {
    return window.engine && window.engine.sceneManager.activeScene;
  });

  await expect(page).toHaveScreenshot("scene.png", {
    fullPage: true,
    threshold: 0.2 // 允许2%的差异
  });
});
```

### 图像比较
```typescript
it("should generate correct render output", async () => {
  const canvas = document.createElement("canvas");
  const engine = await WebGLEngine.create({ canvas });

  // 设置场景并渲染
  setupScene(engine);
  engine.update();

  // 获取图像数据并比较
  const imageData = canvas.toDataURL();
  const diff = compareImages(imageData, expectedImage);
  expect(diff).toBeLessThan(0.01); // 允许1%的差异
});
```

## 测试命令

### 运行测试
```bash
# 运行所有测试
pnpm test

# 运行特定文件
pnpm test tests/src/math/Matrix.test.ts

# 运行匹配模式的测试
pnpm test --grep "Matrix"

# 监视模式
pnpm test --watch

# 覆盖率报告
pnpm coverage

# E2E测试
pnpm e2e

# E2E调试
pnpm e2e:debug
```

### CI/CD集成
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test
      - run: pnpm coverage
      - uses: codecov/codecov-action@v3
```

## 测试最佳实践

### 1. 测试隔离
- 每个测试应该独立运行
- 使用 `beforeEach` 和 `afterEach` 清理状态
- 避免测试之间的依赖

### 2. 清晰的断言
- 使用具体的期望值
- 断言消息要清晰
- 测试一个行为点

### 3. 有意义的测试
- 测试业务逻辑，不是实现细节
- 覆盖正常和异常情况
- 测试边界条件

### 4. 持续维护
- 保持测试更新
- 删除过时的测试
- 重构重复的测试代码

## 常见问题

### Q: 如何测试WebGL相关代码？
A: 使用headless-gl或创建离屏canvas进行测试。

### Q: 如何处理异步渲染？
A: 使用 `requestAnimationFrame` 包装，或等待特定帧数。

### Q: 如何测试用户交互？
A: 使用 Playwright 模拟用户输入事件。

### Q: 如何优化慢速测试？
A: 使用共享夹具、并行执行、选择性运行。

---

**注意**: 所有新代码必须包含相应的测试，确保代码质量和系统稳定性。测试覆盖率必须达到100%才能合并。