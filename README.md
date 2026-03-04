<img width="848" height="641" alt="image" src="https://github.com/user-attachments/assets/44640a9e-3773-4ac3-943a-c196d82768eb" />


# SQL Splitter Pro

SQL Splitter Pro is a modern web-based tool designed to split large SQL
dump files into multiple smaller parts.\
It is built with **React, TypeScript, and Vite** and runs entirely in
the browser without uploading your data to any server.

This makes it **fast, private, and secure** for developers working with
large MySQL database exports.

------------------------------------------------------------------------

# Features

• Split large SQL dump files into smaller parts\
• Works completely **client-side (no server required)**\
• Supports **.sql and .sql.gz files**\
• Automatically detects database tables from SQL dumps\
• Manual or automatic splitting modes\
• Download results as **ZIP file**\
• Visual table size distribution chart\
• Preview SQL table contents before splitting

------------------------------------------------------------------------

# Technology Stack

Frontend Framework: React 19

Language: TypeScript

Build Tool: Vite

Libraries: Recharts -- Data visualization\
Lucide React -- Icons\
JSZip -- Create ZIP downloads\
Browser DecompressionStream -- Handle .gz files

------------------------------------------------------------------------

# Project Structure

SQL_Splitter_Pro │ ├── index.html ├── index.tsx ├── App.tsx │ ├──
services │ └── sqlProcessor.ts │ ├── types.ts │ ├── package.json ├──
tsconfig.json ├── vite.config.ts │ ├── robots.txt ├── sitemap.xml └──
metadata.json

------------------------------------------------------------------------

# Installation

Clone the repository:

git clone https://github.com/the-uzair-ahmed/sql-splitter-pro.git

Navigate into the project folder:

cd sql-splitter-pro

Install dependencies:

npm install

Start development server:

npm run dev

Open in browser:

http://localhost:5173

------------------------------------------------------------------------

# Build for Production

To create a production build:

npm run build

Preview production build:

npm run preview

------------------------------------------------------------------------

# How It Works

1.  Upload a SQL dump file (.sql or .sql.gz)
2.  The tool scans the SQL file and detects tables
3.  Each table block is extracted
4.  Tables are distributed across multiple parts
5.  Final SQL files are generated
6.  All parts are downloaded as a ZIP archive

------------------------------------------------------------------------

# Supported SQL Dump Format

The tool works best with MySQL dumps generated using:

mysqldump

Example table structure format detected:

-- Table structure for table `users`

CREATE TABLE `users` (

INSERT INTO `users` VALUES (...);

------------------------------------------------------------------------

# Advantages

• No database connection required\
• No server processing required\
• Files remain on your local machine\
• Works instantly in the browser

------------------------------------------------------------------------

# Known Limitations

• Extremely large files (2GB+) may cause browser memory issues\
• Detection depends on standard MySQL dump format\
• Tables larger than the selected split size cannot be divided
automatically

------------------------------------------------------------------------

# Recommended Improvements

Future enhancements may include:

• Streaming SQL parsing for very large files\
• Web Worker processing to avoid UI freezing\
• INSERT block splitting\
• Drag and drop upload support\
• File progress indicators\
• Advanced SQL analysis tools

------------------------------------------------------------------------

# Security

This application processes files **entirely inside your browser**.\
No data is uploaded to any server.

This makes SQL Splitter Pro safe for working with sensitive databases.

------------------------------------------------------------------------

# License

MIT License

You are free to use, modify, and distribute this project.

------------------------------------------------------------------------

# Author

Developed for developers who frequently handle large SQL dump files and
need an easy way to split them for database imports.

------------------------------------------------------------------------

# ScreenShots

<img width="1393" height="907" alt="image" src="https://github.com/user-attachments/assets/d48dfe07-6f05-47f5-88c9-d5bce2d29474" />
<img width="1266" height="907" alt="image" src="https://github.com/user-attachments/assets/14db8da3-90cf-42c6-9945-e6a047e186c7" />
<img width="1249" height="762" alt="image" src="https://github.com/user-attachments/assets/3fc57161-d45d-4ea2-ba29-0f8cca83d38b" />



