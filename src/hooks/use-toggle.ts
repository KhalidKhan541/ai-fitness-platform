import * as React from "react";

function useToggle(initialValue = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = React.useState(initialValue);

  const toggle = React.useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  const set = React.useCallback((newValue: boolean) => {
    setValue(newValue);
  }, []);

  return [value, toggle, set];
}

function useToggleMultiple<T extends string>(
  initialValues: Record<T, boolean>
): [Record<T, boolean>, (key: T) => void, (key: T, value: boolean) => void, () => void] {
  const [values, setValues] = React.useState<Record<T, boolean>>(initialValues);

  const toggle = React.useCallback((key: T) => {
    setValues((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const set = React.useCallback((key: T, value: boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetAll = React.useCallback(() => {
    setValues(initialValues);
  }, [initialValues]);

  return [values, toggle, set, resetAll];
}

export { useToggle, useToggleMultiple };
