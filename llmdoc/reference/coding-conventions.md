---
id: "coding-conventions"
type: "reference"
title: "Galacean Engine 编码规范"
description: "定义数学约定、编码标准、性能优化和测试要求的核心宪法文档"
tags: ["coding-conventions", "typescript", "math", "performance", "testing", "git"]
context_dependency: ["tech-stack", "packages-overview"]
related_ids: ["data-models", "testing-standards", "git-workflow"]
---

## 📋 文档目的

本文档是 Galacean Engine 项目的**核心宪法**，所有开发者必须严格遵守。违反规范的代码将被拒绝合并。

## 🔌 核心接口定义

### 数学约定接口

```typescript
// 坐标系定义
interface CoordinateSystem {
  axis: {
    x: "右手方向";     // 正X轴向右
    y: "上方";         // 正Y轴向上
    z: "屏幕外";       // 正Z轴朝向观察者
  };
  unit: "米";          // 世界空间单位
  rotation: "右手定则"; // 逆时针为正
}

// 矩阵约定
interface MatrixConvention {
  storage: "列主序";    // Column-major
  layout: {
    col0: "elements[0-3]";
    col1: "elements[4-7]";
    col2: "elements[8-11]";
    col3: "elements[12-15]";
  };
  multiplication: "右乘向量 v' = M * v";
  transformOrder: "T * R * S"; // 先缩放，后旋转，最后平移
}

// 精度约定
interface PrecisionConvention {
  zeroTolerance: 1e-6;
  floatComparison: "MathUtil.equals(a, b)";
  angles: {
    internal: "弧度";
    api: "角度（需标注）";
  };
}
```

### TypeScript 编码接口

```typescript
// 命名约定
interface NamingConvention {
  class: "PascalCase";
  interface: "PascalCase";
  method: "camelCase";
  property: "camelCase";
  constant: "UPPER_SNAKE_CASE";
  privateMember: "下划线前缀";
  file: "PascalCase";
}

// 访问控制
interface AccessModifier {
  public: "默认，公开API";
  protected: "子类可访问";
  private: "仅类内部可访问";
  internal: "@internal JSDoc标记";
}

// 代码质量
interface CodeQuality {
  typeAnnotation: "所有公开API必须有类型注解";
  JSDoc: "所有公开API必须有JSDoc注释";
  purity: "组合优于继承";
}
```

## 1. 数学约定

### 1.1 坐标系统 (CoordinateSystem)
```
右手坐标系:
  X轴 → 右方
  Y轴 → 上方
  Z轴 → 朝向观察者(屏幕外)

单位: 米 (世界空间)
旋转: 右手定则，逆时针为正
```

### 1.2 矩阵约定 (MatrixConvention)
**存储格式**: 列主序 (Column-major Order)
- `elements[0-3]` = 第一列
- `elements[4-7]` = 第二列
- `elements[8-11]` = 第三列
- `elements[12-15]` = 第四列

**矩阵乘法**: 右乘向量 `v' = M * v`
**变换顺序**: 先缩放(S)，后旋转(R)，最后平移(T) => `M = T * R * S`

### 1.3 精度和容差 (PrecisionConvention)
```
零容差: 1e-6 (MathUtil.zeroTolerance)

浮点比较:
  ✅ 正确: MathUtil.equals(a, b)
  ❌ 错误: a === b

角度单位:
  - 内部计算: 弧度 (radians)
  - API接口: 角度 (degrees) 需明确标注

数学常量:
  - PI: Math.PI
  - 转换因子: MathUtil.radToDegreeFactor
```

### 1.4 向量约定
```
Vector2: (x, y)    → 2D坐标、纹理坐标
Vector3: (x, y, z) → 3D空间坐标
Vector4: (x, y, z, w) → 齐次坐标、颜色(RGBA)
颜色: [0, 1] 范围归一化
```

## 2. TypeScript 编码标准 (NamingConvention)

### 2.1 命名约定表

| 类型 | 规则 | 示例 |
|------|------|------|
| 类名 | PascalCase | `class Transform {}` |
| 接口名 | PascalCase | `interface IClone {}` |
| 方法名 | camelCase | `function getName() {}` |
| 属性名 | camelCase | `_position`, `worldMatrix` |
| 常量 | UPPER_SNAKE_CASE | `MathUtil.ZERO_TOLERANCE` |
| 私有成员 | 下划线前缀 | `_position`, `_updateFlag()` |
| 文件名 | PascalCase | `Transform.ts`, `Vector3.ts` |

### 2.2 类型系统
```typescript
// 必须: 公开API要有类型注解
class Matrix {
  // ✅ 正确
  multiply(right: Matrix): Matrix { /* ... */ }

  // ❌ 错误 (无类型注解)
  multiply(right) { /* ... */ }
}

// 使用联合类型
type Result = number | string | null;

// 泛型使用单字母
function clone<T>(item: T): T { return item; }
```

### 2.3 类设计原则
- **组合优于继承**: 优先使用组合模式
- **接口隔离**: 保持接口最小化
- **依赖注入**: 通过构造函数或setter注入依赖

### 2.4 访问修饰符 (AccessModifier)
```typescript
class Component {
  public name: string;           // 默认，公开API

  protected parent: Entity;      // 子类可访问

  private _id: number;           // 仅类内部可访问

  /** @internal */
  _internalFlag: boolean;        // 内部使用
}
```

## 3. 代码格式规范

