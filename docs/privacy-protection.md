# 隐私保护功能文档

## 🔒 概述

本项目实现了全面的隐私保护机制，确保用户聊天信息和个人隐私数据在日志记录、错误上传等过程中得到妥善保护。

## 🛡️ 核心功能

### 1. 自动敏感信息过滤

系统会自动识别并过滤以下敏感信息：

- **聊天内容**：文本消息、@消息、引用消息内容
- **个人信息**：用户昵称、群昵称、显示名称
- **联系方式**：手机号码、邮箱地址
- **文件信息**：文件名、文件URL、缩略图URL
- **位置数据**：地理位置信息
- **其他敏感数据**：IP地址、身份证号等

### 2. 技术实现

#### 隐私过滤器（PrivacyFilter）

```typescript
// 核心文件：src/utils/privacyFilter.ts
class PrivacyFilter {
  // 敏感数据匹配模式
  private readonly sensitivePatterns: SensitiveDataPattern[];
  
  // 过滤日志内容
  filterLogContent(logContent: string): string;
  
  // 过滤错误信息
  filterErrorInfo(errorInfo: any): any;
  
  // 检查是否包含敏感信息
  containsSensitiveData(content: string): boolean;
}
```

#### 应用场景

1. **错误日志记录**（`src/utils/errorCapture.ts`）
   - 自动过滤错误信息中的敏感内容
   - 上传前进行隐私保护处理

2. **性能监控**（`src/utils/performanceLogger.ts`）
   - 只收集系统性能指标
   - 过滤User Agent中的用户特征信息

3. **SDK日志上传**
   - 上传前用户确认机制
   - 自动过滤敏感字段

### 3. 过滤规则示例

| 原始内容 | 过滤后内容 | 说明 |
|---------|------------|------|
| `"textElem":{"content":"私密消息"}` | `"textElem":{"content":"[FILTERED_TEXT]"}` | 文本消息内容 |
| `"nickname":"张三"` | `"nickname":"[FILTERED_NICKNAME]"` | 用户昵称 |
| `18888888888` | `[FILTERED_PHONE]` | 手机号码 |
| `user@example.com` | `[FILTERED_EMAIL]` | 邮箱地址 |

## 📋 用户控制机制

### 1. 上传前确认

所有日志上传都需要用户明确同意：

```typescript
// 上传前提示
const confirmUpload = window.confirm(
  '上传日志可能包含聊天相关信息。\n' +
  '我们会自动过滤敏感内容，但建议您谨慎操作。\n' +
  '是否继续上传？'
);
```

### 2. 隐私保护指南

- 用户界面集成隐私保护说明
- 详细说明收集和保护的信息类型
- 提供测试工具验证过滤效果

## 🔧 开发工具

### 测试隐私过滤器

开发环境下提供测试工具：

```javascript
// 浏览器控制台中测试
window.testPrivacyFilter('{"textElem":{"content":"测试消息"}}');
```

### 过滤效果验证

```typescript
const report = privacyFilter.generateFilterReport(originalContent, filteredContent);
console.log('过滤报告:', report);
// 输出：原始大小、过滤后大小、减少比例、发现的敏感模式
```

## 📊 监控与日志

### 过滤统计

系统会记录过滤过程中的统计信息：

```typescript
// 开发环境下会输出详细日志
console.log(`[隐私过滤] 发现文本消息内容: 3处`);
console.log(`[隐私过滤] 发现用户昵称: 2处`);
```

### 性能影响

- 过滤过程对性能影响极小（< 1ms）
- 使用正则表达式进行高效匹配
- 只在必要时进行过滤处理

## 🚀 最佳实践

### 1. 开发阶段

- 使用测试工具验证过滤效果
- 及时更新过滤规则覆盖新的敏感信息类型
- 在代码审查中关注隐私保护

### 2. 生产环境

- 确保所有日志上传都经过过滤
- 定期审查过滤规则的有效性
- 监控用户对隐私保护的反馈

### 3. 新功能开发

在添加新功能时，需要考虑：

1. 是否会产生包含用户隐私的日志？
2. 需要添加新的过滤规则吗？
3. 用户是否需要额外的控制选项？

## 🔄 维护更新

### 添加新的过滤规则

```typescript
// 在 sensitivePatterns 数组中添加新规则
{
  pattern: /新的敏感信息模式/g,
  replacement: '[FILTERED_NEW_TYPE]',
  description: '新类型敏感信息'
}
```

### 测试新规则

```typescript
// 创建测试用例
const testCase = '包含新敏感信息的内容';
const filtered = privacyFilter.filterLogContent(testCase);
console.log('过滤结果:', filtered);
```

## 📞 技术支持

如果您对隐私保护功能有任何疑问：

1. 查看代码注释和文档
2. 使用开发工具进行测试
3. 联系技术支持团队

## 🔐 安全承诺

我们承诺：

- ✅ 持续改进隐私保护技术
- ✅ 及时修复发现的隐私风险
- ✅ 保持透明的隐私保护政策
- ✅ 尊重用户的隐私选择权 