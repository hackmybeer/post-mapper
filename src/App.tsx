import { useState, useCallback, useMemo, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { MappedTable } from "@/components/MappedTable";
import { CountryCombobox } from "@/components/CountryCombobox";
import { mapData, validateMaxLengths, DEFAULT_COLUMN_MAPPING } from "@/lib/mapper";
import type { MappedAddress, RawRow } from "@/lib/mapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Trash2 } from "lucide-react";
import "./App.css";

type TargetField = {
  key:
    | "salutation"
    | "first_name"
    | "last_name"
    | "street"
    | "address_addition"
    | "postal_code"
    | "city"
    | "country";
  label: string;
  required?: boolean;
};

const TARGET_FIELDS: TargetField[] = [
  { key: "salutation", label: "Anrede" },
  { key: "first_name", label: "Vorname", required: true },
  { key: "last_name", label: "Nachname", required: true },
  { key: "street", label: "Straße", required: true },
  { key: "address_addition", label: "Adresszusatz" },
  { key: "postal_code", label: "PLZ", required: true },
  { key: "city", label: "Ort", required: true },
  { key: "country", label: "Land", required: true },
];

const DEFAULT_SENDER: MappedAddress = {
  NAME: "",
  ZUSATZ: "",
  STRASSE: "",
  NUMMER: "",
  PLZ: "",
  STADT: "",
  LAND: "DEU",
  ADRESS_TYP: "HOUSE",
  REFERENZ: 0,
};

const STORAGE_KEY = "deutsche-post-mail-labels-data";

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load from localStorage:", error);
  }
  return null;
}

