# Galacean Engine 编码规范

这是 Galacean Engine 项目的编码规范，所有代码必须严格遵守这些约定。

## 数学约定

### 坐标系统
- **坐标系**: 右手坐标系 (Right-handed Coordinate System)
  - X轴: 右方
  - Y轴: 上方
  - Z轴: 朝向观察者（屏幕外）
- **单位**: 统一使用米作为世界空间单位
- **旋转**: 右手定则，逆时针为正方向

### 矩阵约定
- **存储格式**: **列主序** (Column-major Order)
  - 元素在内存中按列连续存储
  - `elements[0-3]` = 第一列
  - `elements[4-7]` = 第二列
  - `elements[8-11]` = 第三列
  - `elements[12-15]` = 第四列
- **矩阵乘法**: 右乘向量 `v' = M * v`
- **变换顺序**: 先缩放(S)，后旋转(R)，最后平移(T) => `M = T * R * S`

### 精度和容差
- **零容差**: `1e-6` (MathUtil.zeroTolerance)
- **浮点比较**: 必须使用 `MathUtil.equals(a, b)` 而非直接比较
- **角度单位**:
  - 内部计算使用弧度 (radians)
  - API 接口可使用角度 (degrees) 但会明确标注
- **数学常量**:
  - `PI`: 使用 `Math.PI`
  - 角度转换: `MathUtil.radToDegreeFactor`, `MathUtil.degreeToRadFactor`

### 向量约定
- **Vector2**: (x, y) - 2D空间坐标或纹理坐标
- **Vector3**: (x, y, z) - 3D空间坐标
- **Vector4**: (x, y, z, w) - 齐次坐标或颜色(RGBA)
- **颜色**: 归一化到 [0, 1] 范围

## TypeScript 编码标准

### 命名约定
- **类名**: PascalCase - `class Transform {}`
- **接口名**: PascalCase - `interface IClone {}`
- **方法名**: camelCase - `function getName() {}`
- **属性名**: camelCase - `_position`, `worldMatrix`
- **常量**: UPPER_SNAKE_CASE - `MathUtil.ZERO_TOLERANCE`
- **私有成员**: 下划线前缀 - `_position`, `_updateFlag()`
- **文件名**: PascalCase - `Transform.ts`, `Vector3.ts`

### 类型注解
- **必须**: 所有公开API必须有明确的类型注解
- **可选**: 内部私有成员可以省略（由TypeScript推断）
- **联合类型**: 使用 `|` 分隔 - `number | string`
- **泛型**: 使用 T, U, V 等单字母

### 访问修饰符
- **public**: 默认，公开API
- **protected**: 子类可访问
- **private**: 仅类内部可访问
- **@internal**: 内部使用，通过 `@internal` JSDoc 标记

### 类设计原则
- **组合优于继承**: 优先使用组合模式
- **接口隔离**: 保持接口最小化
- **依赖注入**: 通过构造函数或setter注入依赖

## 代码格式规范

### Prettier 配置
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

### 缩进和空格
- **缩进**: 2个空格
- **分号**: 必须使用
- **引号**: 双引号
- **行宽**: 最大120字符

### 注释规范
- **JSDoc**: 所有公开API必须有JSDoc注释
```typescript
/**
 * 计算两个矩阵的乘积
 * @param left - 第一个矩阵
 * @param right - 第二个矩阵
 * @param out - 输出矩阵
 */
static multiply(left: Matrix, right: Matrix, out: Matrix): void {
```

- **行内注释**: 解释复杂逻辑
- **TODO/FIXME**: 使用 `@todo` 和 `@fixme` 标签

### 导入导出
- **导入顺序**:
  1. Node.js内置模块
  2. 第三方库
  3. 内部包（@galacean/engine-*）
  4. 相对路径
- **导出**: 使用命名导出，避免默认导出
- **类型导入**: 使用 `import type`

## 性能约定

### 内存管理
- **对象池**: 对频繁创建的对象使用对象池
- **临时变量**: 使用静态成员存储临时变量
```typescript
private static _tempVec3: Vector3 = new Vector3();
```

### 计算优化
- **避免重复计算**: 缓存计算结果
- **提前退出**: 在条件分支中尽早返回
- **惰性求值**: 延迟到真正需要时计算

### 循环优化
- **缓存数组长度**: `for (let i = 0, n = arr.length; i < n; i++)`
- **避免在循环中创建对象**: 提前分配，重复使用

## 错误处理

### 异常类型
- **Error**: 一般性错误
- **TypeError**: 类型错误
- **RangeError**: 范围错误

### 错误处理策略
- **参数验证**: 检查null/undefined和有效范围
- **断言**: 对关键不变量使用断言
- **优雅降级**: 在非关键错误时提供默认值

## 禁止模式

### 禁止使用的特性
1. **any类型**: 除非绝对必要
2. **eval()**: 绝对禁止
3. **with语句**: 绝对禁止
4. **var**: 使用const或let
5. **==**: 使用===进行严格比较

### 数学运算禁止
1. **直接浮点比较**: 使用`MathUtil.equals()`
2. **角度混淆**: 明确区分角度和弧度
3. **坐标系混用**: 保持一致的坐标系约定
4. **矩阵转置**: 除非真正需要，避免不必要的矩阵转置

## 测试约定

### 单元测试
- **命名**: `[ClassName].test.ts`
- **框架**: Vitest
- **断言**: expect API
- **覆盖率**: 要求100%分支覆盖

### 测试数据
- **边界值**: 测试最小值、最大值、零值
- **特殊值**: NaN, Infinity, -Infinity
- **精度测试**: 验证数学计算的精度

## Git 约定

见 [Git工作流规范](./git-workflow.md)

## 架构原则

### 模块化
- **单一职责**: 每个模块只负责一个功能
- **低耦合**: 最小化模块间依赖
- **高内聚**: 相关功能组织在一起

### 可扩展性
- **开放封闭**: 对扩展开放，对修改封闭
- **插件架构**: 通过插件支持新功能
- **接口抽象**: 面向接口编程

### 性能考虑
- **渲染循环**: 保持60FPS
- **内存占用**: 控制内存使用
- **启动时间**: 最小化初始加载时间

---

**注意**: 这些规范是强制性的，违反规范的代码将被拒绝合并。所有新代码都必须遵守这些约定，确保代码库的一致性和质量。