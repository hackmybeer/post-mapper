import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet } from "lucide-react";
import type { RawRow } from "@/lib/mapper";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onDataLoaded: (data: RawRow[], headers: string[]) => void;
  onError: (error: string) => void;
}

interface SheetSelectorState {
  sheets: string[];
  workbook: XLSX.WorkBook;
}

const SUPPORTED_FILE_TYPES = {
  csv: [".csv"],
  excel: [".xlsx", ".xls"],
  ods: [".ods"],
} as const;

const ACCEPTED_EXTENSIONS = Object.values(SUPPORTED_FILE_TYPES)
  .flat()
  .join(",");

export function FileUpload({ onDataLoaded, onError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sheetSelector, setSheetSelector] = useState<SheetSelectorState | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = useCallback(
    (file: File) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setIsLoading(false);
          if (results.data && results.data.length > 0) {
            const headers = results.meta.fields ?? Object.keys(results.data[0] ?? {});
            onDataLoaded(results.data as RawRow[], headers);
          } else {
            onError("No data found in CSV file");
          }
        },
        error: (error) => {
          setIsLoading(false);
          onError(`CSV parsing error: ${error.message}`);
        },
      });
    },
    [onDataLoaded, onError]
  );

  const parseExcel = useCallback(
    async (file: File) => {
      try {
        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            const arrayBuffer = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(arrayBuffer, {
              type: "array",
              cellFormula: false,
              cellStyles: false,
            });

            const sheetNames = workbook.SheetNames;

            if (sheetNames.length === 0) {
              onError("No sheets found in file");
              setIsLoading(false);
              return;
            }

            if (sheetNames.length === 1) {
              const sheet = sheetNames[0];
              const worksheet = workbook.Sheets[sheet];

              const headerRows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
                header: 1,
                range: 0,
                blankrows: false,
                defval: "",
              }) as string[][];
              const firstRow = headerRows[0] ?? [];
              const headers = firstRow
                .map((h) => (h == null ? "" : String(h).trim()))
                .filter((h) => h !== "");

              const rows = XLSX.utils.sheet_to_json<RawRow>(worksheet, {
                defval: "",
              });

              const finalHeaders = headers.length > 0
                ? headers
                : Object.keys(rows[0] ?? {});

              if (rows.length > 0) {
                onDataLoaded(rows, finalHeaders);
              } else {
                onError("No data found in file");
              }
              setIsLoading(false);
            } else {
              setSheetSelector({ sheets: sheetNames, workbook });
              setIsLoading(false);
            }
          } catch (error) {
            onError(
              `File parsing error: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
            setIsLoading(false);
          }
        };
        
        reader.readAsArrayBuffer(file);
      } catch (error) {
        onError(
          `Error reading file: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        setIsLoading(false);
      }
    },
    [onDataLoaded, onError]
  );

  const parseFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      const fileName = file.name.toLowerCase();

      try {
        if (fileName.endsWith(".csv")) {
          parseCSV(file);
        } else if (
          fileName.endsWith(".xlsx") ||
          fileName.endsWith(".xls") ||
          fileName.endsWith(".ods")
        ) {
          await parseExcel(file);
        } else {
          setIsLoading(false);
          onError(
            "Unsupported file format. Please use CSV, Excel (.xlsx, .xls), or ODS files."
          );
        }
      } catch (error) {
        setIsLoading(false);
        onError(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    [parseCSV, parseExcel, onError]
  );

  const handleSheetSelection = useCallback(
    async (workbook: XLSX.WorkBook, sheetName: string) => {
      try {
        const worksheet = workbook.Sheets[sheetName];

        const headerRows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
          header: 1,
          range: 0,
          blankrows: false,
          defval: "",
        }) as string[][];
        const firstRow = headerRows[0] ?? [];
        const headers = firstRow
          .map((h) => (h == null ? "" : String(h).trim()))
          .filter((h) => h !== "");

        const rows = XLSX.utils.sheet_to_json<RawRow>(worksheet, {
          defval: "",
        });

        const finalHeaders = headers.length > 0
          ? headers
          : Object.keys(rows[0] ?? {});

        if (rows.length > 0) {
          onDataLoaded(rows, finalHeaders);
          setSheetSelector(null);
        } else {
          onError("No data found in selected sheet");
        }
      } catch (error) {
        onError(
          `File parsing error: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
    [onDataLoaded, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        parseFile(files[0]);
      }
    },
    [parseFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files;
      if (files && files.length > 0) {
        parseFile(files[0]);
      }
    },
    [parseFile]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Dialog
        open={!!sheetSelector}
        onOpenChange={(open) => !open && setSheetSelector(null)}
      >
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Sheet</DialogTitle>
            <DialogDescription>
              The file contains multiple sheets. Please select which one to use.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4 pr-1 overflow-y-auto overflow-x-visible max-h-[60vh]">
            {sheetSelector?.sheets.map((sheet) => (
              <Button
                key={sheet}
                onClick={() => handleSheetSelection(sheetSelector.workbook, sheet)}
                variant="outline"
                className="justify-start"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {sheet}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={cn(
          "relative flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-12 text-center transition-colors cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          !isDragging && "border-muted-foreground/25 hover:border-primary/50",
          isLoading && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileSelect}
          disabled={isLoading}
          className="hidden"
          aria-label="Upload file"
        />

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <p className="text-lg font-medium">
            {isLoading ? "Processing file..." : "Upload your file"}
          </p>
          <p className="text-sm text-muted-foreground">
            Drag and drop or click to browse
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Supported formats: CSV, Excel (.xlsx, .xls), ODS
        </p>
      </div>
    </div>
  );
}
