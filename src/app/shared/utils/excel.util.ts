// @ts-ignore
import * as XLSX from 'xlsx-js-style';

export function numberToColumn(n: number): string {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function styleWorksheetHeader(worksheet: any, headerColor = '1F4E78'): void {
  if (!worksheet || !worksheet['!ref']) return;

  // 1. ضبط اتجاه الشيت من اليمين إلى اليسار (RTL)
  worksheet['!views'] = [{ rightToLeft: true, RTL: true }];

  const ref: string = worksheet['!ref'];
  const parts = ref.split(':');
  if (parts.length === 0) return;

  const end = parts[parts.length - 1];
  const endCol = end.replace(/\d+$/, '');

  function columnToNumber(col: string): number {
    let num = 0;
    for (let i = 0; i < col.length; i++) {
      num = num * 26 + (col.charCodeAt(i) - 64);
    }
    return num;
  }

  const endIndex = columnToNumber(endCol);
  const headerRow = 1;

  for (let i = 1; i <= endIndex; i++) {
    const col = numberToColumn(i);
    const addr = `${col}${headerRow}`;
    const cell = worksheet[addr];
    if (cell) {
      cell.s = {
        fill: { fgColor: { rgb: headerColor } },
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Segoe UI' },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      };
    }
  }
}

export function exportToExcel(data: any[], fileName: string = 'Export-Data', sheetName: string = 'Sheet1'): void {
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 2. حساب عرض الأعمدة تلقائياً لمنع قَطْع النصوص
  if (data && data.length > 0) {
    const keys = Object.keys(data[0]);
    worksheet['!cols'] = keys.map(key => {
      const maxLen = Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      );
      return { wch: Math.max(maxLen + 5, 15) };
    });
  }

  styleWorksheetHeader(worksheet, '1F4E78');

  const workbook = XLSX.utils.book_new();

  // 3. ضبط اتجاه الـ Workbook بأمان بدون تعارض Types
  (workbook as any).Workbook = {
    Views: [{ RTL: true }]
  };

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, finalFileName);
}