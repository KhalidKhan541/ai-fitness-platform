import * as React from "react";

interface UseCopyToClipboardResult {
  copiedText: string | null;
  copy: (text: string) => Promise<boolean>;
  reset: () => void;
}

function useCopyToClipboard(): UseCopyToClipboardResult {
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  const copy = React.useCallback(async (text: string): Promise<boolean> => {
    if (!navigator?.clipboard) {
      console.warn("Clipboard API not supported");
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      return true;
    } catch (error) {
      console.error("Failed to copy:", error);
      setCopiedText(null);
      return false;
    }
  }, []);

  const reset = React.useCallback(() => {
    setCopiedText(null);
  }, []);

  return { copiedText, copy, reset };
}

function useCopyToClipboardWithTimeout(timeout: number = 2000): UseCopyToClipboardResult & { isCopied: boolean } {
  const [copiedText, setCopiedText] = React.useState<string | null>(null);
  const [isCopied, setIsCopied] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const copy = React.useCallback(async (text: string): Promise<boolean> => {
    if (!navigator?.clipboard) {
      console.warn("Clipboard API not supported");
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setIsCopied(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, timeout);

      return true;
    } catch (error) {
      console.error("Failed to copy:", error);
      setCopiedText(null);
      setIsCopied(false);
      return false;
    }
  }, [timeout]);

  const reset = React.useCallback(() => {
    setCopiedText(null);
    setIsCopied(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { copiedText, copy, reset, isCopied };
}

export { useCopyToClipboard, useCopyToClipboardWithTimeout };
