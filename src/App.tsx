import { App as AntdApp, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import zhTW from "antd/locale/zh_TW";
import { Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import { RouterProvider } from "react-router-dom";

import AntdGlobalComp from "./AntdGlobalComp";
import router from "./routes";
import { useUserStore } from "./store";
import { ApiAutoRoute } from "./utils/apiAutoRoute";
import { globalConfig } from "./utils/globalConfig";

function App() {
  const locale = useUserStore((state) => state.appSettings.locale);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });

  // 应用启动时立即进行自动寻路
  useEffect(() => {
    const isElectron = Boolean(window.electronAPI);
    const isProduction = import.meta.env.MODE === "production";

    if (isElectron && isProduction) {
      const initAutoRoute = async () => {
        try {
          // 设置自动寻路环境为生产环境
          ApiAutoRoute.setEnvironment("production");

          // 开始寻路，最多等待10秒
          const optimalHost = await Promise.race([
            ApiAutoRoute.findFastestServer(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
          ]);

          if (optimalHost) {
            // 更新全局配置
            globalConfig.updateDomains(optimalHost);
          } else {
          }
        } catch (error) {
          console.error("💥 自动寻路异常:", error);
        }
      };

      // 异步执行自动寻路，不阻塞应用启动
      initAutoRoute();
    } else {
    }
  }, []);

  const getAntdLocale = () => {
    switch (locale) {
      case "zh-CN":
        return zhCN;
      case "zh-TW":
        return zhTW;
      case "en-US":
      default:
        return enUS;
    }
  };

  return (
    <ConfigProvider
      button={{ autoInsertSpace: false }}
      locale={getAntdLocale()}
      theme={{
        token: { colorPrimary: "#0089FF" },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>loading...</div>}>
          <AntdApp>
            <AntdGlobalComp />
            <RouterProvider router={router} />
          </AntdApp>
        </Suspense>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
