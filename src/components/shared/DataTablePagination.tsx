import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DataTablePaginationProps {
  totalItems: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export function DataTablePagination({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50, 100],
}: DataTablePaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2 text-[13px]">
      <div className="flex items-center space-x-2 text-[13px] text-muted-foreground">
        <p>Showing</p>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => {
            onPageSizeChange(Number(value));
            onPageChange(1); // Reset to page 1 on size change
          }}
        >
          <SelectTrigger className="h-8 w-[70px] text-[13px]">
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()} className="text-[13px]">
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p>
          rows per page <span className="hidden sm:inline">&bull; {totalItems > 0 ? startIndex + 1 : 0}-{endIndex} of {totalItems} items</span>
        </p>
      </div>

      <div className="flex items-center space-x-2 text-[13px]">
        <span className="text-[13px] text-muted-foreground sm:hidden">
          {totalItems > 0 ? startIndex + 1 : 0}-{endIndex} of {totalItems}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || totalItems === 0}
          className="h-8 px-2 text-[13px]"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous Page</span>
        </Button>
        <div className="text-[13px] font-medium w-16 text-center">
          {currentPage} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalItems === 0}
          className="h-8 px-2 text-[13px]"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next Page</span>
        </Button>
      </div>
    </div>
  );
}
