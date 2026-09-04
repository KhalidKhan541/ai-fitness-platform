import { useState, useCallback, useMemo } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems: number;
}

interface UsePaginationResult {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
  setPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  setPageSize: (size: number) => void;
  goToPage: (page: number) => void;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 10,
  totalItems,
}: UsePaginationOptions): UsePaginationResult {
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize]
  );

  const validPage = Math.min(Math.max(1, page), totalPages);

  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);

  const hasPreviousPage = validPage > 1;
  const hasNextPage = validPage < totalPages;
  const isFirstPage = validPage === 1;
  const isLastPage = validPage === totalPages;

  const setPage = useCallback(
    (newPage: number) => {
      setPageState(Math.min(Math.max(1, newPage), totalPages));
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    setPageState((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setPageState((prev) => Math.max(prev - 1, 1));
  }, []);

  const firstPage = useCallback(() => {
    setPageState(1);
  }, []);

  const lastPage = useCallback(() => {
    setPageState(totalPages);
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const goToPage = useCallback(
    (targetPage: number) => {
      setPageState(Math.min(Math.max(1, targetPage), totalPages));
    },
    [totalPages]
  );

  return {
    page: validPage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasPreviousPage,
    hasNextPage,
    isFirstPage,
    isLastPage,
    setPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    goToPage,
  };
}
