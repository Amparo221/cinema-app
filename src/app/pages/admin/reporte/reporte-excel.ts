import { HojaExcel } from './reporte-datos';

/**
 * Excel real (.xlsx) con SheetJS.
 *
 * Igual que el PDF, `xlsx` se carga recién al tocar el botón. Las hojas
 * llevan números (no texto formateado) para poder sumar y ordenar:
 * Facturación (con fila TOTAL), Películas, Candy y Detalle de compras.
 */
export async function descargarReporteExcel(hojas: HojaExcel[], nombre: string): Promise<void> {
  const XLSX = await import('xlsx');
  const libro = XLSX.utils.book_new();

  for (const hoja of hojas) {
    const planilla = XLSX.utils.aoa_to_sheet(hoja.filas);
    planilla['!cols'] = hoja.anchos.map((ancho) => ({ wch: ancho }));
    // Excel no acepta nombres de hoja de más de 31 caracteres.
    XLSX.utils.book_append_sheet(libro, planilla, hoja.nombre.slice(0, 31));
  }

  XLSX.writeFile(libro, nombre);
}
