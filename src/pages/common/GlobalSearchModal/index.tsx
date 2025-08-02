import { SearchOutlined } from "@ant-design/icons";
import {
  FriendUserItem,
  GroupItem,
  SearchMessageResultItem,
} from "@openim/wasm-client-sdk/lib/types/entity";
import { useDebounceFn } from "ahooks";
import { Input, InputRef, Modal, Tabs } from "antd";
import clsx from "clsx";
import { t } from "i18next";
import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";

import ContactPanel from "./ContactPanel";
import DashboardPanel from "./DashboardPanel";
import styles from "./index.module.scss";
import { MessageType } from "@openim/wasm-client-sdk";
import ChatHistoryPanel from "./ChatHistoryPanel";
import FilePanel from "./FilePanel";

export interface SearchData<T> {
  data: T[];
  loading: boolean;
}

export type ChatLogsItem = SearchMessageResultItem & {
  sendTime: number;
  description: string;
};

const TabKeys = [
  "DashBoard",
  "Friends",
  "Groups",
  "Organization",
  "ChatHistory",
  "File",
] as const;

export type TabKey = (typeof TabKeys)[number];

const GlobalSearchModal: ForwardRefRenderFunction<OverlayVisibleHandle, unknown> = (
  _,
  ref,
) => {
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);

  return (
    <Modal
      title={null}
      footer={null}
      centered
      open={isOverlayOpen}
      closable={false}
      width={"70%"}
      destroyOnHidden
      onCancel={closeOverlay}
      styles={{
        mask: {
          opacity: 0,
          transition: "none",
        },
      }}
      className={clsx("no-padding-modal max-w-[800px]", styles["global-search-modal"])}
      maskTransitionName=""
    >
      <GlobalSearchContent closeOverlay={closeOverlay} />
    </Modal>
  );
};

