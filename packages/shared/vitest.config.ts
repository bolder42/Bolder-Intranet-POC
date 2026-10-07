import { mergeConfig, defineProject } from "vitest/config";
import shared from "@repo/vitest-config";

export default mergeConfig(
  shared,
  defineProject({
    test: {
      name: "shared",
      environment: "node",
    },
  }),
);
