import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import {
  Compra,
  creditosDeCancelacion,
  mensajeErrorCancelacion,
  puedeCancelarCompra,
} from '../../models/compra.model';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-recibo',
  imports: [RouterLink, QRCodeComponent],
  templateUrl: './recibo.html',
  styleUrl: './recibo.css',
})
export class Recibo implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);

  compra = signal<Compra | null>(null);
  cargando = signal(true);
  cancelando = signal(false);
  errorCancelacion = signal<string | null>(null);

  usuario = this.session.usuario;

  /** Mismas reglas que la base: combo, estado y la ventana de 2 horas. */
  puedeCancelar = computed(() => {
    const c = this.compra();
    return c ? puedeCancelarCompra(c, this.usuario()?.id) : false;
  });

  /** La cuenta fina vive en cancelar_compra; acá se muestra el mismo número. */
  creditosDevolucion = computed(() => {
    const c = this.compra();
    return c ? creditosDeCancelacion(c) : 0;
  });

  async cancelarCompra() {
    const c = this.compra();
    if (!c || !this.puedeCancelar()) return;

    const confirmado = confirm(
      `¿Cancelar esta compra? Se te devolverán $${this.creditosDevolucion()} en créditos. No se devuelve dinero.`,
    );
    if (!confirmado) return;

    this.cancelando.set(true);
    this.errorCancelacion.set(null);

    const { error } = await this.supabase.cancelarCompra(c.id);

    this.cancelando.set(false);

    if (error) {
      this.errorCancelacion.set(mensajeErrorCancelacion(error.message));
      return;
    }

    //Pasar los cambios de creditos a perfil (forzado: la sesión ya estaba cargada)
    await this.session.recargarSesion();

    // VOLVER AL INICIO
    this.router.navigate(['/main']);
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/main']);
      return;
    }

    const { data, error } = await this.supabase.getCompra(id);
    if (error || !data) {
      this.router.navigate(['/main']);
      return;
    }

    this.compra.set(data as Compra);
    this.cargando.set(false);
  }

  formatearFecha(fecha: string, hora: string): string {
    const d = new Date(`${fecha}T${hora}`);
    return d.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  //genera el pdf
  async descargarPDF() {
    const elemento = document.getElementById('recibo-pdf');
    if (!elemento) return;

    // 1. Importamos dinámicamente html2canvas y jspdf
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');

    try {
      // 2. Damos un pequeño respiro (opcional, pero ayuda a que el QR termine de renderizarse)
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 3. Capturamos el HTML como si fuera una foto
      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff', // Fondo blanco para que no salga transparente
        logging: false,
      });

      // 4. Convertimos la foto a un formato que jsPDF entienda (imagen PNG)
      const imgData = canvas.toDataURL('image/png');

      // 5. Creamos el PDF y metemos la imagen
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Calculamos el ancho y alto para que la imagen entre perfecta en el A4
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // AddImage(imagen, formato, x, y, ancho, alto)
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // 6. Guardamos el archivo
      pdf.save(`recibo-${this.compra()!.id.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error('Error al generar el PDF:', error);
    }
  }
}
