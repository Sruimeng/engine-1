# 共享实用工具库（Shared Utilities）

本文档列出了项目中可用的共享实用工具类和函数，避免重复造轮子。所有工具都按照功能类别组织，包含位置路径、主要功能和使用建议。

## 1. 通用工具（General Utilities）

### Utils.ts
**位置**: `packages/core/src/Utils.ts`

**主要功能**:
- `removeFromArray()`: 从数组中快速删除元素（使用交换法优化性能）
- `decodeText()`: 将 Uint8Array 解码为字符串（兼容性处理）
- `isAbsoluteUrl()`: 判断是否为绝对URL
- `isBase64Url()`: 判断是否为Base64 URL
- `resolveAbsoluteUrl()`: 将相对URL转换为绝对URL
- `objectValues()`: 获取对象的所有值
- `_floatMatrixMultiply()`: 内部使用的高性能矩阵乘法
- `_reflectGet()`: 简化的lodash get功能
- `_quickSort()`: 基于V8引擎的快速排序实现

**使用建议**: 项目中最常用的工具类，优先使用其中的数组操作和URL处理方法。

### MathUtil.ts
**位置**: `packages/math/src/MathUtil.ts`

**主要功能**:
- `zeroTolerance`: 浮点数比较的零容差（1e-6）
- `radToDegreeFactor`: 弧度转角度系数
- `degreeToRadFactor`: 角度转弧度系数
- `clamp()`: 数值限制在指定范围内
- `equals()`: 浮点数近似相等判断
- `isPowerOf2()`: 判断是否为2的幂
- `radianToDegree()`: 弧度转角度
- `degreeToRadian()`: 角度转弧度
- `lerp()`: 线性插值

**使用建议**: 数学计算的首选工具，特别是浮点数比较和角度转换。

## 2. 数据结构（Data Structures）

### DisorderedArray.ts
**位置**: `packages/core/src/utils/DisorderedArray.ts`

**主要功能**:
- 高性能无序数组，删除操作使用交换法
- 支持循环遍历时安全删除
- `add()`: 添加元素
- `delete()`: 删除指定元素
- `deleteByIndex()`: 按索引删除（返回被替换的元素）
- `forEach()`: 循环遍历
- `forEachAndClean()`: 循环遍历并清理空元素
- `sort()`: 数组排序
- `garbageCollection()`: 垃圾回收

**使用建议**: 适用于频繁删除操作的场景，如实体管理、粒子系统等。

### ObjectPool.ts
**位置**: `packages/core/src/utils/ObjectPool.ts`

**主要功能**:
- 抽象对象池基类
- `garbageCollection()`: 批量清理对象池
- `IPoolElement` 接口定义可回收对象

**相关实现**:
- `ClearableObjectPool.ts`: 可清理的对象池
- `ReturnableObjectPool.ts`: 可归还的对象池
- `ShaderProgramPool.ts`: 着色器程序池

**使用建议**: 频繁创建销毁对象的场景，如临时对象、GPU资源等。

### SafeLoopArray.ts
**位置**: `packages/core/src/utils/SafeLoopArray.ts`

**主要功能**:
- 支持循环遍历时安全修改的数组
- `push()`: 添加元素
- `add()`: 指定位置添加元素
- `removeByIndex()`: 按索引删除元素
- `findAndRemove()`: 按条件删除元素
- `getLoopArray()`: 获取用于循环的数组副本

**使用建议**: 需要在遍历过程中修改数组的场景，避免并发修改异常。

## 3. 专用工具（Specialized Tools）

### CollisionUtil.ts
**位置**: `packages/math/src/CollisionUtil.ts`

**主要功能**:
- 平面与几何体相交检测
- 射线与几何体相交检测
- 包围盒、球体相交检测
- 视锥体包含性检测
- `intersectionPointThreePlanes()`: 三平面交点计算
- `distancePlaneAndPoint()`: 点到平面距离

**使用建议**: 3D碰撞检测和拾取操作的首选工具。

### BufferUtil.ts
**位置**: `packages/core/src/graphic/BufferUtil.ts`

**主要功能**:
- 顶点缓冲区格式转换
- `_getGLIndexType()`: 获取GL索引类型
- `_getGLIndexByteCount()`: 获取索引字节数
- `_getElementInfo()`: 获取顶点元素信息（大小、类型、归一化等）

**使用建议**: GPU缓冲区操作和顶点数据处理的专用工具。

### TextureUtils.ts
**位置**: `packages/core/src/texture/TextureUtils.ts`

