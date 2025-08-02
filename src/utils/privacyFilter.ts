/**
 * 隐私保护日志过滤器
 * 在上传日志前移除或脱敏用户聊天信息和个人隐私数据
 */

interface SensitiveDataPattern {
  pattern: RegExp;
  replacement: string;
  description: string;
}

class PrivacyFilter {
  // 敏感数据匹配模式
  private readonly sensitivePatterns: SensitiveDataPattern[] = [
    // 聊天消息内容
    {
      pattern: /"textElem":\s*{[^}]*"content":\s*"[^"]*"/g,
      replacement: '"textElem":{"content":"[FILTERED_TEXT]"}',
      description: '文本消息内容'
    },
    {
      pattern: /"atTextElem":\s*{[^}]*"text":\s*"[^"]*"/g,
      replacement: '"atTextElem":{"text":"[FILTERED_AT_TEXT]"}',
      description: '@消息内容'
    },
    {
      pattern: /"quoteElem":\s*{[^}]*"text":\s*"[^"]*"/g,
      replacement: '"quoteElem":{"text":"[FILTERED_QUOTE]"}',
      description: '引用消息内容'
    },
    
    // 用户个人信息
    {
      pattern: /"nickname":\s*"[^"]*"/g,
      replacement: '"nickname":"[FILTERED_NICKNAME]"',
      description: '用户昵称'
    },
    {
      pattern: /"groupNickname":\s*"[^"]*"/g,
      replacement: '"groupNickname":"[FILTERED_GROUP_NICKNAME]"',
      description: '群内昵称'
    },
    {
      pattern: /"senderNickname":\s*"[^"]*"/g,
      replacement: '"senderNickname":"[FILTERED_SENDER]"',
      description: '发送者昵称'
    },
    {
      pattern: /"showName":\s*"[^"]*"/g,
      replacement: '"showName":"[FILTERED_NAME]"',
      description: '显示名称'
    },
    
    // 手机号和邮箱
    {
      pattern: /1[3-9]\d{9}/g,
      replacement: '[FILTERED_PHONE]',
      description: '手机号码'
    },
    {
      pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      replacement: '[FILTERED_EMAIL]',
      description: '邮箱地址'
    },
    
    // 文件信息
    {
      pattern: /"fileName":\s*"[^"]*"/g,
      replacement: '"fileName":"[FILTERED_FILENAME]"',
      description: '文件名'
    },
    {
      pattern: /"sourceUrl":\s*"[^"]*"/g,
      replacement: '"sourceUrl":"[FILTERED_URL]"',
      description: '文件URL'
    },
    {
      pattern: /"snapshotUrl":\s*"[^"]*"/g,
      replacement: '"snapshotUrl":"[FILTERED_SNAPSHOT]"',
      description: '缩略图URL'
    },
    
    // 位置信息
    {
      pattern: /"locationElem":\s*{[^}]*}/g,
      replacement: '"locationElem":{"description":"[FILTERED_LOCATION]"}',
      description: '位置信息'
    },
    
    // 自定义消息中的敏感数据
    {
      pattern: /"mark":\s*"[^"]*"/g,
      replacement: '"mark":"[FILTERED_MARK]"',
      description: '备注信息'
    },
    {
      pattern: /"remark":\s*"[^"]*"/g,
      replacement: '"remark":"[FILTERED_REMARK]"',
      description: '备注信息'
    },
    
    // IP地址
    {
      pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
      replacement: '[FILTERED_IP]',
      description: 'IP地址'
    },
    
    // 身份证号码（简单匹配）
    {
      pattern: /\b\d{15}|\d{18}\b/g,
      replacement: '[FILTERED_ID_CARD]',
      description: '身份证号'
    }
  ];

  // 需要完全移除的敏感字段
  private readonly sensitiveFields = [
    'faceURL',           // 头像URL
    'ex',               // 扩展字段
    'attachedInfo',     // 附加信息
    'createTime',       // 避免时间关联
    'serverMsgID',      // 服务器消息ID
    'conversationID'    // 会话ID（部分场景）
  ];

  /**
   * 过滤日志内容，移除敏感信息
   */
  filterLogContent(logContent: string): string {
    let filtered = logContent;
    
    // 应用所有敏感数据模式
    for (const { pattern, replacement, description } of this.sensitivePatterns) {
      const matches = filtered.match(pattern);
      if (matches) {
        console.log(`[隐私过滤] 发现${description}: ${matches.length}处`);
        filtered = filtered.replace(pattern, replacement);
      }
    }
    
    // 移除敏感字段
    for (const field of this.sensitiveFields) {
      const fieldPattern = new RegExp(`"${field}":\\s*[^,}]*[,}]`, 'g');
      filtered = filtered.replace(fieldPattern, '');
    }
    
    return filtered;
  }

  /**
   * 过滤错误对象，移除其中的敏感信息
   */
  filterErrorInfo(errorInfo: any): any {
    if (!errorInfo) return errorInfo;
    
    const filtered = { ...errorInfo };
    
    // 过滤消息内容
    if (filtered.message) {
      filtered.message = this.filterLogContent(filtered.message);
    }
    
    // 过滤堆栈信息
    if (filtered.stack) {
      filtered.stack = this.filterLogContent(filtered.stack);
    }
    
    // 过滤URL中的敏感信息
    if (filtered.url) {
      filtered.url = this.filterUrl(filtered.url);
    }
    
    // 过滤额外信息
    if (filtered.extra && typeof filtered.extra === 'string') {
      filtered.extra = this.filterLogContent(filtered.extra);
    }
    
    return filtered;
  }

  /**
   * 过滤URL中的敏感参数
   */
  private filterUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // 移除敏感查询参数
      const sensitiveParams = ['token', 'userID', 'groupID', 'conversationID'];
      for (const param of sensitiveParams) {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[FILTERED]');
        }
      }
      
      return urlObj.toString();
    } catch {
      // 如果不是有效URL，直接进行文本过滤
      return this.filterLogContent(url);
    }
  }

  /**
   * 检查内容是否包含敏感信息
   */
  containsSensitiveData(content: string): boolean {
    // 检查是否包含消息内容
    const messagePatterns = [
      /"textElem"/,
      /"atTextElem"/,
      /"quoteElem"/,
      /"nickname"/,
      /"content":/
    ];
    
    return messagePatterns.some(pattern => pattern.test(content));
  }

  /**
   * 为开发调试提供详细的过滤报告
   */
  generateFilterReport(originalContent: string, filteredContent: string): {
    originalSize: number;
    filteredSize: number;
    reductionPercentage: number;
    patternsFound: string[];
  } {
    const patternsFound: string[] = [];
    
    for (const { pattern, description } of this.sensitivePatterns) {
      if (pattern.test(originalContent)) {
        patternsFound.push(description);
      }
    }
    
    return {
      originalSize: originalContent.length,
      filteredSize: filteredContent.length,
      reductionPercentage: ((originalContent.length - filteredContent.length) / originalContent.length) * 100,
      patternsFound
    };
  }
}

// 单例实例
export const privacyFilter = new PrivacyFilter();

// 便捷方法
export const filterSensitiveData = (content: string): string => {
  return privacyFilter.filterLogContent(content);
};

export const filterErrorForUpload = (error: any): any => {
  return privacyFilter.filterErrorInfo(error);
};

// 开发环境下提供过滤测试
if (process.env.NODE_ENV === 'development') {
  (window as any).testPrivacyFilter = (content: string) => {
    const filtered = privacyFilter.filterLogContent(content);
    const report = privacyFilter.generateFilterReport(content, filtered);
    
    console.group('🔒 隐私过滤测试');
    console.log('原始内容长度:', report.originalSize);
    console.log('过滤后长度:', report.filteredSize);
    console.log('减少比例:', report.reductionPercentage.toFixed(2) + '%');
    console.log('发现的敏感模式:', report.patternsFound);
    console.log('过滤后内容:', filtered);
    console.groupEnd();
    
    return { filtered, report };
  };
} 