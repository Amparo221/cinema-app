import type { jsPDF } from 'jspdf';
import { DatosReporte } from '../../../models/reporte.model';
import {
  etiquetaDia,
  etiquetaDiaLargo,
  etiquetaPeriodo,
  formatearMoneda,
  formatearNumero,
} from './reporte-datos';

/**
 * PDF del reporte (A4 horizontal) con jsPDF.
 *
 * jsPDF se carga con `import()` recién al tocar el botón: así no pesa
 * en el bundle inicial ni se ejecuta durante el render del servidor.
 */

const MARGEN = 12;
const ANCHO_UTIL = 273;
const LIMITE_Y = 188;

interface Columna {
  titulo: string;
  ancho: number;
  alinear?: 'left' | 'right';
}

interface FilaPdf {
  valores: string[];
  negrita?: boolean;
}

function dibujarEncabezado(doc: jsPDF, columnas: Columna[], anchoTotal: number, y: number): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setFillColor(235, 235, 235);
  doc.rect(MARGEN, y - 4.5, anchoTotal, 7, 'F');

  let x = MARGEN + 2;
  for (const columna of columnas) {
    if (columna.alinear === 'right') {
      doc.text(columna.titulo, x + columna.ancho - 4, y, { align: 'right' });
    } else {
      doc.text(columna.titulo, x, y);
    }
    x += columna.ancho;
  }
}

function dibujarTabla(
  doc: jsPDF,
  titulo: string,
  columnas: Columna[],
  filas: FilaPdf[],
  y: number,
): number {
  const anchoTotal = columnas.reduce((suma, columna) => suma + columna.ancho, 0);

  const encabezadoSeccion = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(titulo, MARGEN, y);
    y += 6;
    dibujarEncabezado(doc, columnas, anchoTotal, y);
    y += 6;
  };

  encabezadoSeccion();

  for (const fila of filas) {
    if (y > LIMITE_Y) {
      doc.addPage();
      y = MARGEN + 8;
      encabezadoSeccion();
    }

    doc.setFont('helvetica', fila.negrita ? 'bold' : 'normal');
    doc.setFontSize(8);

    let x = MARGEN + 2;
    for (let i = 0; i < columnas.length; i++) {
      const columna = columnas[i];
      const valor = fila.valores[i] ?? '';
      if (columna.alinear === 'right') {
        doc.text(valor, x + columna.ancho - 4, y, { align: 'right' });
      } else {
        doc.text(valor, x, y);
      }
      x += columna.ancho;
    }

    y += 5;
  }

  return y + 5;
}

const COLUMNAS_FACTURACION: Columna[] = [
  { titulo: 'Día', ancho: 26 },
  { titulo: 'Compras', ancho: 20, alinear: 'right' },
  { titulo: 'Entradas', ancho: 20, alinear: 'right' },
  { titulo: 'Usadas', ancho: 18, alinear: 'right' },
  { titulo: 'Butacas $', ancho: 30, alinear: 'right' },
  { titulo: 'Candy $', ancho: 28, alinear: 'right' },
  { titulo: 'Total', ancho: 32, alinear: 'right' },
  { titulo: 'Créditos', ancho: 26, alinear: 'right' },
  { titulo: 'Puntos', ancho: 22, alinear: 'right' },
  { titulo: 'Cancel.', ancho: 20, alinear: 'right' },
  { titulo: 'Cancelado $', ancho: 31, alinear: 'right' },
];

const COLUMNAS_PELICULAS: Columna[] = [
  { titulo: 'Período', ancho: 60 },
  { titulo: 'Película', ancho: 140 },
  { titulo: 'Entradas', ancho: 33, alinear: 'right' },
  { titulo: 'Ingresos', ancho: 40, alinear: 'right' },
];

const COLUMNAS_CANDY: Columna[] = [
  { titulo: 'Producto', ancho: 135 },
  { titulo: 'Unidades', ancho: 35, alinear: 'right' },
  { titulo: 'Ingresos', ancho: 40, alinear: 'right' },
  { titulo: 'En combos', ancho: 32, alinear: 'right' },
  { titulo: 'Comprados', ancho: 31, alinear: 'right' },
];

