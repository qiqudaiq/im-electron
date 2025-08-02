import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { secondsToMS } from "@/utils/common";

export interface CounterHandle {
  getDuration: () => number;
}

const Counter: ForwardRefRenderFunction<
  CounterHandle,
  {
    isConnected: boolean;
    className?: string;
  }
> = ({ isConnected, className }, ref) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConnected) {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isConnected]);

  useImperativeHandle(ref, () => ({
    getDuration: () => duration
  }));

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={className}>
      <span className="text-white">{formatTime(duration)}</span>
    </div>
  );
};

export const ForwardCounter = memo(forwardRef(Counter));