export const GlobalSearchContent = ({ closeOverlay }: { closeOverlay: () => void }) => {
  const [activeKey, setActiveKey] = useState<TabKey>("DashBoard");
  const [friends, setFriends] = useState<SearchData<FriendUserItem>>({
    data: [],
    loading: false,
  });
  const [groups, setGroups] = useState<SearchData<GroupItem>>({
    data: [],
    loading: false,
  });
  const [chatHistory, setChatHistory] = useState<SearchData<any>>({
    data: [],
    loading: false,
  });
  const [file, setFile] = useState<SearchData<any>>({
    data: [],
    loading: false,
  });

  const searchBarRef = useRef<SearchBarHandle>(null);

  useEffect(() => {
    if (location.hash.startsWith("#/contact")) {
      setActiveKey("Friends");
    }
    searchBarRef.current?.focus();
    return () => {
      resetState();
    };
  }, []);

  const toggleTab = useCallback((tab: TabKey) => {
    setActiveKey(tab);
  }, []);

  const resetState = () => {
    setFriends({
      data: [],
      loading: false,
    });
    setGroups({
      data: [],
      loading: false,
    });
    setChatHistory({
      data: [],
      loading: false,
    });
    setFile({
      data: [],
      loading: false,
    });
    setActiveKey("DashBoard");
    searchBarRef.current?.clearKeyword();
  };

  const items = [
    {
      key: "DashBoard",
      label: t("placeholder.overview"),
      children: (
        <DashboardPanel
          friends={friends}
          groups={groups}
          closeOverlay={closeOverlay}
          toggleTab={toggleTab}
        />
      ),
    },
    {
      key: "Friends",
      label: t("placeholder.contacts"),
      children: <ContactPanel {...friends} closeOverlay={closeOverlay} />,
    },
    {
      key: "Groups",
      label: t("placeholder.myGroup"),
      children: <ContactPanel {...groups} closeOverlay={closeOverlay} />,
    },
    // {
    //   key: "Organization",
    //   label: t("placeholder.organization"),
    //   // children: <OrganizationPanel {...groups} closeOverlay={closeOverlay} />,
    // },
    {
      key: "ChatHistory",
      label: t("placeholder.chatHistory"),
      children: <ChatHistoryPanel {...chatHistory} closeOverlay={closeOverlay} />,
    },
    {
      key: "File",
      label: t("placeholder.file"),
      children: <FilePanel {...file} closeOverlay={closeOverlay} />,
    },
  ];

  const searchFriend = async (keyword: string) => {
    setFriends({
      data: [],
      loading: true,
    });
    let friendlist: FriendUserItem[] = [];
    try {
      const { data } = await IMSDK.searchFriends({
        keywordList: [keyword],
        isSearchNickname: true,
        isSearchRemark: true,
        isSearchUserID: true,
      });
      friendlist = data;
    } catch (error) {
      console.error(error);
    }
    setFriends({
      data: friendlist,
      loading: false,
    });
  };

  const searchGroup = async (keyword: string) => {
    setGroups({
      data: [],
      loading: true,
    });
    let groupList: GroupItem[] = [];
    try {
      const { data } = await IMSDK.searchGroups({
        keywordList: [keyword],
        isSearchGroupID: true,
        isSearchGroupName: true,
      });
      groupList = data;
    } catch (error) {
      console.error(error);
    }

    setGroups({
      data: groupList,
      loading: false,
    });
  };

  // 🔥 优化：减少搜索数量并添加缓存
  const GLOBAL_SEARCH_CACHE = new Map<string, {
    data: any[];
    timestamp: number;
  }>();
  
  const CACHE_EXPIRE_TIME = 3 * 60 * 1000; // 3分钟缓存
  const GLOBAL_SEARCH_LIMIT = 500; // 🔥 优化：从10000减少到500

  const getCacheKey = (type: string, keyword: string) => `${type}_${keyword}`;
  
  const checkCache = (type: string, keyword: string) => {
    const cacheKey = getCacheKey(type, keyword);
    const cached = GLOBAL_SEARCH_CACHE.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRE_TIME) {
      return cached.data;
    }
    return null;
  };
  
  const setCache = (type: string, keyword: string, data: any[]) => {
    const cacheKey = getCacheKey(type, keyword);
    GLOBAL_SEARCH_CACHE.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  };

  const searchChatHistory = async (keyword: string) => {
    // 🔥 优化：检查缓存
    const cached = checkCache('chat', keyword);
    if (cached) {
      setChatHistory({
        data: cached,
        loading: false,
      });
      return;
    }

    setChatHistory({
      data: [],
      loading: true,
    });
    let chatList: any[] = [];
    try {
      
      const { data } = await IMSDK.searchLocalMessages({
        conversationID: "",
        keywordList: [keyword],
        senderUserIDList: [],
        messageTypeList: [
          MessageType.TextMessage,
          MessageType.AtTextMessage,
          MessageType.QuoteMessage,
        ],
        searchTimePosition: 0,
        searchTimePeriod: 0,
        pageIndex: 1,
        count: GLOBAL_SEARCH_LIMIT, // 🔥 优化：从10000减少到500
      });


      chatList = data?.searchResultItems || [];
      
      // 🔥 优化：设置缓存
      setCache('chat', keyword, chatList);
    } catch (error) {
      console.error(error);
    }

    setChatHistory({
      data: chatList,
      loading: false,
    });
  };

  const processFileList = (fileList: any[]) => {
    const combinedMessages: any[] = [];
    fileList.forEach((conversation) => {
      const sourceName = conversation.showName;
      const conversationType = conversation.conversationType;

      conversation.messageList.forEach((message: any) => {
        combinedMessages.push({
          ...message,
          sourceName, // 添加来源名称
          conversationType, // 添加会话类型
        });
      });
    });
    combinedMessages.sort((a, b) => b.sendTime - a.sendTime);

    return combinedMessages;
  };

  const searchFile = async (keyword: string) => {
    // 🔥 优化：检查缓存
    const cached = checkCache('file', keyword);
    if (cached) {
      setFile({
        data: cached,
        loading: false,
      });
      return;
    }

    setFile({
      data: [],
      loading: true,
    });
    let fileList: any[] = [];
    let combinedFileList: any[] = [];
    try {
      
      const { data } = await IMSDK.searchLocalMessages({
        conversationID: "",
        keywordList: [keyword],
        senderUserIDList: [],
        messageTypeList: [MessageType.FileMessage],
        searchTimePosition: 0,
        searchTimePeriod: 0,
        pageIndex: 1,
        count: GLOBAL_SEARCH_LIMIT, // 🔥 优化：从10000减少到500
      });
      
      
      fileList = data?.searchResultItems || [];
      combinedFileList = processFileList(fileList);
      
      
      // 🔥 优化：设置缓存
      setCache('file', keyword, combinedFileList);
    } catch (error) {
      console.error(error);
    }
    setFile({
      data: combinedFileList,
      loading: false,
    });
  };
  const triggerSearch = (keyword: string) => {
    if (!keyword) return;
    searchFriend(keyword);
    searchGroup(keyword);
    searchChatHistory(keyword);
    searchFile(keyword);
  };

  return (
    <>
      <ForWardSearchBar ref={searchBarRef} triggerSearch={triggerSearch} />
      <Tabs
        className={styles["search-tab"]}
        defaultActiveKey="DashBoard"
        activeKey={activeKey}
        items={items}
        onChange={toggleTab as (key: string) => void}
      />
    </>
  );
};

export default memo(forwardRef(GlobalSearchModal));

type SearchBarHandle = { clearKeyword: () => void; focus: () => void };

const SearchBar: ForwardRefRenderFunction<
  SearchBarHandle,
  { triggerSearch: (value: string) => void }
> = ({ triggerSearch }, ref) => {
  const inputRef = useRef<InputRef>(null);
  const [keyword, setKeyword] = useState("");

  const { run: debounceSearch } = useDebounceFn(triggerSearch, { wait: 500 });

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
    <>
      <div className="app-drag h-6"></div>
      <div className="px-6">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          value={keyword}
          ref={inputRef}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </>
  );
};

const ForWardSearchBar = memo(forwardRef(SearchBar));
