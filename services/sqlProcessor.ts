
import { TableBlock, SQLState, PartResult, SplitMode } from '../types';

/**
 * Port of the PHP logic to TypeScript for browser-side execution.
 */

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export async function processUploadedFile(file: File): Promise<SQLState> {
  let content: string;
  
  if (file.name.endsWith('.gz')) {
    const ds = new DecompressionStream('gzip');
    const decompressedStream = file.stream().pipeThrough(ds);
    const response = new Response(decompressedStream);
    content = await response.text();
  } else {
    content = await file.text();
  }

  const tableRegex = /^--\s+Table structure for table\s+`([^`]+)`/gm;
  const lines = content.split(/\r?\n/);
  
  let header = '';
  const tables: TableBlock[] = [];
  let currentTable: { name: string; lines: string[] } | null = null;
  let inTables = false;

  for (const line of lines) {
    const match = /^--\s+Table structure for table\s+`([^`]+)`/i.exec(line);
    
    if (match) {
      inTables = true;
      if (currentTable) {
        const tableContent = currentTable.lines.join('\n');
        tables.push({
          name: currentTable.name,
          content: tableContent,
          size: new TextEncoder().encode(tableContent).length
        });
      }
      currentTable = { name: match[1], lines: [line] };
    } else if (!inTables) {
      header += line + '\n';
    } else if (currentTable) {
      currentTable.lines.push(line);
    }
  }

  if (currentTable) {
    const tableContent = currentTable.lines.join('\n');
    tables.push({
      name: currentTable.name,
      content: tableContent,
      size: new TextEncoder().encode(tableContent).length
    });
  }

  if (tables.length === 0) {
    throw new Error("No tables detected. Ensure your SQL file contains markers like: -- Table structure for table `...` ");
  }

  return {
    header,
    tables,
    fileName: file.name.replace(/\.sql(\.gz)?$/i, '')
  };
}

export function generateAssignments(
  tables: TableBlock[], 
  partsCount: number, 
  mode: SplitMode, 
  manualAssignments: Record<string, number>
): Record<string, number> {
  if (mode === SplitMode.MANUAL) {
    return manualAssignments;
  }

  // Greedy bin packing
  const sortedTables = [...tables].sort((a, b) => b.size - a.size);
  const bins = Array.from({ length: partsCount }, () => 0);
  const assignments: Record<string, number> = {};

  for (const table of sortedTables) {
    let minBinIndex = 0;
    let minSize = bins[0];

    for (let i = 1; i < partsCount; i++) {
      if (bins[i] < minSize) {
        minSize = bins[i];
        minBinIndex = i;
      }
    }

    assignments[table.name] = minBinIndex + 1;
    bins[minBinIndex] += table.size;
  }

  return assignments;
}

export function buildPartFiles(
  sqlState: SQLState,
  assignments: Record<string, number>,
  partsCount: number,
  injectDrop: boolean
): PartResult[] {
  const parts: { content: string[]; size: number; tableCount: number }[] = Array.from(
    { length: partsCount }, 
    () => ({ content: [sqlState.header], size: new TextEncoder().encode(sqlState.header).length, tableCount: 0 })
  );

  for (const table of sqlState.tables) {
    const partIdx = (assignments[table.name] || 1) - 1;
    let tableContent = table.content;

    if (injectDrop) {
      const dropStmt = `DROP TABLE IF EXISTS \`${table.name}\`;\n`;
      const createRegex = new RegExp(`\\bCREATE\\s+TABLE\\s+\`${table.name}\`\\b`, 'i');
      if (createRegex.test(tableContent)) {
        tableContent = tableContent.replace(createRegex, `${dropStmt}CREATE TABLE \`${table.name}\``);
      }
    }

    parts[partIdx].content.push(tableContent);
    parts[partIdx].size += new TextEncoder().encode(tableContent).length;
    parts[partIdx].tableCount += 1;
  }

  return parts.map((p, i) => {
    const finalContent = p.content.join('\n');
    const blob = new Blob([finalContent], { type: 'text/plain' });
    return {
      partNumber: i + 1,
      fileName: `${sqlState.fileName}_part${i + 1}.sql`,
      content: blob,
      size: blob.size,
      tableCount: p.tableCount
    };
  });
}
