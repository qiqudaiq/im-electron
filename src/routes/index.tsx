import { createHashRouter } from "react-router-dom";
import { MainContentLayout } from "@/layout/MainContentLayout";
import { MainContentWrap } from "@/layout/MainContentWrap";
import { EmptyChat } from "@/pages/chat/EmptyChat";
import { QueryChat } from "@/pages/chat/queryChat";
import Live from '@/pages/live_stream/home';
import LiveHome from '@/pages/live_stream/home/home';
import HostPage from "@/pages/live_stream/host";
import WatchPage from "@/pages/live_stream/watch";
import LuckyWheelPage from '@/pages/lucky-wheel';

import contactRoutes from "./contactRoutes";
import GlobalErrorElement from "./GlobalErrorElement";

const router = createHashRouter([
  {
    path: "/",
    element: <MainContentWrap />,
    errorElement: <GlobalErrorElement />,
    children: [
      // {
      //   index: true,
      //   async lazy() {
      //     const { Home } = await import("@/pages/home");
      //     return { Component: Home };
      //   },
      // },
     
      {
        path: '/lucky-wheel',
        element: <LuckyWheelPage />,
      },
      {
        path: "/",
        element: <MainContentLayout />,
        children: [
         
          {
            path: "/chat",
            async lazy() {
              const { Chat } = await import("@/pages/chat");
              return { Component: Chat };
            },
            children: [
              {
                index: true,
                element: <EmptyChat />,
              },
              {
                path: ":conversationID",
                element: <QueryChat />,
              },
            ],
          },
          {
            path: "contact",
            async lazy() {
              const { Contact } = await import("@/pages/contact");
              return { Component: Contact };
            },
            children: contactRoutes,
          },
        ],
      },
      {
        path: "login",
        async lazy() {
          const { Login } = await import("@/pages/login");
          return { Component: Login };
        }
      },
      {
        path: "/live",
        Component: Live,
        children: [
          {
            index: true,
            Component: LiveHome
          },
          {
            path: 'host',
            Component: HostPage,
          },
          {
            path: 'watch',
            Component: WatchPage,
          }
        ]
      },
      {
        path: "privacy",
        async lazy() {
          const { PrivacyPolicy } = await import("@/pages/privacy");
          return { Component: PrivacyPolicy };
        }
      },
      {
        path: "account-delete",
        async lazy() {
          const { AccountDelete } = await import("@/pages/account-delete");
          return { Component: AccountDelete };
        }
      },
      {
        path: "article",
        async lazy() {
          const { Article } = await import("@/pages/article");
          return { Component: Article };
        }
      }
    ],
  },
]);

export default router;
