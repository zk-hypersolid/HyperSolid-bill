import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PinPad } from "./PinPad";

function Harness({ onComplete }: { onComplete?: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <PinPad
      value={value}
      onChange={(v) => {
        setValue(v);
        if (v.length === 6) onComplete?.(v);
      }}
    />
  );
}

describe("PinPad", () => {
  it("appends digits and fills dots", () => {
    render(<Harness />);
    expect(screen.queryAllByTestId("pin-dot-filled")).toHaveLength(0);
    fireEvent.press(screen.getByTestId("pin-key-1"));
    fireEvent.press(screen.getByTestId("pin-key-2"));
    expect(screen.queryAllByTestId("pin-dot-filled")).toHaveLength(2);
    expect(screen.queryAllByTestId("pin-dot-empty")).toHaveLength(4);
  });

  it("backspace removes the last digit", () => {
    render(<Harness />);
    fireEvent.press(screen.getByTestId("pin-key-1"));
    fireEvent.press(screen.getByTestId("pin-key-2"));
    fireEvent.press(screen.getByTestId("pin-key-del"));
    expect(screen.queryAllByTestId("pin-dot-filled")).toHaveLength(1);
  });

  it("fires completion at 6 digits and won't exceed length", () => {
    const onComplete = jest.fn();
    render(<Harness onComplete={onComplete} />);
    for (const k of ["1", "2", "3", "4", "5", "6"]) fireEvent.press(screen.getByTestId(`pin-key-${k}`));
    expect(onComplete).toHaveBeenCalledWith("123456");
    // a 7th press is ignored
    fireEvent.press(screen.getByTestId("pin-key-7"));
    expect(screen.queryAllByTestId("pin-dot-filled")).toHaveLength(6);
  });
});
