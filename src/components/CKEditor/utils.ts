export const replaceEmoji2Str = (text: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");

  const emojiEls: HTMLImageElement[] = Array.from(doc.querySelectorAll(".emojione"));
  emojiEls.map((face) => {
    // @ts-ignore
    const escapedOut = face.outerHTML.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    text = text.replace(new RegExp(escapedOut, "g"), face.alt);
  });
  return text;
};

export const getCleanText = (html: string) => {
  let text = replaceEmoji2Str(html);
  text = text.replace(/<\/p><p>/g, "\n");
  text = text.replace(/<br\s*[/]?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  text = convertChar(text);
  text = decodeHtmlEntities(text);
  return text.trim();
};

function cleanBase64(base64Str: string): string {
  return base64Str.split(",")[1] || base64Str; // 兼容有无前缀的情况
}

function decodeBase64(cleanedBase64: string): Uint8Array {
  const byteChars = atob(cleanedBase64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i); // 逐字符转换编码
  }
  return byteArray;
}

export const base64ToImageFile = (
  base64Str: string,
  fileName = "image.png",
): File | null => {
  try {
    // 1. 清理数据
    const [prefix, data] = base64Str.includes(",")
      ? base64Str.split(",")
      : ["", base64Str];

    // 2. 提取MIME类型
    const mimeType = prefix.match(/:(.*?);/)?.[1] || "image/png";

    // 3. 解码二进制
    const byteArray = decodeBase64(data);

    // 4. 创建File对象（优先使用Blob兼容方案）
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], fileName, {
      type: mimeType,
      lastModified: new Date().getTime(),
    });
  } catch (error) {
    console.error("转换失败:", error);
    return null;
  }
};

export const getImgTags = (htmlStr: string) => {
  const regex = /<\s*img\s+([^>]*?)>/gi; // 匹配所有img标签
  const results = [];
  let match;

  // 循环匹配所有img标签
  while ((match = regex.exec(htmlStr)) !== null) {
    const fullTag = match[0];
    const startIndex = match.index; // 标签起始位置
    // const endIndex = startIndex + fullTag.length; // 标签结束位置

    // 提取src属性值
    const srcMatch = /src\s*=\s*(["'])(.*?)\1/i.exec(fullTag);
    const srcValue = srcMatch ? srcMatch[2] : null;

    results.push({
      // tag: fullTag,
      start: startIndex,
      // end: endIndex,
      src: srcValue,
    });
  }

  return results;
};

let textAreaDom: HTMLTextAreaElement | null = null;
const decodeHtmlEntities = (text: string) => {
  if (!textAreaDom) {
    textAreaDom = document.createElement("textarea");
  }
  textAreaDom.innerHTML = text;
  return textAreaDom.value;
};

export const convertChar = (text: string) => text.replace(/&nbsp;/gi, " ");

export const getCleanTextExceptImg = (html: string) => {
  html = replaceEmoji2Str(html);

  const regP = /<\/p><p>/g;
  html = html.replace(regP, "</p><br><p>");

  const regBr = /<br\s*\/?>/gi;
  html = html.replace(regBr, "\n");

  const regWithoutHtmlExceptImg = /<(?!img\s*\/?)[^>]+>/gi;
  return html.replace(regWithoutHtmlExceptImg, "");
};
