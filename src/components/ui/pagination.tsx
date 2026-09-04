import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
  disabled?: boolean;
  className?: string;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
  disabled = false,
  className,
}: PaginationProps) {
  const getPageNumbers = React.useMemo(() => {
    const totalNumbers = siblingCount * 2 + 3;
    const totalBlocks = totalNumbers + 2;

    if (totalPages <= totalBlocks) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "dots-right", totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1);
      return [1, "dots-left", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [1, "dots-left", ...middleRange, "dots-right", totalPages];
    }

    return [];
  }, [currentPage, totalPages, siblingCount]);

  const handlePageChange = (page: number) => {
    if (!disabled && page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <nav className={cn("flex items-center gap-1", className)} aria-label="Pagination">
      {showFirstLast && (
        <button
          onClick={() => handlePageChange(1)}
          disabled={disabled || currentPage === 1}
          className="flex h-9 items-center justify-center rounded-md border bg-background px-2 hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        className="flex h-9 items-center justify-center rounded-md border bg-background px-2 hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {getPageNumbers.map((page, index) => {
        if (typeof page === "string") {
          return (
            <span key={page} className="flex h-9 w-9 items-center justify-center">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </span>
          );
        }
        return (
          <button
            key={index}
            onClick={() => handlePageChange(page)}
            disabled={disabled}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-md border px-3 transition-colors",
              page === currentPage
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent hover:text-accent-foreground",
              disabled && "pointer-events-none opacity-50"
            )}
          >
            {page}
          </button>
        );
      })}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        className="flex h-9 items-center justify-center rounded-md border bg-background px-2 hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {showFirstLast && (
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={disabled || currentPage === totalPages}
          className="flex h-9 items-center justify-center rounded-md border bg-background px-2 hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      )}
    </nav>
  );
}

interface PaginationInfoProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  className?: string;
}

function PaginationInfo({ currentPage, totalPages, totalItems, itemsPerPage, className }: PaginationInfoProps) {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      Showing <span className="font-medium">{start}</span> to <span className="font-medium">{end}</span> of{" "}
      <span className="font-medium">{totalItems}</span> results
    </div>
  );
}

interface PageSizeSelectProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
  className?: string;
}

function PageSizeSelect({ pageSize, onPageSizeChange, options = [10, 20, 30, 50], className }: PageSizeSelectProps) {
  return (
    <select
      value={pageSize}
      onChange={(e) => onPageSizeChange(Number(e.target.value))}
      className={cn(
        "flex h-9 items-center rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
    >
      {options.map((size) => (
        <option key={size} value={size}>
          {size} per page
        </option>
      ))}
    </select>
  );
}

export { Pagination, PaginationInfo, PageSizeSelect };
