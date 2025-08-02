import "./index.scss";
import "ckeditor5/ckeditor5.css";

import { ClassicEditor } from "@ckeditor/ckeditor5-editor-classic";
import { Essentials } from "@ckeditor/ckeditor5-essentials";
import { ImageInline, ImageInsert } from "@ckeditor/ckeditor5-image";
import { Mention } from "@ckeditor/ckeditor5-mention";
import { Paragraph } from "@ckeditor/ckeditor5-paragraph";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import { MessageType, SessionType } from "@openim/wasm-client-sdk";
import { GroupMemberItem } from "@openim/wasm-client-sdk/lib/types/entity";
import { useLatest } from "ahooks";
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
import { createRoot } from "react-dom/client";

import OIMAvatar from "@/components/OIMAvatar";
import useGroupMembers from "@/hooks/useGroupMembers";
import { useConversationStore } from "@/store";
import { getResourceUrl } from "@/utils/common";

import EmojiAdapterPlugin from "./plugins/emojiAdapter";

export type CKEditorRef = {
  focus: (moveToEnd?: boolean) => void;
  insertEmoji: (emojiData: EmojiData) => void;
};

interface CKEditorProps {
  value: string;
  placeholder?: string;
  enterWithShift?: boolean;
  onChange?: (value: string) => void;
  onEnter?: () => void;
  onContextMenu?: () => void;
  onMention?: (action: "add" | "remove", memberId: string, memberName: string) => void;
  isGroupChat?: boolean;
  setHtml: any;
  html: string;
}

export interface EmojiData {
  src: string;
  alt: string;
}

// 定义@的成员结构
interface MentionMemberItem {
  id: string;
  name: string;
  faceURL?: string;
}

const keyCodes = {
  delete: 46,
  backspace: 8,
};

