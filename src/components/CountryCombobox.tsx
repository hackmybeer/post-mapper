import { useState, useMemo } from "react";
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
import { countries } from "@/lib/mapper";

interface CountryComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CountryCombobox({
  value,
  onValueChange,
  placeholder = "Select country...",
  className,
}: CountryComboboxProps) {
  const [open, setOpen] = useState(false);

  const sortedCountries = useMemo(() => {
    return [...countries].sort((a, b) => {
      const labelA = a.germanShortName || a.englishShortName || "";
      const labelB = b.germanShortName || b.englishShortName || "";
      return labelA.localeCompare(labelB, "de", { sensitivity: "base" });
    });
  }, []);

  const selectedCountry = useMemo(
    () => sortedCountries.find((country) => country.alpha3Code === value),
    [sortedCountries, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedCountry
            ? `${selectedCountry.germanShortName || selectedCountry.englishShortName} (${selectedCountry.alpha3Code})`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." className="h-9" />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {sortedCountries.map((country) => {
                const label = country.germanShortName || country.englishShortName;
                const searchValue = `${label} ${country.alpha3Code} ${country.alpha2Code}`.toLowerCase();
                
                return (
                  <CommandItem
                    key={country.alpha3Code}
                    value={searchValue}
                    onSelect={() => {
                      onValueChange(country.alpha3Code);
                      setOpen(false);
                    }}
                  >
                    {label} ({country.alpha3Code})
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === country.alpha3Code ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
