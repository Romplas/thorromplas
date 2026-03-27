import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  renderOption?: (
    option: SearchableSelectOption,
    helpers: { close: () => void }
  ) => React.ReactNode;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Pesquisar...",
  disabled = false,
  className,
  renderOption,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);
  const selectedItemRef = React.useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  // Ao abrir o dropdown com valor selecionado, preenche a pesquisa para filtrar e mostrar o item
  React.useEffect(() => {
    if (open) {
      if (value && selectedLabel) {
        setSearchValue(selectedLabel);
      } else {
        setSearchValue("");
      }
    } else {
      setSearchValue("");
    }
  }, [open, value, selectedLabel]);

  // Rola até o item selecionado quando a lista é exibida
  React.useEffect(() => {
    if (open && value && selectedItemRef.current && listRef.current) {
      const timer = requestAnimationFrame(() => {
        selectedItemRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [open, value, searchValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList ref={listRef}>
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  ref={value === option.value ? selectedItemRef : undefined}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {renderOption ? (
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate">{option.label}</span>
                      <div className="shrink-0">
                        {renderOption(option, { close: () => setOpen(false) })}
                      </div>
                    </div>
                  ) : (
                    option.label
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
