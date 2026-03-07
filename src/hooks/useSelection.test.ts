import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSelection } from "./useSelection";

describe("useSelection", () => {
  const ids = ["a", "b", "c"];

  it("starts with empty selection", () => {
    const { result } = renderHook(() => useSelection(ids));
    expect(result.current.count).toBe(0);
    expect(result.current.isAllSelected).toBe(false);
    expect(result.current.isIndeterminate).toBe(false);
  });

  it("toggles an item on and off", () => {
    const { result } = renderHook(() => useSelection(ids));
    act(() => result.current.toggle("a"));
    expect(result.current.isSelected("a")).toBe(true);
    expect(result.current.count).toBe(1);

    act(() => result.current.toggle("a"));
    expect(result.current.isSelected("a")).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it("selectAll selects all ids", () => {
    const { result } = renderHook(() => useSelection(ids));
    act(() => result.current.selectAll());
    expect(result.current.count).toBe(3);
    expect(result.current.isAllSelected).toBe(true);
    expect(result.current.isIndeterminate).toBe(false);
  });

  it("clear removes all selections", () => {
    const { result } = renderHook(() => useSelection(ids));
    act(() => result.current.selectAll());
    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
  });

  it("isIndeterminate is true when partially selected", () => {
    const { result } = renderHook(() => useSelection(ids));
    act(() => result.current.toggle("a"));
    expect(result.current.isIndeterminate).toBe(true);
    expect(result.current.isAllSelected).toBe(false);
  });

  it("toggleAll selects all when none selected", () => {
    const { result } = renderHook(() => useSelection(ids));
    act(() => result.current.toggleAll());
    expect(result.current.isAllSelected).toBe(true);
  });

  it("toggleAll clears when all selected", () => {
    const { result } = renderHook(() => useSelection(ids));
    act(() => result.current.selectAll());
    act(() => result.current.toggleAll());
    expect(result.current.count).toBe(0);
  });

  it("returns ids as array", () => {
    const { result } = renderHook(() => useSelection(ids));
    act(() => result.current.toggle("b"));
    act(() => result.current.toggle("c"));
    expect(result.current.ids).toEqual(expect.arrayContaining(["b", "c"]));
    expect(result.current.ids).toHaveLength(2);
  });

  it("handles empty allIds", () => {
    const { result } = renderHook(() => useSelection([]));
    expect(result.current.isAllSelected).toBe(false);
    expect(result.current.isIndeterminate).toBe(false);
  });
});
