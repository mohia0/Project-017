export interface DocumentDesign {
    marginTop: number;
    marginBottom: number;
    borderRadius: number;
    signBarColor: string;
    signBarThickness: number;
    backgroundColor: string;
    backgroundImage?: string;
    backgroundImageOpacity?: number;
    fontFamily: string;
    tableBorderRadius?: number;
    tableBorderRadiusTL?: number;
    tableBorderRadiusTR?: number;
    tableBorderRadiusBR?: number;
    tableBorderRadiusBL?: number;
    tableBorderRadiusLinked?: boolean;
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
    blockBackgroundColor?: string;
    blockShadow?: string;
    actionTheme?: 'light' | 'dark';
    topBlurTheme?: 'light' | 'dark';
    signTheme?: 'light' | 'dark';
    documentTitle?: string;
    tableRowBg?: string;
    tableShowRowBorders?: boolean;
    tableRowBorderColor?: string;
    inputBackgroundColor?: string;
}

export const DEFAULT_DOCUMENT_DESIGN: DocumentDesign = {
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 16,
    signBarColor: '#000000',
    signBarThickness: 1,
    backgroundColor: '#f7f7f7',
    backgroundImage: '',
    backgroundImageOpacity: 1,
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
    actionButtonMarginTop: 12,
    actionButtonMarginBottom: 8,
    blockBackgroundColor: '#ffffff',
    blockShadow: '0 8px 30px -6px rgba(0,0,0,0.08)',
    actionTheme: 'light',
    topBlurTheme: 'light',
    signTheme: 'light',
    tableRowBg: '',
    tableShowRowBorders: true,
    tableRowBorderColor: '',
    inputBackgroundColor: '',
};
