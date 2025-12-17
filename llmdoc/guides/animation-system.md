---
id: "guide-animation-system"
type: "guide"
title: "动画系统使用指南"
description: "详细介绍骨骼动画、变形动画、属性动画等动画类型的创建和使用方法"
tags: ["guide", "animation", "skeletal-animation", "blend-shape", "animator"]
context_dependency: ["coding-conventions"]
related_ids: ["guide-component-system", "guide-scene-management"]
---

Galacean Engine提供了强大而灵活的动画系统，支持骨骼动画、变形动画、属性动画等多种动画类型。本指南详细介绍如何使用动画系统创建生动的3D动画效果。

## 目录
- [动画系统概述](#动画系统概述)
- [动画剪辑](#动画剪辑)
- [动画组件](#动画组件)
- [骨骼动画](#骨骼动画)
- [变形动画](#变形动画)
- [属性动画](#属性动画)
- [动画控制](#动画控制)
- [动画事件](#动画事件)
- [性能优化](#性能优化)
- [最佳实践](#最佳实践)

## 动画系统概述

### 核心概念

- **AnimationClip**: 动画剪辑，包含一组关键帧曲线
- **Animator**: 动画组件，控制动画播放
- **AnimationCurve**: 动画曲线，定义属性随时间的变化
- **AnimationState**: 动画状态，控制单个剪辑的播放
- **Avatar**: 骨骼映射，定义骨骼与模型的对应关系

### 动画类型

1. **骨骼动画**: 基于骨骼变换的角色动画
2. **变形动画**: 基于网格变形的表情动画
3. **属性动画**: 任意组件属性的动画
4. **着色器动画**: 着色器参数的动画

## 动画剪辑

### 创建动画剪辑

```typescript
import { AnimationClip, AnimationCurve, WrapMode } from '@galacean/engine';

// 创建空剪辑
const clip = new AnimationClip('MyAnimation');
clip.duration = 2.0; // 2秒
clip.wrapMode = WrapMode.Loop; // 循环播放

// 添加位置动画曲线
const positionCurve = new AnimationCurve();
positionCurve.keys = [
  { time: 0, value: 0, inTangent: 0, outTangent: 0 },
  { time: 1, value: 5, inTangent: 5, outTangent: 5 },
  { time: 2, value: 0, inTangent: -5, outTangent: -5 }
];

// 添加旋转动画曲线
const rotationCurve = new AnimationCurve();
rotationCurve.keys = [
  { time: 0, value: 0, inTangent: 0, outTangent: Math.PI },
  { time: 2, value: Math.PI * 2, inTangent: Math.PI, outTangent: 0 }
];

// 绑定到实体属性
clip.addCurveBinding('position.x', AnimationCurveType.Float, positionCurve);
clip.addCurveBinding('rotation.y', AnimationCurveType.Float, rotationCurve);
```

### 从文件加载动画

```typescript
// 加载包含动画的模型
const model = await engine.resourceManager.load<Model>('character.glb');

// 获取动画剪辑
const walkClip = model.getAnimationClip('walk');
const runClip = model.getAnimationClip('run');
const jumpClip = model.getAnimationClip('jump');

// 设置动画剪辑属性
walkClip.wrapMode = WrapMode.Loop;
runClip.wrapMode = WrapMode.Loop;
jumpClip.wrapMode = WrapMode.Once;
```

### 动画剪辑属性

```typescript
// 播放模式
clip.wrapMode = WrapMode.Once;      // 播放一次
clip.wrapMode = WrapMode.Loop;      // 循环播放
clip.wrapMode = WrapMode.PingPong;  // 来回播放

// 播放速度
clip.timeScale = 1.0;  // 正常速度
clip.timeScale = 2.0;  // 2倍速
clip.timeScale = 0.5;  // 0.5倍速

// 根节点运动
clip.enableRootMotion = true;  // 启用根运动
clip.rootMotionCurves = [];    // 根运动曲线
```

### 手动创建复杂动画

```typescript
class AnimationClipCreator {
  static createBounceAnimation(): AnimationClip {
    const clip = new AnimationClip('Bounce');
    clip.duration = 1.0;
    clip.wrapMode = WrapMode.Loop;

    // Y轴位置曲线（弹跳效果）
    const yCurve = new AnimationCurve();
    const keys = [
      { time: 0.0, value: 0, inTangent: 0, outTangent: 0 },
      { time: 0.125, value: 1, inTangent: 4, outTangent: -4 },
      { time: 0.25, value: 0, inTangent: -4, outTangent: 0 },
      { time: 0.5, value: 0.5, inTangent: 2, outTangent: -2 },
      { time: 0.75, value: 0, inTangent: -2, outTangent: 0 },
      { time: 1.0, value: 0, inTangent: 0, outTangent: 0 }
    ];

    yCurve.keys = keys;
    clip.addCurveBinding('position.y', AnimationCurveType.Float, yCurve);

    // X轴旋转曲线（弹跳时倾斜）
    const xCurve = new AnimationCurve();
    xCurve.keys = [
      { time: 0.0, value: 0, inTangent: 0, outTangent: -0.5 },
      { time: 0.125, value: -0.1, inTangent: -0.5, outTangent: 0.5 },
      { time: 0.25, value: 0, inTangent: 0.5, outTangent: 0 }
    ];
    xCurve.keys = xCurve.keys.concat(
      keys.map(k => ({ ...k, time: k.time + 0.5 }))
    );

    clip.addCurveBinding('rotation.x', AnimationCurveType.Float, xCurve);

    return clip;
  }

  static createFadeAnimation(): AnimationClip {
    const clip = new AnimationClip('Fade');
    clip.duration = 2.0;
    clip.wrapMode = WrapMode.Once;

    // 透明度曲线
    const alphaCurve = new AnimationCurve();
    alphaCurve.keys = [
      { time: 0, value: 0, inTangent: 0, outTangent: 0.5 },
      { time: 1, value: 1, inTangent: 0.5, outTangent: 0.5 },
      { time: 2, value: 0, inTangent: 0.5, outTangent: 0 }
    ];

    clip.addCurveBinding('material.alpha', AnimationCurveType.Float, alphaCurve);
    clip.addCurveBinding('material.emissiveIntensity', AnimationCurveType.Float, alphaCurve);

    return clip;
  }
}
```

## 动画组件

### 基本使用

```typescript
import { Animator, AnimationClip } from '@galacean/engine';

// 添加动画组件
const entity = scene.createRootEntity('AnimatedCharacter');
const animator = entity.addComponent(Animator);

// 设置Avatar（骨骼映射）
const model = await engine.resourceManager.load<Model>('character.glb');
const avatar = model.getAvatar();
animator.avatar = avatar;

// 添加动画剪辑
const walkClip = model.getAnimationClip('walk');
animator.addAnimationClip(walkClip);

// 播放动画
animator.play('walk');
```

### 多动画管理

```typescript
class CharacterAnimationController extends Script {
  private animator: Animator;
  private currentState: string = 'idle';

  onAwake(): void {
    this.animator = this.entity.getComponent(Animator);
  }

  playAnimation(stateName: string, transitionDuration: number = 0.3): void {
    if (this.currentState === stateName) return;

    // 交叉淡入淡出到新状态
    this.animator.crossFade(stateName, transitionDuration);
    this.currentState = stateName;
  }

  // 移动控制
  moveForward(speed: number): void {
    if (speed > 0.1) {
      if (speed > 5) {
        this.playAnimation('run');
      } else {
        this.playAnimation('walk');
      }
    } else {
      this.playAnimation('idle');
    }
  }

  // 跳跃
  jump(): void {
    if (this.currentState !== 'jump') {
      this.animator.crossFade('jump', 0.1);
      this.currentState = 'jump';

      // 跳跃动画结束后回到idle
      this.animator.once('jump', () => {
        this.playAnimation('idle');
      });
    }
  }
}
```

### 动画层

```typescript
// 设置动画层
animator.layerCount = 3;

// 基础层（移动动画）
const baseLayer = animator.getLayer(0);
baseLayer.name = 'Base Layer';
baseLayer.weight = 1.0;
baseLayer.addState('idle');
baseLayer.addState('walk');
baseLayer.addState('run');

// 上半身层（射击动画）
const upperLayer = animator.getLayer(1);
upperLayer.name = 'Upper Body';
upperLayer.avatarMask = new AvatarMask();
upperLayer.avatarMask.addHumanoidBone(HumanoidBones.RightArm);
upperLayer.avatarMask.addHumanoidBone(HumanoidBones.LeftArm);
upperLayer.weight = 1.0;

// 添加层
animator.addLayer(upperLayer);
```

## 骨骼动画

### 骨架设置

```typescript
import { SkinnedMeshRenderer, Skin } from '@galacean/engine';

// 创建骨骼网格
const skinnedMesh = entity.addComponent(SkinnedMeshRenderer);

// 设置骨骼
const bones: Transform[] = [];
for (let i = 0; i < boneCount; i++) {
  const boneEntity = entity.createChild(`Bone_${i}`);
  bones.push(boneEntity.transform);
}

// 创建蒙皮
const skin = new Skin(bones);
skinnedMesh.skin = skin;

// 设置权重
const boneWeights: BoneWeight[] = [];
for (let vertex = 0; vertex < vertexCount; vertex++) {
  // 每个顶点最多受4根骨骼影响
  boneWeights.push({
    boneIndex0: 0,
    boneIndex1: 1,
    boneIndex2: 2,
    boneIndex3: 3,
    weight0: 0.5,
    weight1: 0.3,
    weight2: 0.15,
    weight3: 0.05
  });
}

skinnedMesh.boneWeights = boneWeights;
```

### IK动画

```typescript
import { IKAimSolver, IKCCDSolver } from '@galacean/engine';

class IKController extends Script {
  private target: Transform;
  private ikSolver: IKAimSolver;

  onAwake(): void {
    const animator = this.entity.getComponent(Animator);
    const armBone = animator.getBoneTransform(HumanoidBones.RightArm);

    // 创建IK求解器
    this.ikSolver = new IKAimSolver();
    this.ikSolver.chainLength = 3; // IK链条长度
    this.ikSolver.iterations = 10; // 求解迭代次数
    this.ikSolver.weight = 1.0;    // IK权重

    // 设置目标
    this.target = scene.findEntityByName('IKTarget').transform;
  }

  onUpdate(): void {
    // 更新IK
    this.ikSolver.solve(this.target.position);
  }
}
```

### 骨骼重定向

```typescript
class AnimationRetargeter {
  static retargetAnimation(
    sourceClip: AnimationClip,
    sourceAvatar: Avatar,
    targetAvatar: Avatar
  ): AnimationClip {
    const retargetedClip = new AnimationClip(sourceClip.name + '_retargeted');
    retargetedClip.duration = sourceClip.duration;
    retargetedClip.wrapMode = sourceClip.wrapMode;

    // 获取骨骼映射
    const boneMapping = this.createBoneMapping(sourceAvatar, targetAvatar);

    // 重定向曲线
    sourceClip.curveBindings.forEach(binding => {
      const targetBone = boneMapping.get(binding.path);
      if (targetBone) {
        const newBinding = binding.clone();
        newBinding.path = targetBone;
        retargetedClip.addCurveBinding(newBinding);
      }
    });

    return retargetedClip;
  }

  private static createBoneMapping(
    source: Avatar,
    target: Avatar
  ): Map<string, string> {
    const mapping = new Map<string, string>();

    // 根据骨骼名称或人类骨骼类型映射
    const sourceBones = source.getHumanBones();
    const targetBones = target.getHumanBones();

    sourceBones.forEach((bone, type) => {
      const targetBone = targetBones.get(type);
      if (targetBone) {
        mapping.set(bone.name, targetBone.name);
      }
    });

    return mapping;
  }
}
```

## 变形动画

### BlendShape动画

```typescript
import { BlendShape, BlendShapeManager } from '@galacean/engine';

// 创建变形目标
const blendShape = new BlendShape();

// 添加变形目标
const smileWeights = new Float32Array(vertexCount * 3); // 顶点偏移
blendShape.addFrame('smile', smileWeights);

const frownWeights = new Float32Array(vertexCount * 3);
blendShape.addFrame('frown', frownWeights);

// 应用到网格
const meshRenderer = entity.getComponent(SkinnedMeshRenderer);
meshRenderer.blendShape = blendShape;

// 创建变形动画
const expressionClip = new AnimationClip('Expression');
expressionClip.duration = 2.0;
expressionClip.wrapMode = WrapMode.PingPong;

// 添加变形曲线
const smileCurve = new AnimationCurve();
smileCurve.keys = [
  { time: 0, value: 0 },
  { time: 1, value: 100 },
  { time: 2, value: 0 }
];

expressionClip.addCurveBinding(
  'blendShape.smile',
  AnimationCurveType.Float,
  smileCurve
);
```

### 表情系统

```typescript
class FacialExpressionSystem extends Script {
  private blendShapeWeights: Map<string, number> = new Map();

  onAwake(): void {
    // 初始化表情权重
    this.blendShapeWeights.set('smile', 0);
    this.blendShapeWeights.set('frown', 0);
    this.blendShapeWeights.set('blink_left', 0);
    this.blendShapeWeights.set('blink_right', 0);
  }

  setExpression(expression: string, weight: number): void {
    this.blendShapeWeights.set(expression, weight);
    this.updateBlendShapes();
  }

  blendExpressions(expressions: { [key: string]: number }): void {
    expressions.forEach((weight, name) => {
      this.blendShapeWeights.set(name, weight);
    });
    this.updateBlendShapes();
  }

  private updateBlendShapes(): void {
    const meshRenderer = this.entity.getComponent(SkinnedMeshRenderer);
    const blendShape = meshRenderer.blendShape;

    this.blendShapeWeights.forEach((weight, name) => {
      blendShape.setWeight(name, weight);
    });
  }

  // 预设表情
  smile(): void {
    this.setExpression('smile', 80);
    this.setExpression('frown', 0);
  }

  sad(): void {
    this.setExpression('smile', 0);
    this.setExpression('frown', 60);
  }

  blink(): void {
    this.setExpression('blink_left', 100);
    this.setExpression('blink_right', 100);

    // 自动眨眼
    setTimeout(() => {
      this.setExpression('blink_left', 0);
      this.setExpression('blink_right', 0);
    }, 150);
  }
}
```

## 属性动画

### 材质动画

```typescript
class MaterialAnimationController extends Script {
  private material: Material;
  private time: number = 0;

  onAwake(): void {
    const renderer = this.entity.getComponent(MeshRenderer);
    this.material = renderer.getInstanceMaterial();
  }

  onUpdate(deltaTime: number): void {
    this.time += deltaTime;

    // 颜色渐变动画
    const hue = (Math.sin(this.time) + 1) * 0.5;
    const color = Color.fromHSV(hue * 360, 0.8, 1);
    this.material.shaderData.setColor('u_baseColor', color);

    // 金属度脉动
    const metallic = (Math.sin(this.time * 2) + 1) * 0.5;
    this.material.shaderData.setFloat('u_metallic', metallic);

    // 粗糙度波动
    const roughness = (Math.cos(this.time * 1.5) + 1) * 0.4 + 0.1;
    this.material.shaderData.setFloat('u_roughness', roughness);
  }
}
```

### 粒子动画

```typescript
class ParticleAnimator extends Script {
  private particles: Particle[] = [];
  private particleSystem: ParticleSystem;

  onAwake(): void {
    this.particleSystem = this.entity.getComponent(ParticleSystem);
  }

  startBurst(count: number): void {
    for (let i = 0; i < count; i++) {
      this.createParticle();
    }
  }

  private createParticle(): void {
    const particle = new Particle();

    // 位置
    particle.position = new Vector3(
      (Math.random() - 0.5) * 2,
      0,
      (Math.random() - 0.5) * 2
    );

    // 速度
    particle.velocity = new Vector3(
      (Math.random() - 0.5) * 10,
      Math.random() * 5 + 2,
      (Math.random() - 0.5) * 10
    );

    // 生命周期
    particle.lifetime = Math.random() * 3 + 1;
    particle.age = 0;

    // 大小
    particle.size = Math.random() * 0.5 + 0.5;

    // 颜色
    const hue = Math.random() * 360;
    particle.color = Color.fromHSV(hue, 0.8, 1);

    this.particles.push(particle);
  }

  onUpdate(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // 更新年龄
      particle.age += deltaTime;
      if (particle.age > particle.lifetime) {
        this.particles.splice(i, 1);
        continue;
      }

      // 更新位置
      particle.position.add(particle.velocity.clone().scale(deltaTime));

      // 更新速度（重力）
      particle.velocity.y -= 9.8 * deltaTime;

      // 更新透明度
      const lifeRatio = particle.age / particle.lifetime;
      particle.color.a = 1 - lifeRatio;

      // 更新大小
      particle.size *= (1 - deltaTime * 0.5);
    }

    // 更新粒子系统
    this.particleSystem.setParticles(this.particles);
  }
}
```

### 路径动画

```typescript
class PathAnimator extends Script {
  private path: Vector3[] = [];
  private currentIndex: number = 0;
  private speed: number = 5;
  private progress: number = 0;

  onAwake(): void {
    this.createPath();
  }

  private createPath(): void {
    // 创建贝塞尔曲线路径
    const points: Vector3[] = [
      new Vector3(0, 0, 0),
      new Vector3(5, 2, 0),
      new Vector3(10, 0, 0),
      new Vector3(15, -2, 5),
      new Vector3(20, 0, 10)
    ];

    this.path = this.generateBezierPath(points, 50);
  }

  private generateBezierPath(controlPoints: Vector3[], segments: number): Vector3[] {
    const path: Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = this.calculateBezierPoint(t, controlPoints);
      path.push(point);
    }

    return path;
  }

  private calculateBezierPoint(t: number, points: Vector3[]): Vector3 {
    if (points.length === 1) {
      return points[0];
    }

    const newPoints: Vector3[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const point = new Vector3(
        Vector3.lerp(points[i], points[i + 1], t).x,
        Vector3.lerp(points[i], points[i + 1], t).y,
        Vector3.lerp(points[i], points[i + 1], t).z
      );
      newPoints.push(point);
    }

    return this.calculateBezierPoint(t, newPoints);
  }

  onUpdate(deltaTime: number): void {
    if (this.path.length < 2) return;

    // 计算移动距离
    const moveDistance = this.speed * deltaTime;
    this.progress += moveDistance;

    // 检查是否到达下一个点
    const currentPoint = this.path[this.currentIndex];
    const nextPoint = this.path[(this.currentIndex + 1) % this.path.length];
    const segmentLength = Vector3.distance(currentPoint, nextPoint);

    if (this.progress >= segmentLength) {
      this.progress -= segmentLength;
      this.currentIndex = (this.currentIndex + 1) % this.path.length;
    }

    // 计算当前位置
    const t = this.progress / segmentLength;
    const currentPosition = Vector3.lerp(
      this.path[this.currentIndex],
      this.path[(this.currentIndex + 1) % this.path.length],
      t
    );

    // 更新位置和朝向
    this.entity.transform.position = currentPosition;
    if (nextPoint) {
      this.entity.transform.lookAt(nextPoint);
    }
  }
}
```

## 动画控制

### 播放控制

```typescript
class AnimationController extends Script {
  private animator: Animator;
  private animationStates: Map<string, AnimationState> = new Map();

  onAwake(): void {
    this.animator = this.entity.getComponent(Animator);
    this.setupAnimations();
  }

  private setupAnimations(): void {
    // 添加动画状态
    ['idle', 'walk', 'run', 'jump'].forEach(name => {
      const state = this.animator.addState(name);
      this.animationStates.set(name, state);
    });
  }

  play(name: string, speed: number = 1.0): void {
    const state = this.animationStates.get(name);
    if (state) {
      state.speed = speed;
      this.animator.play(name);
    }
  }

  stop(name?: string): void {
    if (name) {
      const state = this.animationStates.get(name);
      if (state) {
        state.stop();
      }
    } else {
      this.animator.stop();
    }
  }

  pause(): void {
    this.animator.speed = 0;
  }

  resume(): void {
    this.animator.speed = 1;
  }

  setSpeed(speed: number): void {
    this.animator.speed = speed;
  }

  setTime(time: number): void {
    this.animator.time = time;
  }
}
```

### 动画过渡

```typescript
class AnimationTransitionController extends Script {
  private animator: Animator;
  private transitions: Map<string, Transition> = new Map();

  onAwake(): void {
    this.animator = this.entity.getComponent(Animator);
    this.setupTransitions();
  }

  private setupTransitions(): void {
    // 创建动画状态机
    const idleToWalk = new Transition('idle', 'walk');
    idleToWalk.duration = 0.2;
    idleToWalk.hasExitTime = false;
    this.transitions.set('idle_to_walk', idleToWalk);

    const walkToRun = new Transition('walk', 'run');
    walkToRun.duration = 0.15;
    walkToRun.hasExitTime = false;
    this.transitions.set('walk_to_run', walkToRun);

    const anyToJump = new Transition(null, 'jump'); // null表示任意状态
    anyToJump.duration = 0.1;
    anyToJump.hasExitTime = true;
    anyToJump.exitTime = 0.8;
    this.transitions.set('any_to_jump', anyToJump);
  }

  transitionTo(targetState: string, duration: number = 0.3): void {
    this.animator.crossFade(targetState, duration);
  }

  // 智能过渡
  smartTransition(requestedState: string): void {
    const currentState = this.animator.getCurrentState();
    const speed = this.animator.speed;

    // 根据当前状态和请求状态选择最佳过渡
    switch (requestedState) {
      case 'walk':
        if (currentState === 'idle') {
          this.transitionTo('walk', 0.2);
        } else if (currentState === 'run') {
          this.transitionTo('walk', 0.15);
        }
        break;

      case 'run':
        if (currentState === 'walk') {
          this.transitionTo('run', 0.15);
        } else if (currentState === 'idle') {
          this.transitionTo('walk', 0.1);
          setTimeout(() => this.transitionTo('run', 0.1), 100);
        }
        break;

      case 'jump':
        // 跳跃只能从地面状态触发
        if (['idle', 'walk', 'run'].includes(currentState)) {
          this.transitionTo('jump', 0.1);
        }
        break;

      default:
        this.transitionTo(requestedState, 0.3);
    }
  }
}
```

### 混合树

```typescript
class BlendTreeController extends Script {
  private blendTree: BlendTree;
  private parameters: Map<string, number> = new Map();

  onAwake(): void {
    this.createBlendTree();
  }

  private createBlendTree(): void {
    // 创建1D混合树（基于速度）
    const movementBlend = new BlendTree(BlendTreeType.Blend1D);
    movementBlend.name = 'Movement';
    movementBlend.blendParameter = 'speed';

    // 添加混合子树
    movementBlend.addChild({
      clip: this.getClip('idle'),
      threshold = 0
    });

    movementBlend.addChild({
      clip: this.getClip('walk'),
      threshold = 3
    });

    movementBlend.addChild({
      clip: this.getClip('run'),
      threshold = 6
    });

    // 创建2D混合树（基于速度和方向）
    const directionalBlend = new BlendTree(BlendTreeType.Blend2D);
    directionalBlend.name = 'DirectionalMovement';
    directionalBlend.blendParameters = ['speed', 'direction'];

    // 添加各个方向的运动
    directionalBlend.addChild({
      clip: this.getClip('walk_forward'),
      position = new Vector2(0, 1)
    });

    directionalBlend.addChild({
      clip: this.getClip('walk_backward'),
      position = new Vector2(0, -1)
    });

    directionalBlend.addChild({
      clip: this.getClip('walk_left'),
      position = new Vector2(-1, 0)
    });

    directionalBlend.addChild({
      clip: this.getClip('walk_right'),
      position = new Vector2(1, 0)
    });

    // 添加到主混合树
    this.blendTree = new BlendTree(BlendTreeType.Blend1D);
    this.blendTree.addChild({ tree: movementBlend, threshold: 0 });
    this.blendTree.addChild({ tree: directionalBlend, threshold: 1 });

    // 应用到动画器
    const animator = this.entity.getComponent(Animator);
    animator.setBlendTree(this.blendTree);
  }

  setParameter(name: string, value: number): void {
    this.parameters.set(name, value);
    this.blendTree.setFloat(name, value);
  }

  // 基于速度和方向的混合
  updateMovement(speed: number, direction: number): void {
    this.setParameter('speed', speed);
    this.setParameter('direction', direction);
  }
}
```

## 动画事件

### 添加事件

```typescript
class AnimationEventHandler extends Script {
  onAwake(): void {
    const animator = this.entity.getComponent(Animator);

    // 添加动画事件
    const footstepEvent = new AnimationEvent();
    footstepEvent.time = 0.5; // 动画50%时触发
    footstepEvent.functionName = 'onFootstep';
    footstepEvent.stringParameter = 'footstep';

    const attackEvent = new AnimationEvent();
    attackEvent.time = 0.8;
    attackEvent.functionName = 'onAttack';
    attackEvent.stringParameter = 'sword';
    attackEvent.floatParameter = 10.5;

    // 添加到动画剪辑
    const attackClip = animator.getAnimationClip('attack');
    attackClip.addEvent(footstepEvent);
    attackClip.addEvent(attackEvent);
  }

  onFootstep(event: AnimationEvent): void {
    // 播放脚步声
    const audioSource = this.entity.getComponent(AudioSource);
    audioSource.playOneShot('footstep_sound');

    // 创建足迹粒子
    this.createFootprintParticle();
  }

  onAttack(event: AnimationEvent): void {
    // 检测攻击范围内的敌人
    this.checkAttackHit();

    // 播放攻击音效
    const audioSource = this.entity.getComponent(AudioSource);
    audioSource.playOneShot('swing_sound');
  }

  private createFootprintParticle(): void {
    // 创建足迹粒子效果
    const particleEntity = scene.createRootEntity('Footprint');
    const particleSystem = particleEntity.addComponent(ParticleSystem);
    // 配置粒子...
  }

  private checkAttackHit(): void {
    // 攻击检测逻辑
    const attackRange = 2;
    const attackAngle = 60;
    // 检测逻辑...
  }
}
```

### 事件系统

```typescript
class GlobalAnimationEventManager {
  private static instance: GlobalAnimationEventManager;
  private eventListeners: Map<string, Function[]> = new Map();

  static getInstance(): GlobalAnimationEventManager {
    if (!GlobalAnimationEventManager.instance) {
      GlobalAnimationEventManager.instance = new GlobalAnimationEventManager();
    }
    return GlobalAnimationEventManager.instance;
  }

  addListener(eventName: string, callback: Function): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName)!.push(callback);
  }

  removeListener(eventName: string, callback: Function): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  triggerEvent(eventName: string, data?: any): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in animation event callback: ${error}`);
        }
      });
    }
  }
}

// 使用全局事件管理器
const eventManager = GlobalAnimationEventManager.getInstance();

// 注册事件监听
eventManager.addListener('character_died', (character: Entity) => {
  playDeathAnimation(character);
});

eventManager.addListener('power_up', (character: Entity, powerUp: string) => {
  playPowerUpAnimation(character, powerUp);
});

// 在动画事件中触发
class CharacterAnimation extends Script {
  onAnimationComplete(): void {
    GlobalAnimationEventManager.getInstance().triggerEvent('animation_complete', {
      entity: this.entity,
      animation: this.currentAnimation
    });
  }
}
```

## 性能优化

### 动画LOD

```typescript
class AnimationLOD extends Script {
  private originalAnimator: Animator;
  private lodAnimator: Animator;
  private lodLevels: number[] = [10, 30, 50]; // 距离阈值

  onAwake(): void {
    this.originalAnimator = this.entity.getComponent(Animator);
    this.createLODAnimations();
  }

  private createLODAnimations(): void {
    // 创建LOD级别的简化动画
    const lowPolyAnimator = this.entity.clone().addComponent(Animator);

    // 简化动画帧率
    const walkClip = this.originalAnimator.getAnimationClip('walk');
    const simplifiedWalk = this.simplifyAnimationClip(walkClip, 10); // 10帧每秒
    lowPolyAnimator.addAnimationClip(simplifiedWalk);

    this.lodAnimator = lowPolyAnimator;
  }

  private simplifyAnimationClip(clip: AnimationClip, fps: number): AnimationClip {
    const simplified = clip.clone();
    simplified.duration = clip.duration;

    // 减少关键帧
    simplified.curveBindings.forEach(binding => {
      const curve = binding.curve;
      const frameInterval = 1.0 / fps;
      const newKeys: AnimationKey[] = [];

      for (let time = 0; time <= clip.duration; time += frameInterval) {
        const value = curve.evaluate(time);
        newKeys.push({
          time: time,
          value: value,
          inTangent: 0,
          outTangent: 0
        });
      }

      curve.keys = newKeys;
    });

    return simplified;
  }

  onUpdate(): void {
    const camera = scene.findEntityByName('MainCamera').getComponent(Camera);
    const distance = Vector3.distance(
      this.entity.transform.position,
      camera.transform.position
    );

    // 根据距离选择LOD级别
    let lodLevel = 0;
    for (let i = 0; i < this.lodLevels.length; i++) {
      if (distance > this.lodLevels[i]) {
        lodLevel++;
      }
    }

    // 应用LOD
    if (lodLevel === 0) {
      this.originalAnimator.enabled = true;
      this.lodAnimator.enabled = false;
    } else {
      this.originalAnimator.enabled = false;
      this.lodAnimator.enabled = true;
    }
  }
}
```

### 动画实例化

```typescript
class AnimationInstancing {
  private instances: InstancedAnimator[] = [];

  createInstancedAnimation(
    prototypeAnimator: Animator,
    count: number
  ): void {
    for (let i = 0; i < count; i++) {
      const instance = new InstancedAnimator(prototypeAnimator);
      this.instances.push(instance);
    }
  }

  updateAll(deltaTime: number): void {
    // 批量更新所有实例
    const time = performance.now();
    this.instances.forEach(instance => {
      instance.update(time * 0.001);
    });
  }
}

class InstancedAnimator {
  private prototype: Animator;
  private time: number = 0;

  constructor(prototype: Animator) {
    this.prototype = prototype;
  }

  update(time: number): void {
    this.time = time;
    // 使用原型动画的状态，但应用到不同实体
  }

  getPose(boneIndex: number): Transform {
    // 返回骨骼的当前姿态
    const pose = this.prototype.getBonePose(boneIndex);
    return pose.clone();
  }
}
```

### 异步动画加载

```typescript
class AsyncAnimationLoader {
  private loadingQueue: Map<string, Promise<AnimationClip>> = new Map();

  async loadAnimation(path: string): Promise<AnimationClip> {
    if (this.loadingQueue.has(path)) {
      return this.loadingQueue.get(path)!;
    }

    const promise = this.doLoadAnimation(path);
    this.loadingQueue.set(path, promise);
    return promise;
  }

  private async doLoadAnimation(path: string): Promise<AnimationClip> {
    // 分块加载大型动画文件
    const chunks = await this.loadAnimationChunks(path);

    // 异步解析
    const clip = await this.parseAnimationChunks(chunks);

    // 流式加载关键帧
    await this.streamKeyFrames(clip);

    return clip;
  }

  private async loadAnimationChunks(path: string): Promise<ArrayBuffer[]> {
    // 实现分块加载逻辑
    return [];
  }

  private async parseAnimationChunks(chunks: ArrayBuffer[]): Promise<AnimationClip> {
    // 解析动画数据
    return new AnimationClip('loaded');
  }

  private async streamKeyFrames(clip: AnimationClip): Promise<void> {
    // 流式加载关键帧以减少内存占用
    clip.curveBindings.forEach(binding => {
      binding.curve.setStreamingMode(true);
    });
  }
}
```

## 最佳实践

### 1. 动画状态机设计

```typescript
// 使用状态机模式管理复杂动画
class AnimationStateMachine {
  private states: Map<string, AnimationState> = new Map();
  private currentState: AnimationState | null = null;
  private globalTransitions: Transition[] = [];

  addState(name: string, state: AnimationState): void {
    this.states.set(name, state);
  }

  addTransition(from: string, to: string, condition: () => boolean): void {
    if (from === '*') {
      this.globalTransitions.push({ to, condition });
    } else {
      const fromState = this.states.get(from);
      if (fromState) {
        fromState.addTransition(to, condition);
      }
    }
  }

  update(): void {
    // 检查全局过渡
    this.globalTransitions.forEach(transition => {
      if (transition.condition()) {
        this.changeState(transition.to);
      }
    });

    // 检查当前状态的过渡
    if (this.currentState) {
      this.currentState.checkTransitions();
    }
  }

  changeState(stateName: string): void {
    const newState = this.states.get(stateName);
    if (newState && newState !== this.currentState) {
      if (this.currentState) {
        this.currentState.exit();
      }
      this.currentState = newState;
      this.currentState.enter();
    }
  }
}
```

### 2. 动画数据压缩

```typescript
class AnimationCompressor {
  static compressCurve(curve: AnimationCurve, tolerance: number = 0.01): AnimationCurve {
    const compressed = new AnimationCurve();
    compressed.keys = this.compressKeyFrames(curve.keys, tolerance);
    return compressed;
  }

  private static compressKeyFrames(keys: AnimationKey[], tolerance: number): AnimationKey[] {
    if (keys.length <= 2) return keys;

    const compressed = [keys[0]]; // 保留第一个关键帧

    let lastPoint = keys[0];
    for (let i = 1; i < keys.length - 1; i++) {
      const currentPoint = keys[i];
      const nextPoint = keys[i + 1];

      // 检查当前点是否可以移除
      if (this.canRemovePoint(lastPoint, currentPoint, nextPoint, tolerance)) {
        continue; // 跳过这个点
      }

      compressed.push(currentPoint);
      lastPoint = currentPoint;
    }

    compressed.push(keys[keys.length - 1]); // 保留最后一个关键帧
    return compressed;
  }

  private static canRemovePoint(
    p1: AnimationKey, p2: AnimationKey, p3: AnimationKey,
    tolerance: number
  ): boolean {
    // 计算p2是否在p1-p3的直线附近
    const interpolated = this.linearInterpolate(p1, p3, p2.time);
    const error = Math.abs(interpolated.value - p2.value);
    return error < tolerance;
  }

  private static linearInterpolate(p1: AnimationKey, p2: AnimationKey, time: number): { value: number } {
    const t = (time - p1.time) / (p2.time - p1.time);
    return {
      value: p1.value * (1 - t) + p2.value * t
    };
  }
}
```

### 3. 动画缓存系统

```typescript
class AnimationCache {
  private static cache: Map<string, AnimationData> = new Map();
  private static maxCacheSize = 50;

  static getAnimation(path: string): AnimationData | null {
    const data = this.cache.get(path);
    if (data) {
      data.lastAccessed = Date.now();
      return data;
    }
    return null;
  }

  static cacheAnimation(path: string, data: AnimationData): void {
    // 清理旧缓存
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanupCache();
    }

    this.cache.set(path, {
      ...data,
      lastAccessed: Date.now()
    });
  }

  private static cleanupCache(): void {
    // 按最后访问时间排序，删除最老的25%
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toDelete = Math.floor(this.maxCacheSize * 0.25);
    for (let i = 0; i < toDelete; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
}
```

通过遵循这些指南，你可以充分利用Galacean Engine的动画系统，创建流畅、生动的3D动画效果。

## ⚠️ 禁止事项

### 关键约束
- **动画曲线精度**: 关键帧插值必须使用浮点精度，避免使用整数导致动画跳跃
- **骨骼层级**: 骨骼动画必须严格遵循骨骼层级关系，不可随意断开父子关系
- **坐标系统**: 所有动画数值使用右手坐标系，旋转使用弧度制
- **内存管理**: 动画剪辑和状态机必须在实体销毁时正确释放，避免内存泄漏

### 常见错误
- **动画剪辑重用**: 不同实体必须使用独立的Animator组件，不能共享同一个Animator实例
- **曲线数据混用**: 动画曲线绑定路径必须精确匹配实体层级，路径错误会导致动画失效
- **事件内存泄漏**: 动画事件监听器必须在销毁时移除，否则会导致回调异常
- **LOD级别冲突**: 多个LOD级别的动画剪辑必须保持同步，避免视觉跳变

### 最佳实践
- **状态机设计**: 使用有限状态机模式管理复杂动画，避免硬编码状态转换
- **性能监控**: 动画播放时监控曲线数量和关键帧密度，保持在<100曲线/实体
- **异步加载**: 大型动画资源应使用异步分块加载，避免主线程阻塞
- **缓存复用**: 相同的动画剪辑使用缓存机制，避免重复解析同一资源
- **动画压缩**: 对于移动设备，使用有损压缩（容差0.01）减少内存占用