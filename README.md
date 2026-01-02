# Deutsche Post Mail Labels

A modern web application for processing and formatting address data for Deutsche Post mail labels. Upload address lists in various formats, map columns to required fields, and export validated data with correct encoding for Deutsche Post tools.

## ✨ Features

- **Multi-format support**: Import CSV, Excel (.xlsx, .xls), and OpenDocument (.ods) files  
- **Smart column mapping**: Automatic detection with manual override for field mapping  
- **Sender management**: Configure and persist sender information  
- **Data validation**: Real-time validation for required fields and length limits  
- **Country code mapping**: Automatic conversion of country names to ISO 3166-1 alpha-3 codes  
- **Export options**: Download all addresses, only German, or only international addresses  
- **CP1252 encoding**: Windows-1252 export with correct handling of ä, ö, ü, ß, €  
- **Persistent storage**: Automatic saving to browser localStorage  
- **Inline editing**: Edit and delete individual address records  
- **Search & filter**: Find addresses and filter by warnings or missing fields  

## 🚀 Tech Stack

- **React 19** – UI framework  
- **TypeScript** – Type safety  
- **Vite** – Build tool and dev server  
- **Tailwind CSS 4** – Utility-first styling with new `@import` syntax  
- **shadcn/ui** – Headless component library  
- **Radix UI** – Accessible primitives  
- **PapaParse** – CSV parsing  
- **SheetJS** – Excel/ODS parsing  

## 📋 Prerequisites

- Node.js 18+  
- pnpm (recommended) or npm  

## 🛠️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd deutsche-post-mail-labels

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## 🎯 Usage

1. **Upload file**: Drag & drop or select a CSV/Excel/ODS file containing address data.  
2. **Map columns**: Match your file’s columns to required fields (Name, Street, PLZ, City, Country, etc.).  
3. **Configure sender**: Set sender information (appears as first row in the export).  
4. **Review data**: Check mapped addresses, warnings, and validation errors.  
5. **Edit records**: Click *Edit* on any row to modify data or delete invalid entries.  
6. **Export**: Download CSV with all addresses, only German, or only international addresses.  

## 📂 Project Structure

```text
src/
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── CountryCombobox.tsx
│   ├── FileUpload.tsx
│   └── MappedTable.tsx
├── lib/
│   ├── mapper.ts         # Data mapping and validation logic
│   └── utils.ts          # Utility functions
├── assets/
│   └── countries.json    # ISO country code mappings
├── App.tsx               # Main application component
├── main.tsx              # Application entry point
└── index.css             # Global styles with Tailwind
```

## 🔧 Development

```bash
# Start dev server with hot reload
pnpm dev

# Type checking / production build
pnpm build

# Lint code
pnpm lint
```

## 📦 Build

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## 📑 Data Format

### Required fields

- **Vorname** (First name)*  
- **Nachname** (Last name)*  
- **Straße** (Street)*  
- **PLZ** (Postal code)*  
- **Ort** (City)*  
- **Land** (Country)*  

\*Required for successful export.

### Optional fields

- **Anrede** (Salutation)  
- **Adresszusatz** (Address addition)  

### Output format

CSV with semicolon delimiters and Windows-1252 encoding:

```text
NAME;ZUSATZ;STRASSE;NUMMER;PLZ;STADT;LAND;ADRESS_TYP;REFERENZ
```

## 🌍 Country Codes

Country names are automatically mapped to ISO 3166-1 alpha-3 codes, for example:

- Deutschland → DEU  
- Österreich → AUT  
- Schweiz → CHE  
- USA → USA  

Unmapped or unknown countries default to `DEU` and are flagged with a warning in the UI.

## 💾 Local Storage

The following data is automatically persisted in browser localStorage:

- Uploaded raw data  
- Column mappings  
- Sender information  
- Mapped and edited addresses  

Use the **“Clear All”** action in the UI to remove all stored data and reset the application state.

## 🤝 Contributing

Contributions are welcome. Open an issue to discuss larger changes and submit pull requests with a clear description of the problem and solution.

## 📄 License

This project is licensed under the **MIT** license.
