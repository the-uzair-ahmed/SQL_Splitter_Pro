
export interface TableBlock {
  name: string;
  content: string;
  size: number;
}

export interface SQLState {
  header: string;
  tables: TableBlock[];
  fileName: string;
}

export interface PartResult {
  partNumber: number;
  fileName: string;
  content: Blob;
  size: number;
  tableCount: number;
}

export type AppMode = 'UPLOAD' | 'CONFIGURE' | 'PROCESSING' | 'RESULTS';

export enum SplitMode {
  MANUAL = 'manual',
  AUTO = 'auto'
}