/**
 * Genera y descarga el PDF del rango elegido.
 * Se llama desde el botón "Descargar PDF" de /admin/reporte.
 */
export async function descargarReportePdf(datos: DatosReporte, nombre: string): Promise<void> {
  const { jsPDF: Constructor } = await import('jspdf');
  const doc = new Constructor({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  let y = MARGEN + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Reporte de ventas', MARGEN, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Del ${etiquetaDiaLargo(datos.rango.desde)} al ${etiquetaDiaLargo(datos.rango.hasta)}`,
    MARGEN,
    y,
  );
  doc.setFontSize(8);
  doc.text(`Generado el ${datos.generadoEl}`, MARGEN + ANCHO_UTIL, y, { align: 'right' });

  y += 7;
  doc.setFontSize(9);
  doc.text(
    [
      `Total cobrado: ${formatearMoneda(datos.totales.total_cobrado)}`,
      `Butacas: ${formatearMoneda(datos.totales.dinero_butacas)}`,
      `Candy: ${formatearMoneda(datos.totales.dinero_candy)}`,
    ].join('     '),
    MARGEN,
    y,
  );

  y += 5;
  doc.text(
    [
      `Entradas: ${formatearNumero(datos.totales.entradas)}`,
      `Usadas: ${formatearNumero(datos.totales.entradas_usadas)}`,
      `Créditos usados: ${formatearMoneda(datos.totales.creditos_usados)}`,
      `Puntos usados: ${formatearNumero(datos.totales.puntos_usados)}`,
      `Canceladas: ${formatearNumero(datos.totales.canceladas)} (${formatearMoneda(
        datos.totales.monto_cancelado,
      )})`,
    ].join('     '),
    MARGEN,
    y,
  );

  y += 11;

  const filasFacturacion: FilaPdf[] = datos.facturacion.map((fila) => ({
    valores: [
      etiquetaDia(fila.dia),
      formatearNumero(fila.compras),
      formatearNumero(fila.entradas),
      formatearNumero(fila.entradas_usadas),
      formatearMoneda(fila.dinero_butacas),
      formatearMoneda(fila.dinero_candy),
      formatearMoneda(fila.total_cobrado),
      formatearMoneda(fila.creditos_usados),
      formatearNumero(fila.puntos_usados),
      formatearNumero(fila.canceladas),
      formatearMoneda(fila.monto_cancelado),
    ],
  }));

  filasFacturacion.push({
    negrita: true,
    valores: [
      'TOTAL',
      formatearNumero(datos.totales.compras),
      formatearNumero(datos.totales.entradas),
      formatearNumero(datos.totales.entradas_usadas),
      formatearMoneda(datos.totales.dinero_butacas),
      formatearMoneda(datos.totales.dinero_candy),
      formatearMoneda(datos.totales.total_cobrado),
      formatearMoneda(datos.totales.creditos_usados),
      formatearNumero(datos.totales.puntos_usados),
      formatearNumero(datos.totales.canceladas),
      formatearMoneda(datos.totales.monto_cancelado),
    ],
  });

  y = dibujarTabla(doc, 'Facturación por día', COLUMNAS_FACTURACION, filasFacturacion, y);

  y = dibujarTabla(
    doc,
    `Películas más vistas (por ${datos.agrupacion})`,
    COLUMNAS_PELICULAS,
    datos.peliculas.map((fila) => ({
      valores: [
        etiquetaPeriodo(fila.periodo, datos.agrupacion),
        fila.pelicula,
        formatearNumero(fila.entradas),
        formatearMoneda(fila.ingresos),
      ],
    })),
    y,
  );

  dibujarTabla(
    doc,
    'Candy más vendido',
    COLUMNAS_CANDY,
    datos.candy.map((fila) => ({
      valores: [
        fila.producto,
        formatearNumero(fila.cantidad),
        formatearMoneda(fila.ingresos),
        formatearNumero(fila.combos),
        formatearNumero(fila.extras),
      ],
    })),
    y,
  );

  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    doc.setPage(pagina);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Página ${pagina} de ${paginas}`, MARGEN + ANCHO_UTIL, 200, { align: 'right' });
  }

  doc.save(nombre);
}
