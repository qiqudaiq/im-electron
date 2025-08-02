import React, { useState } from "react";
import { JoinDialog } from "./JoinDialog";
import { Button, Flex } from "@radix-ui/themes";
import { t } from "i18next";
import CreateRoomModal from "./CreateRoomModal";
import { message } from "antd";
import { get_self_org_role_permission } from "@/api/login";

export function HomeActions() {
  const [createRoomOpen, setCreateRoomOpen] = useState(false);

  const handleCreateRoom = async () => {
    try {
      // 3. 获取角色权限
      const { data: rolePermissions } = await get_self_org_role_permission();
      const permissions = rolePermissions.map((v: any) => v.permission_code);

      if (permissions?.includes("livestream")) {
        setCreateRoomOpen(true);
      } else {
        message.info(t("noPermission"));
      }
    } catch (error) {
      console.error("创建直播失败:", error);
      // 错误处理已在 Hook 中统一处理
    }
  };

  return (
    <Flex gap="6">
      <CreateRoomModal open={createRoomOpen} setOpen={setCreateRoomOpen} />
      <Button
        onClick={handleCreateRoom}
        size="4"
        className="bg-gradient-to-r from-indigo-500 to-purple-500 px-8 hover:from-indigo-600 hover:to-purple-600"
      >
        {t("placeholder.CreateLiveStreaming")}
      </Button>
      <JoinDialog>
        <Button size="4" variant="soft" className="px-8">
          {t("placeholder.JoinLiveStreaming")}
        </Button>
      </JoinDialog>
    </Flex>
  );
}