### 3.1 Prettier 配置
```json
{
  "printWidth": 120,
  "singleQuote": false,
  "trailingComma": "none",
  "semi": true,
  "tabWidth": 2,
  "useTabs": false
}
```

### 3.2 格式要求
```
缩进: 2个空格
分号: 必须使用
引号: 双引号
行宽: 最大120字符
```

### 3.3 注释规范
**JSDoc** (所有公开API必须):
```typescript
/**
 * 计算两个矩阵的乘积
 * @param left - 第一个矩阵
 * @param right - 第二个矩阵
 * @param out - 输出矩阵 (会被修改)
 * @returns void - 结果存储在out中
 */
static multiply(left: Matrix, right: Matrix, out: Matrix): void {
  // 实现逻辑
}
```

**行内注释**: 解释复杂逻辑
```typescript
// 缓存临时向量避免重复分配
const temp = this._tempVec3.copyFrom(displacement);
```

**标签**: 使用 `@todo` 和 `@fixme`

### 3.4 导入导出
```typescript
// 导入顺序:
// 1. Node.js内置模块
import fs from 'fs';

// 2. 第三方库
import { vec3 } from 'gl-matrix';

// 3. 内部包
import { Engine } from '@galacean/engine-core';

// 4. 相对路径
import { Helper } from './Helper';

// 导出:
export { Matrix, Vector3 };  // 命名导出
// ❌ 避免: export default Matrix

// 类型导入:
import type { Component } from './Component';
```

## 4. 性能约定 (CodeQuality)

### 4.1 内存管理
```typescript
// 对象池模式
class ObjectPool<T> {
  private static _tempVec3: Vector3 = new Vector3();

  acquire(): T {
    // 优先从池中获取
    return this.pool.pop() || this.create();
  }
}
```

### 4.2 计算优化
```
✅ 避免重复计算: 缓存结果
✅ 提前退出: 分支中尽早返回
✅ 惰性求值: 延迟到需要时计算
✅ 缓存长度: for (let i=0, n=arr.length; i<n; i++)
```

### 4.3 循环优化
```typescript
for (let i = 0, n = entities.length; i < n; i++) {
  // 缓存数组长度
  const entity = entities[i];
  // 避免在循环中创建对象
}
```

## 5. 错误处理

### 5.1 异常类型
```
Error       → 一般性错误
TypeError   → 类型错误
RangeError  → 范围错误
```

### 5.2 处理策略
```typescript
// 参数验证
function setScale(scale: Vector3): void {
  if (!scale || scale.x === 0 || scale.y === 0 || scale.z === 0) {
    throw new TypeError('Scale cannot be zero');
  }
  // ...
}

// 断言
assert(this.isLoaded, 'Resource must be loaded first');

// 优雅降级
try {
  // 非关键操作
  this.loadOptionalFeature();
} catch (e) {
  // 使用默认值，不抛出
  this.feature = defaultFeature;
}
```

## 6. 测试约定

### 6.1 单元测试
```
命名: [ClassName].test.ts
框架: Vitest
断言: expect API
覆盖率: 100%分支覆盖
```

### 6.2 测试数据策略
```
边界值: 最小值、最大值、零值
特殊值: NaN, Infinity, -Infinity
精度测试: 验证数学计算精度
```

## 7. Git 约定

详见 [Git工作流规范](./git-workflow.md)

## 8. 架构原则

### 8.1 模块化
```
单一职责: 每个模块只负责一个功能
低耦合: 最小化模块间依赖
高内聚: 相关功能组织在一起
```

### 8.2 可扩展性
```
开放封闭: 对扩展开放，对修改封闭
插件架构: 通过插件支持新功能
面向接口: 优先使用接口抽象
```

### 8.3 性能目标
```
渲染循环: 保持60FPS
内存占用: 严格控制
启动时间: 最小化初始加载
```

## ⚠️ 禁止事项

### 关键约束
- 🚫 **直接浮点比较**: 必须使用 `MathUtil.equals()`
- 🚫 **缺少类型注解**: 所有公开API必须有类型
- 🚫 **any类型滥用**: 除非绝对必要
- 🚫 **坐标系混用**: 保持统一的手坐标系
- 🚫 **矩阵转置滥用**: 避免不必要的转置操作
- 🚫 **循环中创建对象**: 提前分配，重复使用

### 绝对禁止 (零容忍)
- ❌ `eval()` - 绝对禁止使用
- ❌ `with` 语句 - 绝对禁止
- ❌ `var` - 使用 `const` 或 `let`
- ❌ `==` - 必须使用 `===` 严格比较
- ❌ 忽略错误处理 - 必须验证参数和返回值

### 常见错误
- ❌ 忘记在循环中缓存数组长度
- ❌ 角度与弧度混淆
- ❌ 忘记添加 JSDoc 注释
- ❌ 使用未定义的临时变量
- ❌ 忽略精度要求

### 最佳实践
- ✅ 始终考虑性能影响
- ✅ 提供清晰的错误信息
- ✅ 保持代码的可维护性
- ✅ 测试边界情况
- ✅ 遵循team代码风格

## 🔗 相关文档

- [Git工作流规范](./git-workflow.md) - 提交规范、分支策略
- [测试标准](./testing-standards.md) - 单元测试、集成测试
- [共享工具库](./shared-utilities.md) - 通用工具和辅助函数
- [数据模型](./data-models.md) - ECS架构、核心组件

---

> ⚠️ **强制执行**: 这些规范是强制性的，违反规范的代码将被拒绝合并。所有新代码都必须遵守这些约定。
