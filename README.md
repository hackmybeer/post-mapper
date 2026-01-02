# Deutsche Post Mail Labels

A modern web application for processing and formatting address data for Deutsche Post mail labels. Upload your address lists in various formats, map columns to required fields, and export validated data with proper encoding.

## ✨ Features

- **Multi-format Support**: Import CSV, Excel (.xlsx, .xls), and OpenDocument (.ods) files
- **Smart Column Mapping**: Automatic detection and manual override for field mapping
- **Sender Management**: Configure and persist sender information
- **Data Validation**: Real-time validation for required fields and length limits
- **Country Code Mapping**: Automatic conversion to ISO 3166-1 alpha-3 country codes
- **Export Options**: Download all addresses, or filter by German vs. international addresses
- **CP1252 Encoding**: Proper Windows-1252 encoding for German special characters (ä, ö, ü, ß, €)
- **Persistent Storage**: Automatic saving to browser localStorage
- **Inline Editing**: Edit and delete individual address records
- **Search & Filter**: Find addresses and show only warnings or missing fields

## 🚀 Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS 4** - Styling with new @import syntax
- **shadcn/ui** - Component library
- **Radix UI** - Accessible primitives
- **PapaParse** - CSV parsing
- **SheetJS** - Excel/ODS parsing

## 📋 Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

## 🛠️ Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd deutsche-post-mail-labels

# Install dependencies
pnpm install

# Start development server
pnpm dev
\`\`\`

## 🎯 Usage

1. **Upload File**: Drag & drop or select a CSV/Excel/ODS file containing address data
2. **Map Columns**: Match your file's columns to required fields (Name, Street, PLZ, City, Country, etc.)
3. **Configure Sender**: Set sender information (appears as first row in export)
4. **Review Data**: Check mapped addresses, warnings, and validation errors
5. **Edit Records**: Click Edit on any row to modify data or delete invalid entries
6. **Export**: Download CSV with all addresses, German only, or international only

## 📂 Project Structure

\`\`\`
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── CountryCombobox.tsx
│   ├── FileUpload.tsx
│   └── MappedTable.tsx
├── lib/
│   ├── mapper.ts        # Data mapping and validation logic
│   └── utils.ts         # Utility functions
├── assets/
│   └── countries.json   # ISO country code mappings
├── App.tsx              # Main application component
├── main.tsx             # Application entry point
└── index.css            # Global styles with Tailwind
\`\`\`

## 🔧 Development

\`\`\`bash
# Start dev server with hot reload
pnpm dev

# Type checking
pnpm build

# Lint code
pnpm lint
\`\`\`

## 📦 Build

\`\`\`bash
# Build for production
pnpm build

# Preview production build
pnpm preview
\`\`\`

## �� Data Format

### Required Fields
- **Vorname** (First Name)*
- **Nachname** (Last Name)*
- **Straße** (Street)*
- **PLZ** (Postal Code)*
- **Ort** (City)*
- **Land** (Country)*

### Optional Fields
- **Anrede** (Salutation)
- **Adresszusatz** (Address Addition)

### Output Format
CSV with semicolon delimiters, Windows-1252 encoding:
\`\`\`
NAME;ZUSATZ;STRASSE;NUMMER;PLZ;STADT;LAND;ADRESS_TYP;REFERENZ
\`\`\`

## 🌍 Country Codes

The application automatically maps country names to ISO 3166-1 alpha-3 codes:
- Deutschland → DEU
- Österreich → AUT
- Schweiz → CHE
- USA → USA
- etc.

Unmapped countries default to DEU with a warning.

## 💾 Local Storage

Data is automatically persisted to browser localStorage:
- Uploaded data
- Column mappings
- Sender information
- Mapped addresses

Use "Clear All" to reset everything.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📄 License

MIT