**主要功能**:
- `supportGenerateMipmapsWithCorrection()`: 检查是否支持自动生成Mipmap
- `supportSRGB()`: 检查纹理格式是否支持sRGB
- `supportMipmaps()`: 检查是否支持Mipmap
- `supportGenerateMipmaps()`: 检查Mipmap生成支持

**使用建议**: 纹理格式和Mipmap相关的判断工具。

### ParticleBufferUtils.ts
**位置**: `packages/core/src/particle/ParticleBufferUtils.ts`

**主要功能**: 粒子系统缓冲区管理工具

### ShadowUtils.ts
**位置**: `packages/core/src/shadow/ShadowUtils.ts`

**主要功能**: 阴影渲染相关工具

### ShapeUtils.ts
**位置**: `packages/core/src/particle/modules/shape/ShapeUtils.ts`

**主要功能**: 粒子形状生成工具

## 4. UI工具（UI Tools）

### UIUtils.ts (Core)
**位置**: `packages/core/src/ui/UIUtils.ts`

**主要功能**:
- `renderOverlay()`: 渲染UI叠加层
- 管理虚拟相机和渲染队列
- SRGB色彩空间校正

### Utils.ts (UI Package)
**位置**: `packages/ui/src/Utils.ts`

**主要功能**:
- `setRootCanvasDirty()`: 设置根画布脏标记
- `setGroupDirty()`: 设置组脏标记
- `searchRootCanvasInParents()`: 在父级中搜索根画布
- `searchGroupInParents()`: 在父级中搜索组
- UI元素层级管理

### TextUtils.ts
**位置**: `packages/core/src/2d/text/TextUtils.ts`

**主要功能**:
- `textContext()`: 获取2D文本渲染上下文
- `measureFont()`: 测量字体尺寸
- `getNativeFontString()`: 获取原生字体字符串
- `measureTextWithWrap()`: 测量带换行的文本
- `measureTextWithoutWrap()`: 测量不换行的文本
- 字符信息缓存和管理

**使用建议**: 文本渲染和字体相关的核心工具。

## 5. GLTF工具（GLTF Tools）

### GLTFUtils.ts
**位置**: `packages/loader/src/gltf/GLTFUtils.ts`

**主要功能**:
- `floatBufferToVector*Array()`: Float32Array转换为Vector数组
- `getAccessorTypeSize()`: 获取访问器类型大小
- `getComponentType()`: 获取组件类型对应的TypedArray
- `getAccessorBuffer()`: 获取访问器缓冲区数据
- `parseGLB()`: 解析GLB格式文件
- `loadImageBuffer()`: 加载图像缓冲区
- `parseSampler()`: 解析采样器信息

**使用建议**: GLTF/GLB模型加载的专用工具。

## 6. 常量和枚举（Constants and Enums）

### Logger.ts
**位置**: `packages/core/src/base/Logger.ts`

**主要功能**:
- 统一的日志管理接口
- `enable()`: 启用日志
- `disable()`: 禁用日志
- `debug/info/warn/error`: 各级别日志输出

**使用建议**: 项目中所有日志输出都应通过Logger。

### Constant.ts
**位置**: `packages/core/src/base/Constant.ts`

**主要功能**:
- `DataType`枚举: GLSL数据类型定义
- `GLCapabilityType`枚举: WebGL能力类型
- `TypedArray`类型: 所有TypedArray类型的联合类型

**使用建议**: GPU编程和缓冲区操作的类型定义。

## 7. 渲染管线工具（Render Pipeline Tools）

### BatchUtils.ts
**位置**: `packages/core/src/RenderPipeline/BatchUtils.ts`

**主要功能**: 渲染批处理相关工具

### PipelineUtils.ts
**位置**: `packages/core/src/RenderPipeline/PipelineUtils.ts`

**主要功能**: 渲染管线工具

### ShaderLabUtils.ts
**位置**: `packages/shader-lab/src/ShaderLabUtils.ts`

**主要功能**: 着色器实验室工具

## 使用原则

1. **优先使用现有工具**: 在编写新功能前，先检查是否已有合适的工具
2. **避免重复实现**: 不要重新实现已存在的工具函数
3. **遵循项目约定**: 保持与现有工具的API风格一致
4. **性能优先**: 使用项目中经过优化的实现（如DisorderedArray的快速删除）
5. **扩展而非修改**: 如需新功能，优先扩展现有工具而非创建新工具

## 工具发现

当寻找特定功能时，可以：
1. 查看本分类列表
2. 在相应包的`utils/`目录下查找
3. 搜索关键词（如*Util、*Utils、Pool、Array等）
4. 查看测试文件了解使用方式

记住：使用共享工具不仅能提高开发效率，还能保证代码的一致性和性能。