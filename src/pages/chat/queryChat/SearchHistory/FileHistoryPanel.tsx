import { IMSDK } from "@/layout/MainContentWrap";
import { MessageType } from "@openim/wasm-client-sdk";
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, ForwardRefRenderFunction } from "react";
import { useParams } from "react-router-dom";
import { Input, InputRef, Empty, Spin, List } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useDebounceFn } from "ahooks";
import file_icon from "@/assets/images/messageItem/file_icon.png";
import FileDownloadIcon from "@/svg/FileDownloadIcon";
import { bytesToSize, downloadFile, getResourceUrl } from "@/utils/common";
import { formatMessageTime } from "@/utils/imCommon";

interface SearchResultItem {
  clientMsgID: string;
  sendID: string;
  senderNickname: string;
  createTime: number;
  fileElem: {
    fileName: string;
    fileSize: number;
    sourceUrl: string;
  };
  [key: string]: any;
}

// SearchBar组件接口
interface SearchBarHandle {
  clearKeyword: () => void;
  focus: () => void;
}

// ForWardSearchBar组件
const SearchBar: ForwardRefRenderFunction<
  SearchBarHandle,
  { triggerSearch: (value: string) => void }
> = ({ triggerSearch }, ref) => {
  const inputRef = useRef<InputRef>(null);
  const [keyword, setKeyword] = useState("");

  const { run: debounceSearch } = useDebounceFn(triggerSearch, { wait: 300 });

  const onChange = (value: string) => {
    setKeyword(value);
    debounceSearch(value);
  };

  useImperativeHandle(
    ref,
    () => ({
      clearKeyword: () => setKeyword(""),
      focus: () => inputRef.current?.focus(),
    }),
    [],
  );

  return (
    <div className="mb-4">
      <Input
        allowClear
        prefix={<SearchOutlined />}
        value={keyword}
        ref={inputRef}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索文件名"
        size="large"
        className="rounded-lg"
      />
    </div>
  );
};

const ForWardSearchBar = forwardRef(SearchBar);

// 🔥 优化：添加文件搜索缓存
const fileSearchCache = new Map<string, {
  data: SearchResultItem[];
  timestamp: number;
}>();

const CACHE_EXPIRE_TIME = 5 * 60 * 1000; // 5分钟缓存
const FILE_SEARCH_LIMIT = 1000; // 🔥 优化：从10000减少到1000

const FileHistoryPanel: React.FC = () => {
  const searchBarRef = useRef<SearchBarHandle>(null);
  const { conversationID } = useParams();
  const [fileList, setFileList] = useState<{
    data: SearchResultItem[];
    loading: boolean;
    keyword: string;
  }>({
    data: [],
    loading: true, // 初始状态为加载中
    keyword: "",
  });

  // 🔥 优化：生成缓存key
  const getCacheKey = (keyword: string) => `${conversationID}_${keyword}`;

  // 🔥 优化：检查缓存
  const checkCache = (keyword: string) => {
    const cacheKey = getCacheKey(keyword);
    const cached = fileSearchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRE_TIME) {
      return cached.data;
    }
    return null;
  };

  // 🔥 优化：设置缓存
  const setCache = (keyword: string, data: SearchResultItem[]) => {
    const cacheKey = getCacheKey(keyword);
    fileSearchCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  };

  const resetState = () => {
    setFileList({
      data: [],
      loading: false,
      keyword: "",
    });
    searchBarRef.current?.clearKeyword();
  };

  // 搜索文件的函数
  const searchFiles = async (keyword: string = "") => {
    if (!conversationID) return;

    // 🔥 优化：检查缓存
    const cached = checkCache(keyword);
    if (cached) {
      setFileList({
        data: cached,
        loading: false,
        keyword,
      });
      return;
    }

    setFileList((prev) => ({
      ...prev,
      loading: true,
      keyword,
    }));

    try {
      const startTime = performance.now();
      
      const res = await IMSDK.searchLocalMessages({
        conversationID: conversationID ?? "",
        keywordList: keyword ? [keyword] : [],
        messageTypeList: [MessageType.FileMessage],
        searchTimePosition: 0,
        searchTimePeriod: 0,
        pageIndex: 1,
        count: FILE_SEARCH_LIMIT, // 🔥 优化：从10000减少到1000
      });

      const endTime = performance.now();

      const messages = res.data?.searchResultItems?.[0]?.messageList || [];

      let filteredMessages = messages;
      if (keyword) {
        // 如果有关键词，则过滤文件名包含该关键词的消息
        filteredMessages = messages.filter((msg: any) =>
          msg.fileElem?.fileName.toLowerCase().includes(keyword.toLowerCase()),
        );
      }


      // 🔥 优化：设置缓存
      setCache(keyword, filteredMessages as SearchResultItem[]);

      setFileList({
        data: filteredMessages as SearchResultItem[],
        loading: false,
        keyword,
      });
    } catch (error) {
      console.error("❌ 搜索文件失败:", error);
      setFileList({
        data: [],
        loading: false,
        keyword,
      });
    }
  };

  // 初始化时加载所有文件
  useEffect(() => {
    searchFiles();
    searchBarRef.current?.focus();

    // 🔥 优化：清理过期缓存
    const cleanupCache = () => {
      const now = Date.now();
      for (const [key, value] of fileSearchCache.entries()) {
        if (now - value.timestamp > CACHE_EXPIRE_TIME) {
          fileSearchCache.delete(key);
        }
      }
    };

    const interval = setInterval(cleanupCache, CACHE_EXPIRE_TIME);

    return () => {
      resetState();
      clearInterval(interval);
    };
  }, [conversationID]);

  // 触发搜索的回调
  const triggerSearch = (keyword: string) => {
    searchFiles(keyword);
  };

  // 渲染文件列表
  const renderFileList = () => {
    if (fileList.data.length === 0) {
      return (
        <Empty
          className="mt-8"
          description={fileList.keyword ? "未找到相关文件" : "暂无文件"}
        />
      );
    }


    return (
      <List
        dataSource={fileList.data}
        renderItem={(item: SearchResultItem) => (
          <div key={item.clientMsgID} className="my-2 border-none p-0">
            <div className="flex w-full items-center justify-between rounded-md p-3 hover:bg-[#0081cc1a]">
              <div className="relative min-w-[38px]">
                <img width={38} src={file_icon} alt="file" />
                <div
                  className="absolute left-0 top-0 flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-[rgba(0,0,0,.4)] "
                  onClick={() => downloadFile(getResourceUrl(item.fileElem?.sourceUrl))}
                >
                  <FileDownloadIcon percent={0} />
                </div>
              </div>
              <div className="mr-2 flex h-full flex-1 flex-col justify-between overflow-hidden px-2">
                <div className="line-clamp-2 break-all">{item.fileElem.fileName}</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-[var(--sub-text)]">
                    {bytesToSize(item.fileElem.fileSize)}
                  </div>
                  <div className="text-xs text-[var(--sub-text)] ">
                    {item.senderNickname}
                  </div>
                  <div className="text-xs text-[var(--sub-text)] ">
                    {formatMessageTime(item.createTime)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      />
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div>
        <ForWardSearchBar ref={searchBarRef} triggerSearch={triggerSearch} />
      </div>

      <div className="flex-1 overflow-auto">
        {fileList.loading ? (
          <div className="flex items-center justify-center py-8">
            <Spin />
          </div>
        ) : (
          renderFileList()
        )}
      </div>
    </div>
  );
};

export default FileHistoryPanel;
