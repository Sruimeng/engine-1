# Galacean Engine Git 工作流规范

本文档定义了 Galacean Engine 项目的 Git 工作流程、提交规范和协作指南。

## 分支策略

### 主要分支

#### `main` 分支
- **用途**: 生产就绪的稳定版本
- **保护**: 直接推送被禁用
- **要求**:
  - 所有PR必须通过CI检查
  - 必须有至少一个审查者批准
  - 必须通过所有测试

#### `develop` 分支（如果使用）
- **用途**: 集成最新功能
- **来源**: 功能分支的合并目标
- **同步**: 定期同步到`main`

### 功能分支

#### 命名规范
```
feature/功能名称
bugfix/问题描述
hotfix/紧急修复
release/版本号
docs/文档更新
refactor/重构说明
```

#### 分支生命周期
1. 从 `main` 或 `develop` 创建
2. 开发并提交
3. 创建Pull Request
4. 代码审查
5. 合并到目标分支
6. 删除功能分支

### 分支命名示例
```
feature/pbr-material-system
feature/webgpu-support
bugfix/memory-leak-in-component
hotfix/critical-rendering-issue
release/v1.7.0
docs/api-reference-update
refactor/transform-optimization
```

## 提交规范 (Conventional Commits)

### 提交格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型
必须使用以下类型之一：

- **feat**: 新功能
- **fix**: 错误修复
- **build**: 构建系统或依赖变更
- **ci**: CI配置变更
- **docs**: 文档更新
- **perf**: 性能优化
- **refactor**: 代码重构
- **style**: 代码格式（不影响功能）
- **test**: 测试相关
- **types**: TypeScript类型定义
- **revert**: 撤销之前的提交
- **chore**: 其他不修改src或test文件的变更

### Scope 范围
指定提交影响的模块：

```
feat(core): add entity pooling system
fix(math): matrix multiplication precision issue
docs(ui): add UITransform examples
perf(shader): optimize uniform updates
refactor(loader): cleanup asset loading pipeline
test(physics): add collision detection tests
```

### Subject 主题
- 使用现在时态 ("add" 而不是 "added")
- 首字母小写
- 结尾不加句号
- 简洁描述变更内容

### Body 正文
- 详细描述变更内容
- 说明变更原因
- 包含实现细节

```markdown
feat(math): implement quaternion slerp optimization

This optimization reduces the computational cost of spherical linear
interpolation by using a more efficient algorithm when the angle between
quaternions is small.

The new algorithm:
1. Uses dot product to detect small angles
2. Falls back to linear interpolation for small angles
3. Normalizes the result to maintain unit quaternion

This provides a 40% performance improvement for typical animation use cases.
```

### Footer 页脚

#### Breaking Changes
```markdown
feat(renderer): introduce new shader system

BREAKING CHANGE: The old shader API has been removed.
Please migrate to the new ShaderGraph system.
```

#### 关联Issues
```markdown
fix(engine): resolve memory leak (#123)

Closes #123
Related to #124
```

### 提交示例

#### 新功能
```markdown
feature(component): add script lifecycle events

Implement onStart, onUpdate, onLateUpdate, onDestroy events for
script components to provide better control over script execution order.

The events are called in the following order:
1. onStart - called once before the first update
2. onUpdate - called every frame
3. onLateUpdate - called after all updates
4. onDestroy - called when component is destroyed

Closes #456
```

#### 错误修复
```markdown
fix(transform): correct world matrix inheritance

The world matrix was not being updated correctly when the parent
transform was modified after child creation. This fix ensures that
the world matrix is properly recalculated in all scenarios.
```

#### 性能优化
```markdown
perf(renderer): batch static mesh draw calls

Implement automatic batching of static meshes with the same material
to reduce draw calls. This optimization provides a significant
performance improvement for scenes with many static objects.

- Automatic detection of batchable meshes
- Configurable batch size limits
- Preserve material sorting order

Performance improvement: 30-50% fewer draw calls in typical scenes.
```

## Pull Request 规范

### PR 标题
遵循提交规范格式：
```
feat(math): implement quaternion slerp optimization
```

### PR 描述模板
```markdown
## 描述
简要描述此PR的目的和实现的功能。

## 变更类型
- [ ] 新功能
- [ ] 错误修复
- [ ] 性能优化
- [ ] 文档更新
- [ ] 代码重构
- [ ] 其他

## 测试
- [ ] 已添加新的测试用例
- [ ] 所有测试通过
- [ ] 手动测试完成

## 检查清单
- [ ] 代码遵循项目编码规范
- [ ] 已更新相关文档
- [ ] 无破坏性变更（如有，请说明）
- [ ] 兼容性考虑（浏览器、版本等）

## 相关Issues
Closes #123
Related to #456

## 截图（如适用）
添加功能截图或性能对比图。

## 其他说明
任何审查者需要知道的额外信息。
```

