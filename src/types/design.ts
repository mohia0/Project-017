export interface DocumentDesign {
    marginTop: number;
    marginBottom: number;
    borderRadius: number;
    signBarColor: string;
    signBarThickness: number;
    backgroundColor: string;
    backgroundImage?: string;
    fontFamily: string;
    tableBorderRadius?: number;
    tableHeaderBg?: string;
    tableBorderColor?: string;
    tableStrokeWidth?: number;
}

export const DEFAULT_DOCUMENT_DESIGN: DocumentDesign = {
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 16,
    signBarColor: '#000000',
    signBarThickness: 1,
    backgroundColor: '#ffffff',
    backgroundImage: '',
    fontFamily: 'Inter',
    tableBorderRadius: 8,
    tableHeaderBg: '',
    tableBorderColor: '',
    tableStrokeWidth: 1,
};