function App() {
  const stored = useMemo(() => loadFromStorage(), []);

  const [mappedData, setMappedData] = useState<MappedAddress[]>(stored?.mappedData || []);
  const [rawData, setRawData] = useState<RawRow[]>(stored?.rawData || []);
  const [sender, setSender] = useState<MappedAddress | null>(stored?.sender || DEFAULT_SENDER);
  const [headers, setHeaders] = useState<string[]>(stored?.headers || []);
  const [columnSelections, setColumnSelections] = useState<
    Partial<Record<TargetField["key"], string | undefined>>
  >(stored?.columnSelections || {});
  const [warnings, setWarnings] = useState<{ [key: number]: string[] }>({});
  const [senderWarnings, setSenderWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSenderDialog, setShowSenderDialog] = useState(false);

  const hasData = useMemo(() => mappedData.length > 0, [mappedData.length]);

  const buildWarnings = useCallback((rows: MappedAddress[]) => {
    const warningsMap: { [key: number]: string[] } = {};
    const refIndexMap = new Map<number, number[]>();

    rows.forEach((row, index) => {
      const rowWarnings = validateMaxLengths(row);
      if (rowWarnings.length > 0) {
        warningsMap[index] = rowWarnings;
      }

      const indices = refIndexMap.get(row.REFERENZ) ?? [];
      indices.push(index);
      refIndexMap.set(row.REFERENZ, indices);
    });

    refIndexMap.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach((idx) => {
          warningsMap[idx] = [
            ...(warningsMap[idx] ?? []),
            "REFERENZ must be unique",
          ];
        });
      }
    });

    return warningsMap;
  }, []);

  const buildMapping = useCallback(
    (selections: Partial<Record<TargetField["key"], string | undefined>>) => {
      const mapping: Record<string, string> = {};
      Object.entries(selections).forEach(([target, source]) => {
        if (source) {
          mapping[source] = target;
        }
      });
      return mapping;
    },
    []
  );

  const initSelections = useCallback((incomingHeaders: string[]) => {
    const lowerHeaders = incomingHeaders.map((h) => h.toLowerCase());
    const selections: Partial<Record<TargetField["key"], string>> = {};

    TARGET_FIELDS.forEach((field) => {
      // try default mapping key
      const matchingSource = Object.entries(DEFAULT_COLUMN_MAPPING).find(
        ([_sourceKey, targetKey]) => targetKey === field.key
      );

      if (matchingSource) {
        const [sourceKey] = matchingSource;
        const idx = lowerHeaders.indexOf(sourceKey.toLowerCase());
        if (idx >= 0) {
          selections[field.key] = incomingHeaders[idx];
          return;
        }
      }

      // fallback: try exact target name
      const idxTarget = lowerHeaders.indexOf(field.key.toLowerCase());
      if (idxTarget >= 0) {
        selections[field.key] = incomingHeaders[idxTarget];
      }
    });

    return selections;
  }, []);

  const recalcMapping = useCallback(
    (
      data: RawRow[],
      selections: Partial<Record<TargetField["key"], string | undefined>>
    ) => {
      if (!data.length) {
        setMappedData([]);
        setWarnings({});
        return;
      }

      const missingRequired = TARGET_FIELDS.filter(
        (f) => f.required && !selections[f.key]
      );

      if (missingRequired.length > 0) {
        setError(
          `Please map required fields: ${missingRequired
            .map((f) => f.label)
            .join(", ")}`
        );
        setMappedData([]);
        setWarnings({});
        return;
      }

      setError("");
      const mapping = buildMapping(selections);
      const mapped = mapData(data, mapping);

      setMappedData(mapped);
      setWarnings(buildWarnings(mapped));
    },
    [buildMapping, buildWarnings]
  );

  const handleDataLoaded = useCallback(
    (data: RawRow[], incomingHeaders: string[]) => {
      setRawData(data);
      setHeaders(incomingHeaders);
      const selections = initSelections(incomingHeaders);
      setColumnSelections(selections);
      recalcMapping(data, selections);
    },
    [initSelections, recalcMapping]
  );

  useEffect(() => {
    recalcMapping(rawData, columnSelections);
  }, [rawData, columnSelections, recalcMapping]);

  useEffect(() => {
    if (sender) {
      setSenderWarnings(validateMaxLengths(sender));
    } else {
      setSenderWarnings([]);
    }
  }, [sender]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          mappedData,
          rawData,
          sender,
          headers,
          columnSelections,
        })
      );
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }, [mappedData, rawData, sender, headers, columnSelections]);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setRawData([]);
    setMappedData([]);
    setWarnings({});
  }, []);

  const handleEditRow = useCallback(
    (rowIndex: number, updatedRow: MappedAddress) => {
      setMappedData((prev) => {
        if (!prev[rowIndex]) return prev;
        const nextData = [...prev];
        nextData[rowIndex] = updatedRow;

        setWarnings(buildWarnings(nextData));
        return nextData;
      });
    },
    [buildWarnings]
  );

  const handleDeleteRow = useCallback(
    (rowIndex: number) => {
      setMappedData((prev) => {
        if (!prev[rowIndex]) return prev;
        const filtered = prev.filter((_, idx) => idx !== rowIndex);
        const reindexed = filtered.map((row, idx) => ({
          ...row,
          REFERENZ: idx + 1,
        }));
        setWarnings(buildWarnings(reindexed));
        return reindexed;
      });
    },
    [buildWarnings]
  );

  const handleClearAll = useCallback(() => {
    setMappedData([]);
    setRawData([]);
    setSender(DEFAULT_SENDER);
    setHeaders([]);
    setColumnSelections({});
    setWarnings({});
    setSenderWarnings([]);
    setError("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear localStorage:", error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto max-w-7xl py-10 px-4 sm:px-6 lg:px-8">
        <header className="mb-8 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight text-left">Deutsche Post Mail Labels</h1>
              <p className="text-lg text-muted-foreground mt-1 text-left">
                Upload and map your address data to the required format
              </p>
            </div>
            {(hasData || sender) && (
              <Button
                variant="outline"
                onClick={() => setShowClearConfirm(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
        </header>

        <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear all data?</DialogTitle>
              <DialogDescription>
                This will remove uploaded data, mappings, sender info, and cached storage. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleClearAll();
                  setShowClearConfirm(false);
                }}
              >
                Delete Everything
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>
                Upload your CSV, Excel, or ODS file containing address data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload onDataLoaded={handleDataLoaded} onError={handleError} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <CardTitle className="text-left">Sender Information</CardTitle>
                  <CardDescription className="text-left">
                    Added as the first row of the exported CSV and hidden from the table.
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => setShowSenderDialog(true)}>
                  Edit Sender
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {senderWarnings.length > 0 && (
                <Alert className="bg-yellow-50 border-yellow-200 mb-4">
                  <AlertCircle className="text-yellow-600" />
                  <AlertDescription className="text-yellow-700">
                    <ul className="list-disc space-y-1 pl-5">
                      {senderWarnings.map((warn, idx) => (
                        <li key={idx}>{warn}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-foreground/80 shadow-sm">
                  {sender?.NAME || "(unnamed)"}
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-foreground/80 shadow-sm">
                  {sender?.STADT || "(city missing)"}
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-foreground/80 shadow-sm">
                  {sender?.LAND || "(country missing)"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Dialog open={showSenderDialog} onOpenChange={setShowSenderDialog}>
            <DialogContent className="min-w-[600px] max-w-5xl">
              <DialogHeader>
                <DialogTitle>Edit Sender Information</DialogTitle>
                <DialogDescription>
                  These values are used for the sender row in the exported CSV.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sender-name">Name</Label>
                  <Input
                    id="sender-name"
                    value={sender?.NAME ?? ""}
                    onChange={(e) =>
                      setSender((prev) => (prev ? { ...prev, NAME: e.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender-zusatz">Adresszusatz</Label>
                  <Input
                    id="sender-zusatz"
                    value={sender?.ZUSATZ ?? ""}
                    onChange={(e) =>
                      setSender((prev) => (prev ? { ...prev, ZUSATZ: e.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender-strasse">Straße</Label>
                  <Input
                    id="sender-strasse"
                    value={sender?.STRASSE ?? ""}
                    onChange={(e) =>
                      setSender((prev) => (prev ? { ...prev, STRASSE: e.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender-nummer">Hausnummer</Label>
                  <Input
                    id="sender-nummer"
                    value={sender?.NUMMER ?? ""}
                    onChange={(e) =>
                      setSender((prev) => (prev ? { ...prev, NUMMER: e.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender-plz">PLZ</Label>
                  <Input
                    id="sender-plz"
                    value={sender?.PLZ ?? ""}
                    onChange={(e) =>
                      setSender((prev) => (prev ? { ...prev, PLZ: e.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender-stadt">Ort</Label>
                  <Input
                    id="sender-stadt"
                    value={sender?.STADT ?? ""}
                    onChange={(e) =>
                      setSender((prev) => (prev ? { ...prev, STADT: e.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender-land">Land</Label>
                  <CountryCombobox
                    value={sender?.LAND ?? "DEU"}
                    onValueChange={(value) =>
                      setSender((prev) => (prev ? { ...prev, LAND: value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sender-adress-typ">Adress-Typ</Label>
                  <Select
                    value={sender?.ADRESS_TYP ?? "HOUSE"}
                    onValueChange={(value) =>
                      setSender((prev) =>
                        prev ? { ...prev, ADRESS_TYP: value as MappedAddress["ADRESS_TYP"] } : prev
                      )
                    }
                  >
                    <SelectTrigger id="sender-adress-typ">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOUSE">HOUSE</SelectItem>
                      <SelectItem value="POBOX">POBOX</SelectItem>
                      <SelectItem value="MAJORRECIPIENT">MAJORRECIPIENT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {senderWarnings.length > 0 && (
                <Alert className="bg-yellow-50 border-yellow-200 mt-4">
                  <AlertCircle className="text-yellow-600" />
                  <AlertDescription className="text-yellow-700">
                    <ul className="list-disc space-y-1 pl-5">
                      {senderWarnings.map((warn, idx) => (
                        <li key={idx}>{warn}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSenderDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {rawData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Map Columns</CardTitle>
                <CardDescription>
                  Map the columns from your file to the required fields.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {TARGET_FIELDS.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={`mapping-${field.key}`} className="flex items-center gap-2">
                        {field.label}
                        {field.required && (
                          <span className="text-destructive text-xs font-semibold">*</span>
                        )}
                      </Label>
                      <Select
                        value={columnSelections[field.key] ?? ""}
                        onValueChange={(value) =>
                          setColumnSelections((prev) => ({
                            ...prev,
                            [field.key]: value === "none" ? undefined : value,
                          }))
                        }
                      >
                        <SelectTrigger id={`mapping-${field.key}`}>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {!field.required && (
                            <SelectItem value="none">
                              <span className="text-muted-foreground">Not Mapped</span>
                            </SelectItem>
                          )}
                          {headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {hasData && (
            <Card>
              <CardHeader>
                <CardTitle>Mapped Data</CardTitle>
                <CardDescription>
                  Review, edit, and export your mapped addresses.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MappedTable
                  data={mappedData}
                  warnings={warnings}
                  senderRow={sender}
                  editable
                  onEditRow={handleEditRow}
                  onDeleteRow={handleDeleteRow}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

