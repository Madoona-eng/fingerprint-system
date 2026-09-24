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
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        },
      };
    }
  }
}

// جديد: خريطة لعرض أعمدة معينة بالاسم (المفتاح زي ما هو في data[0])
export interface ColumnWidthOptions {
  /** عرض مخصص لأعمدة بعينها، بالاسم: { الكود: 8, يحتاج_مراجعة: 10 } */
  columnWidths?: Record<string, number>;
  /** عرض افتراضي لأي عمود مش موجود في columnWidths (اختياري) */
  defaultWidth?: number;
  /** أقصى عرض مسموح به لأي عمود بيتحسب تلقائي (اختياري) */
  maxWidth?: number;
}

export function exportToExcel(
  data: any[],
  fileName: string = 'Export-Data',
  sheetName: string = 'Sheet1',
  wrapTextColumns: string[] = [],
  columnWidthOptions?: ColumnWidthOptions,
): void {
  const worksheet = XLSX.utils.json_to_sheet(data);

  if (data && data.length > 0) {
    const keys = Object.keys(data[0]);

    worksheet['!cols'] = keys.map((key) => {
      // 1. لو فيه عرض مخصص لهذا العمود بالاسم، استخدمه
      const customWidth = columnWidthOptions?.columnWidths?.[key];
      if (customWidth) {
        return { wch: customWidth };
      }

      // 2. لو فيه عرض افتراضي عام، استخدمه
      if (columnWidthOptions?.defaultWidth) {
        return { wch: columnWidthOptions.defaultWidth };
      }

      // 3. غير كده، احسب تلقائي زي ما كان
      const maxLen = Math.max(key.length, ...data.map((row) => String(row[key] || '').length));
      let width = Math.max(maxLen + 5, 15);

      if (columnWidthOptions?.maxWidth) {
        width = Math.min(width, columnWidthOptions.maxWidth);
      }

      return { wch: width };
    });

    if (wrapTextColumns.length > 0) {
      keys.forEach((key, colIndex) => {
        if (!wrapTextColumns.includes(key)) return;

        for (let r = 1; r <= data.length; r++) {
          const col = numberToColumn(colIndex + 1);
          const addr = `${col}${r + 1}`;
          const cell = worksheet[addr];
          if (cell) {
            cell.s = {
              ...(cell.s || {}),
              alignment: { ...(cell.s?.alignment || {}), wrapText: true, vertical: 'top' },
            };
          }
        }
      });
    }
  }

  styleWorksheetHeader(worksheet, '1F4E78');

  const workbook = XLSX.utils.book_new();

  (workbook as any).Workbook = {
    Views: [{ RTL: true }],
  };

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, finalFileName);
}