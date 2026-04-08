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
    tableFontSize?: number;
    tableCellPadding?: number;
    logoSize?: number;
    primaryColor?: string;
    actionButtonColor?: string;
    actionButtonMarginTop?: number;
    actionButtonMarginBottom?: number;
}

export const DEFAULT_DOCUMENT_DESIGN: DocumentDesign = {
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 16,
    signBarColor: '#000000',
    signBarThickness: 1,
    backgroundColor: '#f7f7f7',
    backgroundImage: '',
    fontFamily: 'Inter',
    tableBorderRadius: 8,
    tableHeaderBg: '',
    tableBorderColor: '',
    tableStrokeWidth: 1,
    tableFontSize: 12,
    tableCellPadding: 12,
    logoSize: 48,
    primaryColor: '#4dbf39',
    actionButtonColor: '#111111',
    actionButtonMarginTop: 16,
    actionButtonMarginBottom: 16,
};