### PR 审查指南

#### 审查者检查项
1. **功能正确性**
   - 代码是否实现了预期功能
   - 边界条件是否处理正确
   - 错误处理是否完善

2. **代码质量**
   - 是否遵循编码规范
   - 是否有代码重复
   - 是否过度设计

3. **性能影响**
   - 是否引入性能问题
   - 是否有优化空间
   - 内存使用是否合理

4. **测试覆盖**
   - 是否有足够的测试
   - 测试是否覆盖边界情况
   - 测试是否有意义

5. **文档完整性**
   - API文档是否更新
   - 示例是否提供
   - 变更是否记录

#### 审查流程
1. 自动检查通过后开始人工审查
2. 至少需要一个审查者批准
3. 解决所有审查意见
4. 通过所有CI检查
5. 合并到目标分支

## Git Hooks 配置

### Pre-commit Hook
```bash
#!/bin/sh
# .husky/pre-commit
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### Commit-msg Hook
```bash
#!/bin/sh
# .husky/commit-msg
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit $1
```

### Lint-staged 配置
```json
// package.json
{
  "lint-staged": {
    "*.{ts}": [
      "eslint --fix",
      "git add"
    ]
  }
}
```

### Commitlint 配置
```javascript
// .commitlintrc.js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "build",
        "ci",
        "docs",
        "perf",
        "refactor",
        "test",
        "types",
        "style",
        "revert",
        "chore"
      ]
    ],
    "subject-max-length": [2, "always", 72],
    "body-max-line-length": [2, "always", 72]
  }
};
```

## 版本管理

### 语义化版本 (SemVer)
- **主版本号 (MAJOR)**: 不兼容的API变更
- **次版本号 (MINOR)**: 向后兼容的新功能
- **修订号 (PATCH)**: 向后兼容的错误修复

### 发布流程
```bash
# 1. 合并所有准备发布的PR到main
# 2. 更新版本号
pnpm release

# 3. 自动执行：
#    - 更新所有包的版本号
#    - 生成changelog
#    - 创建git tag
#    - 推送到仓库
#    - 发布到npm
```

### 发布分支
```
release/v1.7.0
```
- 用于准备新版本发布
- 只接受错误修复和文档更新
- 发布后合并到`main`和`develop`

## 协作指南

### 开发流程
1. **开始新任务**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/new-feature
   ```

2. **开发过程**
   ```bash
   # 频繁提交，使用有意义的消息
   git add .
   git commit -m "feat: implement basic structure"

   # 定期同步主分支
   git checkout main
   git pull origin main
   git checkout feature/new-feature
   git rebase main
   ```

3. **提交PR**
   ```bash
   git push origin feature/new-feature
   # 在GitHub上创建Pull Request
   ```

4. **合并后清理**
   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/new-feature
   git push origin --delete feature/new-feature
   ```

### 解决冲突
1. **保持主分支更新**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **解决冲突**
   - 手动编辑冲突文件
   - 保留正确的代码
   - 测试确保功能正常
   - 继续rebase

3. **推送更新**
   ```bash
   git push --force-with-lease origin feature/branch
   ```

### 紧急修复流程
```bash
# 1. 从main创建hotfix分支
git checkout -b hotfix/critical-bug main

# 2. 快速修复
git commit -m "hotfix: resolve critical rendering issue"

# 3. 立即发布
git checkout main
git merge hotfix/critical-bug
git tag v1.6.12
git push origin main --tags

# 4. 合并回develop（如果有）
git checkout develop
git merge hotfix/critical-bug
```

## 常见问题

### Q: 什么时候应该创建分支？
A: 开始新功能、修复bug或进行任何重要修改时都应该创建新分支。

### Q: 提交频率如何？
A: 保持小而频繁的提交，每个提交应该是一个逻辑完整的变更。

### Q: 如何处理大型重构？
A: 将重构分解为多个小的、可审查的提交，每个提交都能保持代码可编译。

### Q: Pull Request 太大怎么办？
A: 考虑拆分为多个PR，或者先在功能分支上进行内部重构。

### Q: 如何撤回错误的提交？
A: 使用 `git revert` 创建新提交来撤销，避免修改历史。

---

**注意**: 严格的Git工作流确保代码质量和团队协作效率。所有开发者必须遵守这些规范。