import { requireNativeView } from "expo";
import * as React from "react";

import type { N64CoreViewProps } from "./N64Core.types";

const NativeView: React.ComponentType<N64CoreViewProps> = requireNativeView("N64Core");

export default function N64CoreView(props: N64CoreViewProps) {
  return <NativeView {...props} />;
}
