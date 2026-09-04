import * as React from "react";

function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T | undefined>(undefined);

  React.useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

function usePreviousDistinct<T>(value: T, compare?: (a: T, b: T) => boolean): T | undefined {
  const ref = React.useRef<T | undefined>(undefined);
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const shouldUpdate = compare ? !compare(ref.current as T, value) : ref.current !== value;
    if (shouldUpdate) {
      ref.current = value;
    }
  }, [value, compare]);

  return ref.current;
}

function usePreviousWithIndex<T>(value: T): [T | undefined, number] {
  const ref = React.useRef<{ value: T | undefined; index: number }>({
    value: undefined,
    index: 0,
  });

  React.useEffect(() => {
    ref.current.value = value;
    ref.current.index += 1;
  }, [value]);

  return [ref.current.value, ref.current.index];
}

export { usePrevious, usePreviousDistinct, usePreviousWithIndex };
