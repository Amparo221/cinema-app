import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import { CompraTemporalService } from '../../services/compra-temporal';

type MetodoPago = 'transferencia' | 'tarjeta' | 'efectivo';

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pago.html',
  styleUrl: './pago.css',
})
export class Pago implements OnInit {
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);
  private compraTemporal = inject(CompraTemporalService);
  private router = inject(Router);

  //recibe y muestra el resumen de la compra temporal
  resumen = this.compraTemporal.resumen;

  metodoPago = signal<MetodoPago>('tarjeta');
  usarCreditos = signal(false);
  procesando = signal(false);
  error = signal<string | null>(null);

  usuario = this.session.usuario;

  //creditos del usuario actual
  creditosDisponibles = computed(() => {
    return this.usuario()?.creditos ?? 0;
  });

  // Creditos aplicables
  creditosAplicados = computed(() => {
    const r = this.resumen();
    if (!r) return 0;
    if (!this.usarCreditos()) return 0;
    return Math.min(this.creditosDisponibles(), r.subtotal_con_descuentos);
  });

  totalFinal = computed(() => {
    const r = this.resumen();
    if (!r) return 0;
    return Math.max(0, r.subtotal_con_descuentos - this.creditosAplicados());
  });

  montoRestante = computed(() => {
    return this.totalFinal();
  });

  ngOnInit() {
    if (!this.resumen()) {
      this.router.navigate(['/main']);
      return;
    }
    // Si el usuario ya venía con créditos activados, arrancamos con eso
    if (this.resumen()!.creditos_usados > 0) {
      this.usarCreditos.set(true);
    }
  }

  setMetodo(m: MetodoPago) {
    this.metodoPago.set(m);
  }

  toggleCreditos() {
    this.usarCreditos.set(!this.usarCreditos());
  }

  async confirmarPago() {
    const r = this.resumen();
    if (!r) return;

    this.procesando.set(true);
    this.error.set(null);

    const u = this.usuario();
    const totalFinal = this.totalFinal();
    const puntosSumados = u ? Math.round(totalFinal) : 0;
    const creditosUsados = this.creditosAplicados();

    // 1. Crear la compra
    const { data: compra, error: errCompra } = await this.supabase.crearCompra({
      usuario_id: u?.id ?? null,
      funcion_id: r.funcion_id,
      cantidad_butacas: r.butacas.length,
      precio_butacas: r.precio_butacas,
      precio_candy: r.total_candy,
      descuento_primera_compra: r.descuento_primera_compra,
      descuento_cincuenta: r.descuento_cincuenta,
      creditos_usados: creditosUsados,
      total: totalFinal,
      metodo_pago: this.metodoPago(),
    });

    if (errCompra || !compra) {
      this.procesando.set(false);
      this.error.set(errCompra?.message ?? 'Error al crear la compra.');
      return;
    }

    // 2. Insertar butacas
    const { error: errButacas } = await this.supabase.crearCompraButacas(
      compra.id,
      r.funcion_id,
      r.butacas
    );

    if (errButacas) {
      this.procesando.set(false);
      this.error.set('Alguna butaca ya fue ocupada. Volvé a intentarlo.');
      return;
    }

    // 3. Actualizar perfil del usuario si está logueado
    if (u) {
      const nuevosPuntos = u.puntos + puntosSumados;
      const nuevosCreditos = u.creditos - creditosUsados;
      await this.supabase.actualizarPerfilTrasCompra(u.id, nuevosPuntos, nuevosCreditos);
      await this.session.cargarSesion();
    }

    this.procesando.set(false);

    // 4. Limpiar resumen temporal y redirigir al recibo
    this.compraTemporal.limpiar();
    this.router.navigate(['/recibo', compra.id]);
  }

  cancelar() {
    this.router.navigate(['/main']);
  }

  // Formatear fecha
  formatearFecha(fecha: string): string {
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
}