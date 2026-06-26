import React from "react";
import { render } from "@testing-library/react-native";
import { BookViewIcon } from "./BookViewIcon";
import { themes } from "../theme/tokens";

const t = themes.electrum;

describe("BookViewIcon", () => {
  it("renders for each display mode without crashing", () => {
    for (const mode of ["balanced", "asks", "bids"] as const) {
      const { toJSON } = render(<BookViewIcon theme={t} mode={mode} />);
      expect(toJSON()).toBeTruthy();
    }
  });
});
