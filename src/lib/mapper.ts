// Mapping logic ported from mapper.py
import countriesData from "@/assets/countries.json";

export interface MappedAddress {
  NAME: string;
  ZUSATZ: string;
  STRASSE: string;
  NUMMER: string;
  PLZ: string;
  STADT: string;
  LAND: string;
  ADRESS_TYP: string;
  REFERENZ: number;
  LAND_UNMAPPED_ORIGINAL?: string; // Track original unmapped country value
}

export interface RawRow {
  [key: string]: unknown;
}

export interface Country {
  englishShortName: string;
  alpha2Code: string;
  alpha3Code: string;
  numeric: number;
  germanShortName: string;
}

// Build mapping from countries.json for quick lookups
export const buildCountryMapping = (): { [key: string]: string } => {
  const mapping: { [key: string]: string } = {};

  countriesData.forEach((country) => {
    const { englishShortName, germanShortName, alpha3Code } = country;

    // Add English name
    mapping[englishShortName.toLowerCase()] = alpha3Code;
    // Add German name
    if (germanShortName) {
      mapping[germanShortName.toLowerCase()] = alpha3Code;
    }
    // Add alpha2 code
    mapping[country.alpha2Code.toLowerCase()] = alpha3Code;
    // Add alpha3 code
    mapping[alpha3Code.toLowerCase()] = alpha3Code;
  });

  return mapping;
};

export const countryMapping = buildCountryMapping();

// Export countries for dropdown
export const countries = countriesData;

export const DEFAULT_COLUMN_MAPPING: { [key: string]: string } = {
  Anrede: "salutation",
  Vorname: "first_name",
  Name: "last_name",
  Adresse1: "street",
  Adresse2: "address_addition",
  PLZ: "postal_code",
  Ort: "city",
  Land: "country",
};

export function mapColumns(
  row: RawRow,
  customMapping?: Record<string, string>
): {
  [key: string]: unknown;
} {
  const mapping = customMapping ?? DEFAULT_COLUMN_MAPPING;
  const normalizedMapping: Record<string, string> = {};

  // normalize keys to lowercase for case-insensitive matching
  Object.entries(mapping).forEach(([source, target]) => {
    normalizedMapping[source.toLowerCase()] = target;
  });

  const mapped: { [key: string]: unknown } = {};

  Object.entries(row).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (normalizedMapping[lowerKey]) {
      mapped[normalizedMapping[lowerKey]] = value;
    } else {
      mapped[lowerKey] = value;
    }
  });

  return mapped;
}

export function mapCountry(
  country: unknown
): { code: string; unmappedOriginal?: string } {
  if (!country) return { code: "DEU" };
  const countryStr = String(country).trim();
  if (!countryStr) return { code: "DEU" };

  const mapped = countryMapping[countryStr.toLowerCase()];
  if (mapped) {
    return { code: mapped };
  }
  // Country not found: default to DEU but track original
  return { code: "DEU", unmappedOriginal: countryStr };
}

export function createFullName(
  firstName: unknown,
  lastName: unknown
): string {
  const first = firstName ? String(firstName).trim() : "";
  const last = lastName ? String(lastName).trim() : "";
  return `${first} ${last}`.trim();
}

export function mapAddressType(
  addressAddition: unknown
): "POBOX" | "HOUSE" | "MAJORRECIPIENT" {
  if (addressAddition) {
    const additionStr = String(addressAddition);
    if (additionStr.includes("Postfach")) {
      return "POBOX";
    }
    if (additionStr.includes("Großempfänger") || additionStr.includes("Grossempfänger")) {
      return "MAJORRECIPIENT";
    }
  }
  return "HOUSE";
}

