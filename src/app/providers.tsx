"use client";

import { Provider } from "react-redux";
import { store } from "@/redux/store";
import type { PropsWithChildren } from "react";

export default function Providers({ children }: PropsWithChildren) {
  return <Provider store={store}>{children}</Provider>;
}