const Index: ForwardRefRenderFunction<CKEditorRef, CKEditorProps> = (
  {
    value,
    placeholder,
    enterWithShift,
    onChange,
    onEnter,
    onContextMenu,
    onMention,
    isGroupChat,
    setHtml,
    html,
  },
  ref,
) => {
  const ckEditor = useRef<ClassicEditor | null>(null);
  const latestEnterWithShift = useLatest(enterWithShift);
  const { fetchState, getMemberData } = useGroupMembers();
  const currentGroupInfo = useConversationStore((state) => state.currentGroupInfo);
  const membersListRef = useRef<MentionMemberItem[]>([]);
  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );
  const isGroup = currentConversation?.conversationType === SessionType.Group;

  // 追踪当前会话ID，用于检测会话切换
  const conversationIdRef = useRef(currentConversation?.conversationID);
  // 追踪是否正在等待@功能触发
  const pendingMentionRef = useRef(false);
  
  // 切换会话时重置状态
  useEffect(() => {
    if (currentConversation?.conversationID !== conversationIdRef.current) {
      if (ckEditor.current) {
        resetEditor();
        conversationIdRef.current = currentConversation?.conversationID;
      }
      // 清空成员列表和重置状态
      membersListRef.current = [];
      pendingMentionRef.current = false;
    }
  }, [currentConversation?.conversationID]);

  // 监听群组变化，主动拉取群成员
  useEffect(() => {
    if (isGroup && currentGroupInfo?.groupID) {
      getMemberData(true);
    } else if (!isGroup) {
      membersListRef.current = [];
      pendingMentionRef.current = false;
    }
  }, [isGroup, currentGroupInfo?.groupID]);

  // 自动触发mention功能
  const triggerMentionAfterDataLoad = useCallback(() => {
    if (!ckEditor.current || !pendingMentionRef.current) return;
    
    const currentData = ckEditor.current.getData();
    if (!currentData.includes('@')) {
      pendingMentionRef.current = false;
      return;
    }

    try {
      
      ckEditor.current.model.change(writer => {
        // 清空当前内容
        const root = ckEditor.current!.model.document.getRoot();
        if (!root) return;
        
        const range = writer.createRangeIn(root);
        writer.remove(range);
        
        // 重新插入@符号
        const paragraph = writer.createElement('paragraph');
        writer.insert(paragraph, root);
        
        const atText = writer.createText('@');
        writer.insert(atText, paragraph);
        
        // 设置光标位置到@符号之后
        const position = writer.createPositionAfter(atText);
        writer.setSelection(position);
      });
      
      pendingMentionRef.current = false;
      console.log('[CKEditor] mention功能触发完成');
      
    } catch (error) {
      console.error('[CKEditor] 自动触发mention失败:', error);
      pendingMentionRef.current = false;
    }
  }, []);

  // 同步 fetchState.groupMemberList 到 membersListRef
  useEffect(() => {
    if (isGroup && fetchState.groupMemberList.length > 0) {
      const newMembersList = fetchState.groupMemberList.map((member) => ({
        id: String(member.userID),
        name: member.nickname || member.userID,
        faceURL: member.faceURL,
      }));
      membersListRef.current = newMembersList;
      
      // 如果有待处理的mention，触发它
      if (pendingMentionRef.current) {
        setTimeout(() => triggerMentionAfterDataLoad(), 50);
      }
    } else if (!isGroup) {
      membersListRef.current = [];
      pendingMentionRef.current = false;
    }
  }, [isGroup, fetchState.groupMemberList, triggerMentionAfterDataLoad]);

  // 添加重置编辑器的方法
  const resetEditor = () => {
    const editor = ckEditor.current;
    if (editor) {
      editor.setData("");
      if (onChange) {
        onChange("");
      }
      resetAtMembersList();
    }
  };



  const initPasteListener = () => {
    if (ckEditor.current) {
      const editor = ckEditor.current;
      editor.editing.view.document.on("paste", (evt, data) => {
        const clipboardData = data.dataTransfer;
        const imageFile = Array.from(clipboardData.files).find((file) =>
          file.type.startsWith("image/"),
        );
        if (imageFile) {
          const reader = new FileReader();
          reader.onload = (e) => {
            editor.model.change((writer) => {
              const imageElement = writer.createElement("imageInline", {
                src: e.target.result, // 直接使用Base64
                alt: "local_image",
              });

              const insertPosition = editor.model.document.selection.getFirstPosition();

              if (!insertPosition) return;
              // const index = insertPosition?.path[1];
              // const htmlStr = insertImgToHtmlString(html, index, e.target.result);
              // setHtml(htmlStr);
              writer.insert(imageElement, insertPosition);
              // editor.model.insertContent(imageElement, insertPosition);
            });
          };
          reader.readAsDataURL(imageFile);
          evt.stop();
        }
      });
    }
  };

  const focus = (moveToEnd = false) => {
    const editor = ckEditor.current;

    if (editor) {
      const model = editor.model;
      const view = editor.editing.view;
      const root = model.document.getRoot();
      if (moveToEnd && root) {
        const range = model.createRange(model.createPositionAt(root, "end"));

        model.change((writer) => {
          writer.setSelection(range);
        });
      }
      view.focus();
    }
  };

  const insertEmoji = (emojiData: EmojiData) => {
    const editor = ckEditor.current;
    editor?.model.change((writer) => {
      const emojiElement = writer.createElement(
        "emoji",
        emojiData as Record<string, any>,
      );

      const focusFlag = !editor.data.get().trim();

      const insertPosition = editor.model.document.selection.getFirstPosition();

      if (!insertPosition) return;

      writer.insert(emojiElement, insertPosition);
      setTimeout(() => focus(focusFlag));
    });
  };

  const listenKeydown = (editor: ClassicEditor) => {
    editor.editing.view.document.on(
      "keydown",
      (evt, data) => {
        if (data.keyCode === 13 && latestEnterWithShift.current === data.shiftKey) {
          data.preventDefault();
          evt.stop();
          onEnter?.();
          return;
        }

        if (data.keyCode === 13 && latestEnterWithShift.current) {
          data.preventDefault();
          evt.stop();

          editor.model.change((writer) => {
            const softBreakElement = writer.createElement("softBreak");
            const postion = editor.model.document.selection.getFirstPosition();
            if (!postion) return;
            writer.insert(softBreakElement, postion);
            writer.setSelection(softBreakElement, "after");
          });
          return;
        }

        if (data.keyCode === keyCodes.backspace || data.keyCode === keyCodes.delete) {
          const selection = editor.model.document.selection;
          const hasSelectContent = !editor.model.getSelectedContent(selection).isEmpty;
          const hasEditorContent = Boolean(editor.getData());

          if (!hasEditorContent) {
            return;
          }

          if (hasSelectContent) return;

          if (
            selection.focus?.nodeBefore &&
            (selection.focus?.nodeBefore.hasAttribute("mention") ||
              // @ts-ignore
              selection.focus?.nodeBefore.name === "imageInline" ||
              // @ts-ignore
              selection.focus?.nodeBefore.name === "emoji")
          ) {
            editor.model.change((writer) => {
              if (selection.focus?.nodeBefore) {
                writer.remove(selection.focus.nodeBefore);
              }
            });
            data.preventDefault();
            evt.stop();
          }
        }
      },
      { priority: "high" },
    );

    if (onContextMenu) {
      const editorElement = editor.ui.view.editable.element;
      editorElement?.addEventListener("contextmenu", (event) => {
        onContextMenu();
        event.preventDefault();
      });
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      focus,
      insertEmoji,
      resetEditor,
    }),
    [],
  );

  // 为@成员功能添加监听，当选择@成员时触发回调
  const setupMentionListener = (editor: ClassicEditor) => {
    if (isGroupChat && onMention) {
      editor.model.document.on("change:data", () => {
        const changes = editor.model.document.differ.getChanges();
        changes.forEach((change) => {
          const size = change?.attributes?.size;
          const mention = change?.attributes?.get("mention");

          if (change.type === "insert" && size !== 0 && mention) {
            const userId = mention.userId;
            const memberName = mention.name;
            onMention("add", userId, memberName);
          }

          if (change.type === "remove" && size !== 0 && mention) {
            const userId = mention.userId;
            const memberName = mention.name;
            onMention("remove", userId, memberName);
          }
        });
      });
    }
  };

  // 构建@成员的feed函数
  const memberFeedCallback = useCallback((queryText: string) => {
    if (!isGroupChat || !isGroup) {
      return [];
    }

    // 如果 membersListRef 为空，但 fetchState 有数据，尝试同步
    if (membersListRef.current.length === 0 && fetchState.groupMemberList.length > 0) {
      const newMembersList = fetchState.groupMemberList.map((member) => ({
        id: String(member.userID),
        name: member.nickname || member.userID,
        faceURL: member.faceURL,
      }));
      membersListRef.current = newMembersList;
    }

    // 如果仍然没有数据，主动拉取并标记为待处理
    if (membersListRef.current.length === 0) {
      if (currentGroupInfo?.groupID) {
        getMemberData(true);
        pendingMentionRef.current = true; // 标记有待处理的mention
        return [];
      } else {
        console.warn('[CKEditor] 无法拉取群成员，groupID为空');
        return [];
      }
    }

    // 构建成员列表
    let members = [
      {
        id: "@all",
        name: t("placeholder.all"),
        faceURL: "",
        userId: "AtAllTag",
        text: `@${t("placeholder.all")}`,
      },
      ...membersListRef.current.map((item) => ({
        ...item,
        userId: item.id,
        id: `@${item.id}`,
        text: `@${item.name}`,
      })),
    ];

    // 根据查询文本过滤
    if (queryText) {
      members = members.filter((item) =>
        item.name.toLowerCase().includes(queryText.toLowerCase()),
      );
    }

    return members;
  }, [isGroupChat, isGroup, fetchState.groupMemberList, currentGroupInfo?.groupID, getMemberData]);



  // 自定义渲染@成员的列表项
  const memberRenderItem = (item: any) => {
    // 创建容器元素
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.padding = "4px 8px";
    container.style.gap = "8px";
    container.style.width = "100%";

    // 创建一个用于渲染React组件的容器
    const avatarContainer = document.createElement("div");
    avatarContainer.style.width = "24px";
    avatarContainer.style.height = "24px";
    avatarContainer.style.background = "#0289FA";
    avatarContainer.className = "custom-avatar";

    container.appendChild(avatarContainer);

    // 使用React的createRoot渲染OIMAvatar组件
    const root = createRoot(avatarContainer);

    if (item.id === "@all") {
      // 为@所有人创建特殊标记
      root.render(<OIMAvatar text="@" size={24} bgColor="#0289FA" />);
    } else {
      // 使用OIMAvatar组件渲染用户头像
      const displayName = item.name?.substring(0, 3).toUpperCase() || "";
      root.render(
        <OIMAvatar
          src={getResourceUrl(item.faceURL) || ""}
          text={displayName}
          size={24}
          color="#fff"
          bgColor="#0289FA"
        />,
      );
    }

    // 创建名称元素
    const nameElement = document.createElement("span");
    nameElement.textContent = item.name;
    nameElement.style.fontSize = "14px";
    nameElement.style.flex = "1";
    nameElement.style.overflow = "hidden";
    nameElement.style.textOverflow = "ellipsis";
    nameElement.style.whiteSpace = "nowrap";
    container.appendChild(nameElement);

    return container;
  };

  const resetAtMembersList = () => {
    membersListRef.current = [];

    if (isGroup && currentGroupInfo?.groupID) {
      getMemberData(true);
    }
  };




  // 为了确保mention配置正确应用，使用key强制重新创建编辑器
  const editorKey = `${currentConversation?.conversationID || 'default'}-${isGroup ? 'group' : 'single'}`;
  
  return (
    <CKEditor
      key={editorKey}
      editor={ClassicEditor}
      data={value}
      config={{
        placeholder,
        toolbar: [],
        image: {
          toolbar: [],
          insert: {
            type: "inline",
          },
        },
        plugins: [Essentials, Paragraph, ImageInline, ImageInsert, Mention],
        extraPlugins: [EmojiAdapterPlugin],
        mention: isGroup
          ? {
              feeds: [
                {
                  marker: "@",
                  feed: memberFeedCallback,
                  minimumCharacters: 0,
                  itemRenderer: isGroup ? memberRenderItem : undefined,
                },
              ],
              dropdownLimit: 100000,
              commitKeys: [13, 9], // Enter, Tab
            }
          : {
              feeds: [],
            },
      }}
              onReady={(editor) => {
          ckEditor.current = editor;
          
          // 检查mention插件是否正确加载
          try {
            const mentionPlugin = editor.plugins.get('Mention');
            console.log('[CKEditor] Mention插件状态:', {
              isLoaded: !!mentionPlugin,
              isEnabled: mentionPlugin?.isEnabled
            });
          } catch (error) {
            console.error('[CKEditor] 获取Mention插件失败:', error);
          }
          
          // 检查mention配置
          const config = editor.config.get('mention');
          
          
          // 添加输入事件监听来调试
          editor.model.document.on('change:data', () => {
            const data = editor.getData();
            if (data.includes('@')) {
              console.log('[CKEditor] 检测到@符号，当前内容:', data);
            }
          });
          
          // 监听键盘事件
          editor.editing.view.document.on('keydown', (evt, data) => {
            if (data.domEvent.key === '@') {
              console.log('[CKEditor] 检测到@键按下');
            }
          }, { priority: 'highest' });
          
          listenKeydown(editor);
          setupMentionListener(editor);
          focus(true);
          initPasteListener();
        }}
      onChange={(event, editor) => {
        const data = editor.getData();
        onChange?.(data);
      }}
    />
  );
};
export default memo(forwardRef(Index));
