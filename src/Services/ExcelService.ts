import * as XLSX from 'xlsx';

/**
 * Экспортирует массив объектов в файл Excel.
 * * @param data — Массив объектов с данными (каждый объект — строка таблицы)
 * @param fileName — Имя скачиваемого файла (по умолчанию 'export_data')
 * @param sheetName — Название вкладки в Excel (по умолчанию 'Sheet1')
 */
export const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  fileName: string = 'export_data',
  sheetName: string = 'Sheet1'
): void => {
  try {
    // 1. Создаем пустую рабочую книгу (Workbook)
    const workbook = XLSX.utils.book_new();

    // 2. Преобразуем JSON-данные в рабочий лист (Worksheet)
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Автоматический расчет ширины колонок
    const objectMaxLength: number[] = [];
    data.forEach((row) => {
    Object.values(row).forEach((val, index) => {
        const valueString = val ? val.toString() : '';
        const length = valueString.length;
        objectMaxLength[index] = Math.max(objectMaxLength[index] || 0, length);
    });
    });

    // Устанавливаем ширину (добавляем небольшой запас +3 символа)
    worksheet['!cols'] = objectMaxLength.map(w => ({ width: w + 3 }));

    // 3. Добавляем лист в рабочую книгу
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 4. Генерируем Excel-файл и запускаем скачивание в браузере
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Ошибка при экспорте в Excel:', error);
  }
};