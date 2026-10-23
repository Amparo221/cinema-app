import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import { Compra } from '../../models/compra.model';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-recibo',
  standalone: true,
  imports: [CommonModule, RouterLink, QRCodeComponent],
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

  //define si se puede cancelar o no la compra
  puedeCancelar = computed(() => {
    const c = this.compra();
    const u = this.usuario();
    if (!c || !u) return false;
    if (c.usuario_id !== u.id) return false;
    if (c.estado !== 'valida') return false;
    if (c.combo_id) return false;

    const fechaFuncion = new Date(`${c.funciones?.fecha}T${c.funciones?.hora}`);
    const ahora = new Date();
    const diffHoras = (fechaFuncion.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    return diffHoras >= 2;
  });

  //la funcion de esto esta en supabase
  creditosDevolucion = computed(() => {
  const c = this.compra();
  if (!c || c.combo_id) return 0;
  return c.precio_butacas - c.descuento_primera_compra - c.descuento_cincuenta;
  });

  async cancelarCompra() {
  const c = this.compra();
  if (!c || !this.puedeCancelar()) return;

  const confirmado = confirm(
    `¿Cancelar esta compra? Se te devolverán $${this.creditosDevolucion()} en créditos. No se devuelve dinero.`
  );
  if (!confirmado) return;

  this.cancelando.set(true);
  this.errorCancelacion.set(null);

  const { error } = await this.supabase.cancelarCompra(c.id);

  this.cancelando.set(false);

  if (error) {
    this.errorCancelacion.set(error.message);
    return;
  }

  //Pasar los cambios de creditos a perfil
  await this.session.cargarSesion();

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

  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');

  await pdf.html(elemento, {
    callback: (doc) => {
      doc.save(`recibo-${this.compra()!.id.slice(0, 8)}.pdf`);
    },
    x: 10,
    y: 10,
    width: 190,
    windowWidth: 800,
  });
}

}