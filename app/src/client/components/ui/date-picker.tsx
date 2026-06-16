import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useOnClickOutside } from "../../hooks/use-on-click-outside";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { cn } from "../../utils";

type DatePickerProps = {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(containerRef, () => setIsOpen(false));

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-start text-left font-normal",
          !value && "text-muted-foreground",
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? (
          format(value, "PPP", { locale: nl })
        ) : (
          <span>{placeholder}</span>
        )}
      </Button>
      {isOpen && (
        <div className="bg-popover text-popover-foreground absolute z-50 mt-1 rounded-md border shadow-md">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date);
              setIsOpen(false);
            }}
          />
          {value && (
            <div className="border-t px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  onChange(undefined);
                  setIsOpen(false);
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
