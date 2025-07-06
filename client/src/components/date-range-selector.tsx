import React, { useState } from "react";
import { format, subDays, subMonths } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DateRange {
  from: Date;
  to: Date;
  preset?: "today" | "yesterday" | "7d" | "30d" | "90d" | "custom";
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const DATE_PRESETS = {
  today: { 
    days: 0, 
    label: "Hoje",
    getValue: () => ({ from: new Date(), to: new Date() })
  },
  yesterday: { 
    days: 1, 
    label: "Ontem",
    getValue: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: yesterday, to: yesterday };
    }
  },
  "7d": { 
    days: 7, 
    label: "Últimos 7 dias",
    getValue: () => ({ from: subDays(new Date(), 6), to: new Date() })
  },
  "30d": { 
    days: 30, 
    label: "Últimos 30 dias",
    getValue: () => ({ from: subDays(new Date(), 29), to: new Date() })
  },
  "90d": { 
    days: 90, 
    label: "Últimos 90 dias",
    getValue: () => ({ from: subDays(new Date(), 89), to: new Date() })
  },
  custom: { 
    days: null, 
    label: "Personalizado",
    getValue: () => ({ from: subDays(new Date(), 29), to: new Date() })
  }
};

export function DateRangeSelector({ value, onChange, className }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({
    from: value.from,
    to: value.to
  });

  const handlePresetChange = (preset: string) => {
    if (preset === "custom") {
      onChange({
        ...value,
        preset: "custom"
      });
      return;
    }

    const presetConfig = DATE_PRESETS[preset as keyof typeof DATE_PRESETS];
    if (presetConfig) {
      const newRange = presetConfig.getValue();
      onChange({
        from: newRange.from,
        to: newRange.to,
        preset: preset as DateRange["preset"]
      });
    }
  };

  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) return;
    
    setTempRange(range);
    
    if (range.from && range.to) {
      onChange({
        from: range.from,
        to: range.to,
        preset: "custom"
      });
      setIsOpen(false);
    }
  };

  const formatDateRange = () => {
    if (value.preset && value.preset !== "custom") {
      return DATE_PRESETS[value.preset].label;
    }
    
    if (value.from && value.to) {
      if (format(value.from, "yyyy-MM-dd") === format(value.to, "yyyy-MM-dd")) {
        return format(value.from, "dd/MM/yyyy");
      }
      return `${format(value.from, "dd/MM")} - ${format(value.to, "dd/MM/yyyy")}`;
    }
    
    return "Selecionar período";
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Preset Selector */}
      <Select 
        value={value.preset || "30d"} 
        onValueChange={handlePresetChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(DATE_PRESETS).map(([key, preset]) => (
            <SelectItem key={key} value={key}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom Date Range Popover */}
      {value.preset === "custom" && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !value.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
              <ChevronDown className="ml-auto h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value.from}
              selected={{ from: tempRange.from, to: tempRange.to }}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              disabled={(date) => {
                // Disable future dates
                return date > new Date();
              }}
            />
            <div className="p-3 border-t">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Máximo: 90 dias</span>
                {tempRange.from && tempRange.to && (
                  <span>
                    {Math.abs(
                      Math.ceil(
                        (tempRange.to.getTime() - tempRange.from.getTime()) / 
                        (1000 * 60 * 60 * 24)
                      )
                    ) + 1} dias
                  </span>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}