import { useMemo, useCallback, useState } from "react";
import { Download, AlertCircle, Pencil, ChevronDown } from "lucide-react";
import type { MappedAddress } from "@/lib/mapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryCombobox } from "@/components/CountryCombobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MappedTableProps {
  data: MappedAddress[];
  warnings: { [key: number]: string[] };
  editable?: boolean;
  senderRow?: MappedAddress | null;
  onEditRow?: (rowIndex: number, updatedRow: MappedAddress) => void;
  onDeleteRow?: (rowIndex: number) => void;
}

const HEADERS: (keyof MappedAddress)[] = [
  "NAME",
  "ZUSATZ",
  "STRASSE",
  "NUMMER",
  "PLZ",
  "STADT",
  "LAND",
  "ADRESS_TYP",
  "REFERENZ",
];

const ADDRESS_TYPE_OPTIONS: { value: MappedAddress["ADRESS_TYP"]; label: string }[] = [
  { value: "HOUSE", label: "Normale Hausanschrift" },
  { value: "POBOX", label: "Postfach" },
  { value: "MAJORRECIPIENT", label: "Großempfänger" },
];

const MAX_DISPLAY_LENGTH = 50;

const CP1252_CODEPOINT_TO_BYTE: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

const escapeCSVValue = (value: string): string => {
  const escaped = value.replace(/"/g, '""');
  if (escaped.includes(";") || escaped.includes("\n") || escaped.includes('"')) {
    return `"${escaped}"`;
  }
  return escaped;
};

const toCP1252Bytes = (input: string): Uint8Array => {
  const bytes: number[] = [];
  for (const char of input) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    if (code <= 0x7f) {
      bytes.push(code);
      continue;
    }
    if (code >= 0xa0 && code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const mapped = CP1252_CODEPOINT_TO_BYTE[code];
    bytes.push(mapped !== undefined ? mapped : 0x3f);
  }
  return new Uint8Array(bytes);
};

const buildCSVContent = (rows: MappedAddress[], senderRow?: MappedAddress | null): string => {
  const rowsWithSender = senderRow ? [senderRow, ...rows] : rows;
  return [
    HEADERS.join(";"),
    ...rowsWithSender.map((row) =>
      HEADERS.map((header) => escapeCSVValue(String(row[header]))).join(";")
    ),
  ].join("\n");
};

const isGermanLand = (land: string): boolean => {
  const value = land.trim().toUpperCase();
  return value === "DE" || value === "DEU" || value === "GERMANY";
};

const createCSVBlob = (content: string): Blob => {
  const csvBytes = toCP1252Bytes(content);
  const buffer = new ArrayBuffer(csvBytes.length);
  new Uint8Array(buffer).set(csvBytes);
  return new Blob([buffer], { type: "text/csv;charset=windows-1252" });
};

export function MappedTable({
  data,
  warnings,
  editable = false,
  senderRow,
  onEditRow,
  onDeleteRow,
}: MappedTableProps) {
  const warningCount = useMemo(
    () => Object.keys(warnings).length,
    [warnings]
  );

  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [draftRow, setDraftRow] = useState<MappedAddress | null>(null);
  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);
  const [showWarningsOnly, setShowWarningsOnly] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const editingEnabled = editable && Boolean(onEditRow);

  const rowHasMissing = useCallback((row: MappedAddress) => {
    // Only required fields count as missing; optional fields are allowed to be blank.
    const keysToCheck: (keyof MappedAddress)[] = [
      "NAME",
      "STRASSE",
      "NUMMER",
      "PLZ",
      "STADT",
      "LAND",
    ];
    return keysToCheck.some((key) => String(row[key]).trim() === "");
  }, []);

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return data.filter((row) => {
      const rowIndex = row.REFERENZ - 1;
      const rowWarnings = warnings[rowIndex] || [];

      if (showWarningsOnly && rowWarnings.length === 0) return false;
      if (showMissingOnly && !rowHasMissing(row)) return false;

      if (!term) return true;

      return HEADERS.some((header) =>
        String(row[header]).toLowerCase().includes(term)
      );
    });
  }, [data, warnings, showWarningsOnly, showMissingOnly, searchTerm, rowHasMissing]);

  const downloadCSV = useCallback(
    (scope: "all" | "local" | "international") => {
      const targetRows =
        scope === "all"
          ? data
          : data.filter((row) =>
              scope === "local"
                ? isGermanLand(String(row.LAND))
                : !isGermanLand(String(row.LAND))
            );

      const csvContent = buildCSVContent(targetRows, senderRow ?? undefined);
      const blob = createCSVBlob(csvContent);
      
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      const filename =
        scope === "all"
          ? "mapped_addresses_all.csv"
          : scope === "local"
          ? "mapped_addresses_germany.csv"
          : "mapped_addresses_international.csv";
      link.download = filename;
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadMenuOpen(false);
    },
    [data, senderRow]
  );

  if (data.length === 0) {
    return null;
  }

  const startEditing = useCallback(
    (rowIndex: number) => {
      const row = data[rowIndex];
      if (!row) return;
      setEditingRowIndex(rowIndex);
      setDraftRow({ ...row });
    },
    [data]
  );
  const closeEditor = useCallback(() => {
    setEditingRowIndex(null);
    setDraftRow(null);
  }, []);

  const updateDraftField = useCallback(
    (field: keyof MappedAddress, value: string) => {
      setDraftRow((prev) => {
        if (!prev) return prev;
        // When LAND is edited manually, clear any stale unmapped warning flag
        if (field === "LAND") {
          const { LAND_UNMAPPED_ORIGINAL, ...rest } = prev;
          return { ...rest, LAND: value } as MappedAddress;
        }
        return { ...prev, [field]: value };
      });
    },
    []
  );

  const saveDraft = useCallback(() => {
    if (editingRowIndex === null || !draftRow || !onEditRow) return;
    onEditRow(editingRowIndex, draftRow);
    closeEditor();
  }, [editingRowIndex, draftRow, onEditRow, closeEditor]);

  const confirmDelete = useCallback(() => {
    if (deletingRowIndex === null || !onDeleteRow) return;
    onDeleteRow(deletingRowIndex);
    setDeletingRowIndex(null);
  }, [deletingRowIndex, onDeleteRow]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-2">
          <h3 className="text-xl font-semibold tracking-tight">Mapped Data</h3>
          <p className="text-sm text-muted-foreground">
            {data.length} address{data.length !== 1 ? "es" : ""} processed
          </p>
        </div>
        <Popover open={downloadMenuOpen} onOpenChange={setDownloadMenuOpen}>
          <PopoverTrigger asChild>
            <Button size="default" className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download CSV
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={10} collisionPadding={16} className="w-64 p-2">
            <div className="grid gap-1">
              <Button variant="ghost" className="justify-start" onClick={() => downloadCSV("all")}>
                All addresses
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => downloadCSV("local")}>
                German addresses
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => downloadCSV("international")}>
                International addresses
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="w-full max-w-xs"
          placeholder="Search across all columns"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={showWarningsOnly}
            onCheckedChange={(checked) => setShowWarningsOnly(checked === true)}
          />
          Show warnings only
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={showMissingOnly}
            onCheckedChange={(checked) => setShowMissingOnly(checked === true)}
          />
          Show rows with missing fields
        </label>
        {(showWarningsOnly || showMissingOnly || searchTerm) && (
          <span className="text-xs text-muted-foreground">
            Showing {filteredData.length} of {data.length} rows
          </span>
        )}
      </div>

      {warningCount > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="text-yellow-600" />
          <AlertTitle className="text-yellow-800">Validation Warnings</AlertTitle>
          <AlertDescription className="text-yellow-700">
            {warningCount} row{warningCount !== 1 ? "s have" : " has"} validation warnings.
            Hover over the warning icons in the table for details.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {HEADERS.map((header) => (
                <TableHead key={header} className="font-semibold">
                  {header}
                </TableHead>
              ))}
              {editingEnabled && <TableHead className="w-[170px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row) => {
              const rowIndex = row.REFERENZ - 1;
              const rowWarnings = warnings[rowIndex] || [];
              const hasWarnings = rowWarnings.length > 0;

              return (
                <TableRow
                  key={row.REFERENZ}
                  className={hasWarnings ? "bg-destructive/5" : undefined}
                >
                  {HEADERS.map((header) => {
                    const value = String(row[header]);
                    const displayValue = value.length > MAX_DISPLAY_LENGTH
                      ? `${value.substring(0, MAX_DISPLAY_LENGTH)}...`
                      : value;

                    return (
                      <TableCell key={`${row.REFERENZ}-${header}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="truncate min-w-0 flex-1 text-left"
                            title={
                              header === "LAND" && row.LAND_UNMAPPED_ORIGINAL
                                ? `Original value: "${row.LAND_UNMAPPED_ORIGINAL}"`
                                : value
                            }
                          >
                            {displayValue}
                          </span>
                          {header === "LAND" && row.LAND_UNMAPPED_ORIGINAL && (
                            <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-300 cursor-help group">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover text-popover-foreground border border-border px-2 py-1 text-xs shadow-md opacity-0 transition-opacity duration-75 group-hover:opacity-100 group-focus-visible:opacity-100">
                                Original: &quot;{row.LAND_UNMAPPED_ORIGINAL}&quot;
                              </span>
                            </span>
                          )}
                          {hasWarnings && header === "NAME" && (
                            <span
                              className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-300 cursor-pointer group"
                              aria-label={`Warning: ${rowWarnings.join(", ")}`}
                              tabIndex={0}
                            >
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span
                                className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-pre rounded-md bg-popover text-popover-foreground border border-border px-2 py-1 text-xs shadow-md opacity-0 transition-opacity duration-75 group-hover:opacity-100 group-focus-visible:opacity-100"
                              >
                                {rowWarnings.join("\n")}
                              </span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                  {editingEnabled && (
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(rowIndex)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      {onDeleteRow && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingRowIndex(rowIndex)}
                        >
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editingEnabled && (
        <Dialog
          open={editingRowIndex !== null}
          onOpenChange={(open) => {
            if (!open) closeEditor();
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit row</DialogTitle>
              <DialogDescription>
                Update fields for this row. Reference is read-only.
                {editingRowIndex !== null && (warnings[editingRowIndex] || []).length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-700 text-sm">
                    {(warnings[editingRowIndex] || []).map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              {HEADERS.map((header) => (
                <div key={header} className="space-y-2">
                  <Label htmlFor={`edit-${header}`}>
                    {header}
                  </Label>
                  {header === "ADRESS_TYP" ? (
                    <Select
                      value={draftRow ? String(draftRow[header]) : ""}
                      onValueChange={(value) => updateDraftField(header, value)}
                    >
                      <SelectTrigger id={`edit-${header}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ADDRESS_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : header === "LAND" ? (
                    <CountryCombobox
                      value={draftRow ? String(draftRow[header]) : ""}
                      onValueChange={(value) => updateDraftField(header, value)}
                    />
                  ) : (
                    <Input
                      id={`edit-${header}`}
                      value={draftRow ? String(draftRow[header]) : ""}
                      onChange={(e) => updateDraftField(header, e.target.value)}
                      disabled={header === "REFERENZ"}
                    />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={closeEditor}>
                Cancel
              </Button>
              <Button onClick={saveDraft} disabled={!draftRow}>
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={deletingRowIndex !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingRowIndex(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this row? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRowIndex(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