export function splitStreetNumber(
  street: unknown
): [string, string] {
  if (!street) return ["", ""];

  const s = String(street).trim();
  if (!s) return ["", ""];

  // Match trailing number (e.g., "Musterstraße 12a")
  const trailingMatch = s.match(/^(.*\S)\s+(\d+[A-Za-z\-\/]?)$/);
  if (trailingMatch) {
    return [trailingMatch[1], trailingMatch[2]];
  }

  // Fallback: if last token contains any digit, assume it's the number
  const parts = s.split(/\s+/);
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    if (/\d/.test(lastPart)) {
      return [parts.slice(0, -1).join(" "), lastPart];
    }
  }

  // Check if first token is a number (e.g., for US addresses)
  const firstParts = s.split(/\s+/);
  if (firstParts.length >= 2 && /\d/.test(firstParts[0])) {
    return [firstParts.slice(1).join(" "), firstParts[0]];
  }

  // Otherwise number unknown
  return [s, ""];
}

export function cleanValue(value: unknown): string {
  if (!value) return "";
  let str = String(value).trim();
  // Replace multiple spaces with single space
  str = str.replace(/\s+/g, " ");
  return str;
}

export function mapRow(
  row: RawRow,
  index: number,
  mapping?: Record<string, string>
): MappedAddress {
  const mapped = mapColumns(row, mapping);

  const firstName = mapped["first_name"] || "";
  const lastName = mapped["last_name"] || "";
  const fullName = createFullName(firstName, lastName);

  const street = mapped["street"];
  const [strasse, nummer] = splitStreetNumber(street);

  const addressAddition = mapped["address_addition"] || "";
  const addressType = mapAddressType(addressAddition);

  const countryResult = mapCountry(mapped["country"]);
  const postalCode = mapped["postal_code"];

  const result: MappedAddress = {
    NAME: cleanValue(fullName),
    ZUSATZ: cleanValue(addressAddition),
    STRASSE: cleanValue(strasse),
    NUMMER: cleanValue(nummer),
    PLZ: cleanValue(postalCode),
    STADT: cleanValue(mapped["city"] || ""),
    LAND: countryResult.code,
    ADRESS_TYP: addressType,
    REFERENZ: index + 1,
  };

  // Track original unmapped country value if it couldn't be resolved
  if (countryResult.unmappedOriginal) {
    result.LAND_UNMAPPED_ORIGINAL = countryResult.unmappedOriginal;
  }

  return result;
}

export function mapData(
  rows: RawRow[],
  mapping?: Record<string, string>
): MappedAddress[] {
  return rows.map((row, index) => mapRow(row, index, mapping));
}

export function validateMaxLengths(
  row: MappedAddress
): string[] {
  const limits: Record<string, number> = {
    NAME: 50,
    ZUSATZ: 50,
    STRASSE: 40,
    NUMMER: 7,
    PLZ: 9,
    STADT: 40,
    LAND: 3,
    ADRESS_TYP: 99,
    REFERENZ: 20,
  };

  const warnings: string[] = [];
  
  // Check unmapped country warning
  if (row.LAND_UNMAPPED_ORIGINAL) {
    warnings.push(
      `LAND could not be mapped from "${row.LAND_UNMAPPED_ORIGINAL}", defaulted to ${row.LAND}`
    );
  }
  
  (Object.keys(limits) as Array<keyof MappedAddress>).forEach((col) => {
    if (col === "LAND_UNMAPPED_ORIGINAL") return; // Skip internal field
    const maxLen = limits[col];
    const value = String(row[col]).length;
    if (maxLen && value > maxLen) {
      warnings.push(
        `${col} exceeds max length (${value} > ${maxLen})`
      );
    }
  });

  const fullAddressFields: Array<keyof MappedAddress> = [
    "NAME",
    "ZUSATZ",
    "STRASSE",
    "NUMMER",
    "PLZ",
    "STADT",
  ];
  const fullAddress = fullAddressFields
    .map((key) => String(row[key]).trim())
    .filter(Boolean)
    .join(" ");
  const fullLength = fullAddress.length;
  if (fullLength > 72) {
    warnings.push(`Full address exceeds max length (${fullLength} > 72)`);
  }

  return warnings;
}
  