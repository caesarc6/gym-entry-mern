import React, { useState, useEffect } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";

const PaginationComponent = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
}) => {
  const [screenSize, setScreenSize] = useState("desktop");

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

  // Reduce maxVisiblePages based on screen size
  const responsiveMaxVisiblePages =
    screenSize === "small-mobile"
      ? 2
      : screenSize === "mobile"
      ? 3
      : maxVisiblePages;
  // Don't render pagination if there's only one page or no pages
  if (totalPages <= 1) {
    return null;
  }

  const getVisiblePages = () => {
    const pages = [];
    const halfVisible = Math.floor(responsiveMaxVisiblePages / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(
      totalPages,
      startPage + responsiveMaxVisiblePages - 1
    );

    // Adjust start page if we're near the end
    if (endPage - startPage < responsiveMaxVisiblePages - 1) {
      startPage = Math.max(1, endPage - responsiveMaxVisiblePages + 1);
    }

    // Always show first page
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push("ellipsis-start");
      }
    }

    // Add visible pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Always show last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push("ellipsis-end");
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

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
              size="icon"
            >
              ←
            </PaginationLink>
          </PaginationItem>

          {/* Page numbers */}
          {visiblePages.map((page, index) => {
            if (page === "ellipsis-start" || page === "ellipsis-end") {
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
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
                  size={screenSize !== "desktop" ? "sm" : "default"}
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
              size="icon"
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
