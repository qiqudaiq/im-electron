import { MessageType } from "@openim/wasm-client-sdk";
import { useParams } from "react-router-dom";
import { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle, ForwardRefRenderFunction } from "react";
import { useDebounceFn } from "ahooks";
import { Input, InputRef } from "antd";
import { SearchOutlined } from "@ant-design/icons";

import { emit } from "@/utils/events";
import { IMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";

import ChatHistoryList from "./ChatHistoryList";

interface SearchResultItem {
  clientMsgID: string;
  [key: string]: any;
}

// SearchBar组件接口
export interface SearchBarHandle {
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
        placeholder="搜索聊天记录"
        size="large"
        className="rounded-lg"
      />
    </div>
  );
};

const ForWardSearchBar = forwardRef(SearchBar);

// 🔥 优化：添加搜索缓存
const searchCache = new Map<string, {
  data: SearchResultItem[];
  timestamp: number;
  hasMore: boolean;
}>();

const CACHE_EXPIRE_TIME = 5 * 60 * 1000; // 5分钟缓存
const SEARCH_PAGE_SIZE = 100; // 🔥 优化：从5000减少到100
const MAX_SEARCH_RESULTS = 1000; // 🔥 优化：最大搜索结果限制

const ChatHistoryPanel = ({ closeOverlay }: { closeOverlay: () => void }) => {
  const searchBarRef = useRef<SearchBarHandle>(null);
  const { conversationID } = useParams();
  const selfUserID = useUserStore((state) => state.selfInfo.userID);
  const [chatList, setChatList] = useState<{
    data: SearchResultItem[];
    loading: boolean;
    keyword: string;
    hasMore?: boolean;
    page?: number;
  }>({
    data: [],
    loading: false,
    keyword: "",
    hasMore: true,
    page: 1,
  });

  // 🔥 优化：生成缓存key
  const getCacheKey = (keyword: string, page: number) => 
    `${conversationID}_${keyword}_${page}`;

  // 🔥 优化：检查缓存
  const checkCache = (keyword: string, page: number) => {
    const cacheKey = getCacheKey(keyword, page);
    const cached = searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRE_TIME) {
      return cached;
    }
    return null;
  };

  // 🔥 优化：设置缓存
  const setCache = (keyword: string, page: number, data: SearchResultItem[], hasMore: boolean) => {
    const cacheKey = getCacheKey(keyword, page);
    searchCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      hasMore,
    });
  };

  const resetState = () => {
    setChatList({
      data: [],
      loading: false,
      keyword: "",
      hasMore: true,
      page: 1,
    });
    searchBarRef.current?.clearKeyword();
  };

  useEffect(() => {
    searchBarRef.current?.focus();
    return () => {
      resetState();
    };
  }, []);

  // 🔥 优化：简化的搜索逻辑，移除不必要的预加载
  const performSearch = async (keyword: string, page: number = 1, isLoadMore = false) => {
    if (!keyword || !conversationID) return;


    // 🔥 优化：检查缓存
    const cached = checkCache(keyword, page);
    if (cached && !isLoadMore) {
      setChatList(prev => ({
        ...prev,
        data: page === 1 ? cached.data : [...prev.data, ...cached.data],
        loading: false,
        hasMore: cached.hasMore,
        page,
      }));
      return;
    }

    setChatList(prev => ({ 
      ...prev, 
      loading: true,
      keyword,
      page,
    }));

    try {
      // 🔥 优化：直接搜索，移除预加载逻辑
      const searchParams = {
        conversationID: conversationID,
        keywordList: [keyword],
        messageTypeList: [MessageType.TextMessage, MessageType.AtTextMessage],
        searchTimePosition: 0,
        searchTimePeriod: 0,
        pageIndex: page,
        count: SEARCH_PAGE_SIZE, // 🔥 优化：只获取100条
      };

      const startTime = performance.now();
      const { data } = await IMSDK.searchLocalMessages(searchParams);
      const endTime = performance.now();
      

      const newMessages = data?.searchResultItems?.[0]?.messageList || [];
      const hasMore = newMessages.length >= SEARCH_PAGE_SIZE && 
                     (isLoadMore ? chatList.data.length : 0) + newMessages.length < MAX_SEARCH_RESULTS;


      // 🔥 优化：设置缓存
      setCache(keyword, page, newMessages, hasMore);

      setChatList(prev => ({
        ...prev,
        data: page === 1 ? newMessages : [...prev.data, ...newMessages],
        loading: false,
        hasMore,
        page,
      }));

    } catch (error) {
      console.error("❌ 搜索失败:", error);
      setChatList(prev => ({ 
        ...prev, 
        loading: false, 
        hasMore: false 
      }));
    }
  };

  // 🔥 优化：防抖搜索
  const { run: debouncedSearch } = useDebounceFn(
    (keyword: string) => performSearch(keyword, 1, false),
    { wait: 300 }
  );

  const triggerSearch = (keyword: string) => {
    if (!keyword.trim()) {
      resetState();
      return;
    }
    debouncedSearch(keyword);
  };

  // 🔥 优化：加载更多
  const loadMore = async () => {
    if (!chatList.keyword || !chatList.hasMore || chatList.loading || !conversationID) {
      return;
    }

    await performSearch(chatList.keyword, (chatList.page || 1) + 1, true);
  };

  // 🔥 修复：修正函数参数类型，onItemClick接受messageID字符串
  const handleMessageClick = async (messageID: string) => {
    
    // 从chatList中找到对应的完整消息对象
    const searchMessage = chatList.data.find(item => item.clientMsgID === messageID);
    if (!searchMessage) return;
    
    // 🔥 修复：使用类型断言，因为LOCATE_TO_TARGET_LINE主要只需要clientMsgID
    emit("LOCATE_TO_TARGET_LINE", searchMessage as any);
    closeOverlay();
  };

  // 🔥 优化：清理过期缓存
  useEffect(() => {
    const cleanupCache = () => {
      const now = Date.now();
      for (const [key, value] of searchCache.entries()) {
        if (now - value.timestamp > CACHE_EXPIRE_TIME) {
          searchCache.delete(key);
        }
      }
    };

    const interval = setInterval(cleanupCache, CACHE_EXPIRE_TIME);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div>
        <ForWardSearchBar ref={searchBarRef} triggerSearch={triggerSearch} />
      </div>

      <div className="flex-1 overflow-auto">
        <ChatHistoryList
          loading={chatList.loading}
          keyword={chatList.keyword}
          dataSource={chatList.data}
          onItemClick={handleMessageClick}
          hasMore={chatList.hasMore}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
};

export default ChatHistoryPanel;
