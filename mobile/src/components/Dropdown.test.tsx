import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Dropdown } from "./Dropdown";

const OPTS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Bravo" },
  { value: "c", label: "Charlie" },
];

function Harness({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState("a");
  return (
    <Dropdown
      testID="dd"
      value={value}
      options={OPTS}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe("Dropdown", () => {
  it("shows the current option's label and hides the list until opened", () => {
    render(<Harness />);
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.queryByText("Bravo")).toBeNull();
  });

  it("opens on press, selects an option, and collapses again", () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.press(screen.getByTestId("dd"));
    expect(screen.getByTestId("dd-opt-b")).toBeTruthy();
    fireEvent.press(screen.getByTestId("dd-opt-b"));
    expect(onChange).toHaveBeenCalledWith("b");
    // collapsed: the other options are gone, control reflects the new value
    expect(screen.queryByTestId("dd-opt-c")).toBeNull();
    expect(screen.getByText("Bravo")).toBeTruthy();
  });
});
