import React, { useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { useThemeColors } from "../hooks/useThemeColors";

/**
 * Build a compact page list that always keeps first + last reachable.
 * Mobile: 1 … (current-1) current (current+1) … N
 * Desktop: wider window around current, still anchored by 1 and N.
 */
function getVisiblePages(currentPage, totalPages, maxVisiblePages, isMobile) {
  if (totalPages <= 1) return [];

  const neighborCount = isMobile ? 1 : Math.max(1, Math.floor(maxVisiblePages / 2));
  const pageSet = new Set([1, totalPages, currentPage]);

  for (let i = 1; i <= neighborCount; i++) {
    pageSet.add(currentPage - i);
    pageSet.add(currentPage + i);
  }

  // On desktop, keep a denser window so maxVisiblePages still feels generous.
  if (!isMobile) {
    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);
    start = Math.max(1, end - maxVisiblePages + 1);
    for (let i = start; i <= end; i++) pageSet.add(i);
  }

  const sorted = [...pageSet]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const pages = [];
  for (let i = 0; i < sorted.length; i++) {
    const page = sorted[i];
    if (i > 0 && page - sorted[i - 1] > 1) {
      pages.push(page <= currentPage ? "ellipsis-start" : "ellipsis-end");
    }
    pages.push(page);
  }
  return pages;
}

function jumpFromEllipsis(kind, currentPage, totalPages) {
  if (kind === "ellipsis-start") {
    // Jump toward the start without overshooting page 1.
    return Math.max(1, currentPage - Math.max(2, Math.ceil(currentPage / 2)));
  }
  // Jump toward the end.
  const remaining = totalPages - currentPage;
  return Math.min(
    totalPages,
    currentPage + Math.max(2, Math.ceil(remaining / 2)),
  );
}

const PaginationComponent = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
}) => {
  const [screenSize, setScreenSize] = useState("desktop");
  const colors = useThemeColors();

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 480) {
        setScreenSize("small-mobile");
      } else if (width < 640) {
        setScreenSize("mobile");
      } else {
        setScreenSize("desktop");
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  if (totalPages <= 1) {
    return null;
  }

  const isMobile = screenSize !== "desktop";
  const visiblePages = getVisiblePages(
    currentPage,
    totalPages,
    maxVisiblePages,
    isMobile,
  );

  return (
    <div className="w-full overflow-hidden">
      <Pagination className="my-4">
        <PaginationContent className="flex-wrap justify-center gap-1 sm:gap-1">
          {/* Previous button - Desktop */}
          <PaginationItem className="hidden sm:block">
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) {
                  onPageChange(currentPage - 1);
                }
              }}
              className={
                currentPage <= 1
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>

          {/* Previous button - Mobile (icon only) */}
          <PaginationItem className="block sm:hidden">
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) {
                  onPageChange(currentPage - 1);
                }
              }}
              className={
                currentPage <= 1
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
              style={{ color: colors.textSecondary }}
              size="icon"
              aria-label="Go to previous page"
            >
              ←
            </PaginationLink>
          </PaginationItem>

          {visiblePages.map((page, index) => {
            if (page === "ellipsis-start" || page === "ellipsis-end") {
              const target = jumpFromEllipsis(page, currentPage, totalPages);
              return (
                <PaginationItem key={`${page}-${index}`}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(target);
                    }}
                    className="cursor-pointer"
                    style={{ color: colors.textSecondary }}
                    size={isMobile ? "sm" : "icon"}
                    aria-label={
                      page === "ellipsis-start"
                        ? `Jump back to page ${target}`
                        : `Jump forward to page ${target}`
                    }
                    title={`Go to page ${target}`}
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                  </PaginationLink>
                </PaginationItem>
              );
            }

            return (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(page);
                  }}
                  isActive={page === currentPage}
                  className="cursor-pointer"
                  style={{
                    color:
                      page === currentPage ? undefined : colors.textSecondary,
                  }}
                  size={isMobile ? "sm" : "default"}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {/* Next button - Desktop */}
          <PaginationItem className="hidden sm:block">
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) {
                  onPageChange(currentPage + 1);
                }
              }}
              className={
                currentPage >= totalPages
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>

          {/* Next button - Mobile (icon only) */}
          <PaginationItem className="block sm:hidden">
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) {
                  onPageChange(currentPage + 1);
                }
              }}
              className={
                currentPage >= totalPages
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
              style={{ color: colors.textSecondary }}
              size="icon"
              aria-label="Go to next page"
            >
              →
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default PaginationComponent;
