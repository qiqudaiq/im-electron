import "../styles/index.css";

import { Theme, ThemePanel } from "@radix-ui/themes";
import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import LiveHome from './components/LiveHome';

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Livestream with LiveKit",
  description: "A sample full-stack application built with LiveKit",
};

export default () => {
  return (
        <Theme
          style={{ width: '100%' }}
          appearance="light"
          accentColor="blue"
          grayColor="slate"
          radius="medium"
        >
           <LiveHome />
          <ThemePanel defaultOpen={false} />
        </Theme>
        
  );
}
