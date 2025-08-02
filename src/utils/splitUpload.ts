import { v4 as uuidv4 } from 'uuid';
import { getIMToken, getIMUserID } from './storage';
import SparkMD5 from 'spark-md5';
import { globalConfig } from './globalConfig';

// 获取API基础URL - 动态获取以支持自动寻路
const getApiUrl = () => {
  return globalConfig.apiUrl;
};

// API响应处理
const handleResponse = async (res: Response) => {
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  const data = await res.json();
  if (data.errCode !== 0) {
    throw new Error(data.errMsg);
  }
  return data.data;
};

// 获取上传分片大小
export const getUploadPartsize = async (size: number): Promise<{ size: number }> => {
  const token = (await getIMToken()) as string;
  return fetch(`${getApiUrl()}/object/part_size`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      operationID: uuidv4(),
      token: token || '',
    },
    body: JSON.stringify({
      size,
    }),
  }).then(handleResponse);
};

// 获取上传URL
export const getUploadUrl = async (
  params: {
    hash: string;
    size: number;
    partSize: number;
    maxParts: number;
    cause: string;
    name: string;
    contentType: string;
  }
): Promise<{
  url?: string;
  upload: {
    uploadID: string;
    sign: {
      url: string;
      query?: Array<{ key: string; values: string[] }>;
      header?: Array<{ key: string; values: string[] }>;
      parts: Array<{
        url?: string;
        query?: Array<{ key: string; values: string[] }>;
        header?: Array<{ key: string; values: string[] }>;
      }>;
    };
  };
}> => {
  const token = (await getIMToken()) as string;
  return fetch(`${getApiUrl()}/object/initiate_multipart_upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      operationID: uuidv4(),
      token: token || '',
    },
    body: JSON.stringify(params),
  }).then(handleResponse);
};

// 确认上传
export const confirmUpload = async (params: {
  uploadID: string;
  parts: string[];
  cause: string;
  name: string;
  contentType: string;
}): Promise<{ url: string }> => {
  const token = (await getIMToken()) as string;
  return fetch(`${getApiUrl()}/object/complete_multipart_upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      operationID: uuidv4(),
      token: token || '',
    },
    body: JSON.stringify(params),
  }).then(handleResponse);
};

// MIME类型映射
const mimeTypesMap: Record<string, string> = {
  txt: 'text/plain',
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  json: 'application/json',
  csv: 'text/csv',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  heic: 'image/heic',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xml: 'application/xml',
  zip: 'application/zip',
  tar: 'application/x-tar',
  '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar',
  ogg: 'audio/ogg',
  midi: 'audio/midi',
  webm: 'audio/webm',
  avi: 'video/x-msvideo',
  mpeg: 'video/mpeg',
  ts: 'video/mp2t',
  mov: 'video/quicktime',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  mkv: 'video/x-matroska',
  psd: 'image/vnd.adobe.photoshop',
  ai: 'application/postscript',
  eps: 'application/postscript',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  jsonld: 'application/ld+json',
  ics: 'text/calendar',
  sh: 'application/x-sh',
  php: 'application/x-httpd-php',
  jar: 'application/java-archive',
};

// 获取MIME类型
export const getMimeType = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return mimeTypesMap[extension] || 'application/octet-stream';
};

// 获取当前用户ID
const getCurrentUserId = async (): Promise<string> => {
  try {
    const userID = await getIMUserID();
    return userID as string || 'anonymous';
  } catch (error) {
    console.error('获取用户ID失败:', error);
    return 'anonymous';
  }
};



// 分片上传主函数
export const splitUpload = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ url?: string; error?: Error }> => {
  try {
    const userID = await getCurrentUserId();
    const fileName = `${userID}/${Date.now()}_${file.name}`;
    const contentType = getMimeType(file.name);
    
    // 获取分片大小
    const { size: partSize } = await getUploadPartsize(file.size);
    const chunks = Math.ceil(file.size / partSize);
    const chunkGapList: { start: number; end: number }[] = [];
    const chunkHashList: string[] = [];
    const fileSpark = new SparkMD5.ArrayBuffer();
    let currentChunk = 0;

    while (currentChunk < chunks) {
      const start = currentChunk * partSize;
      const end = Math.min(start + partSize, file.size);
      const chunk = file.slice(start, end);
      chunkGapList.push({ start, end });

      // Use a self-invoking function to capture the currentChunk index
      const chunkHash = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(chunk);
        reader.onload = (e) => {
          if (e.target) {
            fileSpark.append(e.target.result as ArrayBuffer);
            resolve(fileSpark.end());
          }
        };
        reader.onerror = (err) => reject(err);
      });
      chunkHashList.push(chunkHash);
      currentChunk++;
    }

    const totalFileHash = chunkHashList.join(',');
    fileSpark.destroy();
    const textSpark = new SparkMD5();
    textSpark.append(totalFileHash);
    const finalHash = textSpark.end();
    
    const { url: finishUrl, upload } = await getUploadUrl({
      hash: finalHash,
      size: file.size,
      partSize,
      maxParts: -1,
      cause: '',
      name: fileName,
      contentType,
    });
    
    if (finishUrl) {
      return { url: finishUrl };
    }

    let uploadParts = upload.sign.parts;
    const signQuery = upload.sign.query;
    const signHeader = upload.sign.header;

    await Promise.all(
      uploadParts.map(async (part, idx) => {
        const url = part.url || upload.sign.url;
        const rawUrl = new URL(url);
        
        if (signQuery) {
          const params = new URLSearchParams(rawUrl.search);
          signQuery.forEach((item) => {
            params.set(item.key, item.values[0]);
          });
          rawUrl.search = params.toString();
        }
        if (part.query) {
          const params = new URLSearchParams(rawUrl.search);
          part.query.forEach((item) => {
            params.set(item.key, item.values[0]);
          });
          rawUrl.search = params.toString();
        }
        
        const putUrl = rawUrl.toString();
        const headers = new Headers();
        
        if (signHeader) {
          signHeader.forEach((item) => {
            headers.set(item.key, item.values[0]);
          });
        }
        if (part.header) {
          part.header.forEach((item) => {
            headers.set(item.key, item.values[0]);
          });
        }
        headers.set('Content-Length', (chunkGapList[idx].end - chunkGapList[idx].start).toString());

        const response = await fetch(putUrl, {
          method: 'PUT',
          headers,
          body: file.slice(chunkGapList[idx].start, chunkGapList[idx].end),
        });

        if (!response.ok) {
          throw new Error(`Failed to upload chunk ${idx + 1}`);
        }
      }),
    );

    const { url } = await confirmUpload({
      uploadID: upload.uploadID,
      parts: chunkHashList,
      cause: '',
      name: fileName,
      contentType,
    });

    return { url };
  } catch (error) {
    return { error: error as Error };
  }
}; 