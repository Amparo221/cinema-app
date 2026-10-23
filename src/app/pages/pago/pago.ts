import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import { CompraTemporalService } from '../../services/compra-temporal';
import { ReservaButacasService } from '../../services/reserva-butacas';
import { cantidadPagada } from '../../models/producto-candy.model';

type MetodoPago = 'transferencia' | 'tarjeta' | 'efectivo';

@Component({
  selector: 'app-pago',
  imports: [],
  templateUrl: './pago.html',
  styleUrl: './pago.css',
})
export class Pago implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);
  private compraTemporal = inject(CompraTemporalService);
  private reserva = inject(ReservaButacasService);
  private router = inject(Router);
  private compraConfirmada = false;

  // Recibe y muestra el resumen de la compra temporal.
  resumen = this.compraTemporal.resumen;

  metodoPago = signal<MetodoPago>('tarjeta');
  usarCreditos = signal(false);
  procesando = signal(false);
  error = signal<string | null>(null);
  volverAElegirVisible = signal(false);

  usuario = this.session.usuario;

  // Creditos del usuario actual.
  creditosDisponibles = computed(() => this.usuario()?.creditos ?? 0);

  esCombo = computed(() => !!this.resumen()?.combo);

  puntosCombo = computed(() => this.resumen()?.puntos_combo ?? 0);

  pagoSoloPuntos = computed(() => this.esCombo() && this.totalFinal() === 0);

  // Creditos aplicables.
  creditosAplicados = computed(() => {
    const r = this.resumen();
    if (!r) return 0;
    if (!this.usarCreditos()) return 0;
    const limite = r.combo ? r.total_candy : r.subtotal_con_descuentos;
    return Math.min(this.creditosDisponibles(), limite);
  });

  totalFinal = computed(() => {
    const r = this.resumen();
    if (!r) return 0;
    const base = r.combo ? r.total_candy : r.subtotal_con_descuentos;
    return Math.max(0, base - this.creditosAplicados());
  });

  montoRestante = computed(() => this.totalFinal());

  ngOnInit() {
    if (!this.resumen()) {
      this.router.navigate(['/main']);
      return;
    }

    if (this.resumen()!.creditos_usados > 0) {
      this.usarCreditos.set(true);
    }
  }

  setMetodo(m: MetodoPago) {
    this.metodoPago.set(m);
  }

  toggleCreditos() {
    this.usarCreditos.update(valor => !valor);
  }

  async confirmarPago() {
    const r = this.resumen();
    if (!r) return;

    this.procesando.set(true);
    this.error.set(null);
    this.volverAElegirVisible.set(false);

    // La RPC actualiza puntos y créditos de forma atómica.
    const totalFinal = this.totalFinal();
    const creditosUsados = this.creditosAplicados();
    // 1 peso gastado = 1 punto. Se suman al total que ya tenia el perfil.
    const carritoExtra = r.combo
      ? r.carrito_candy
          .map(item => ({
            producto_id: item.producto.id,
            cantidad: cantidadPagada(item, r.combo),
          }))
          .filter(item => item.cantidad > 0)
      : [];
    const metodoPago = r.combo && totalFinal === 0 ? 'puntos' : this.metodoPago();

    // Una sola RPC atomica: crea la compra y convierte los bloqueos en ventas.
    const { data: compraId, error: errCompra } = await this.supabase.crearCompraConButacas({
      funcion_id: r.funcion_id,
      codigos: r.butacas,
      sesion_id: this.reserva.sesionId,
      cantidad_butacas: r.butacas.length,
      precio_butacas: r.precio_butacas,
      precio_candy: r.total_candy,
      descuento_primera_compra: r.descuento_primera_compra,
      descuento_cincuenta: r.descuento_cincuenta,
      creditos_usados: creditosUsados,
      total: totalFinal,
      metodo_pago: metodoPago,
      combo_id: r.combo?.id ?? null,
      carrito_extra: carritoExtra,
      puntos_combo: r.combo ? r.puntos_combo : 0,
    });

    if (errCompra || !compraId) {
      this.procesando.set(false);

      const mensaje = errCompra?.message ?? '';
      if (mensaje.includes('BUTACAS_NO_DISPONIBLES') || mensaje.includes('BUTACAS_INVALIDAS')) {
        this.volverAElegirVisible.set(true);
        this.error.set(
          'Alguna de las butacas ya fue ocupada por otra persona. Volvé a elegir tus butacas.'
        );
      } else {
        if (mensaje.includes('PUNTOS_INSUFICIENTES')) {
          this.error.set('No te alcanzan los puntos para este combo. Revisá tu saldo.');
        } else if (mensaje.includes('COMBO_REQUIERE_COMPRA_PREVIA')) {
          this.error.set('Los combos se habilitan después de tu primera compra.');
        } else if (
          mensaje.includes('COMBO_ACTUALIZADO') ||
          mensaje.includes('COMBO_NO_DISPONIBLE') ||
          mensaje.includes('COMBO_INVALIDO')
        ) {
          this.volverAElegirVisible.set(true);
          this.error.set('El combo cambió o ya no está disponible. Volvé a elegirlo.');
        } else if (mensaje.includes('COMBO_UNA_BUTACA')) {
          this.volverAElegirVisible.set(true);
          this.error.set('El combo incluye exactamente una butaca. Volvé a elegir.');
        } else if (mensaje.includes('CREDITOS_INVALIDOS')) {
          this.error.set('Los créditos aplicados ya no están disponibles. Recargá la página.');
        } else if (
          mensaje.includes('CARRITO_INVALIDO') ||
          mensaje.includes('TOTAL_INVALIDO')
        ) {
          this.error.set('El total del combo cambió. Recargá la página e intentá de nuevo.');
        } else if (
          mensaje.includes('USUARIO_REQUERIDO') ||
          mensaje.includes('PERFIL_NO_ENCONTRADO')
        ) {
          this.error.set('Iniciá sesión nuevamente para comprar con puntos.');
        } else {
          this.error.set('No pudimos completar la compra. Intentá de nuevo.');
        }
      }
      return;
    }

    // Actualizar perfil: puntos totales y creditos restantes.
    if (this.usuario()) {
      await this.session.recargarSesion();
      // La RPC ya actualizó puntos, créditos y primera_compra.
      // No se escribe el perfil desde el cliente.
      // La sesión ya se recargó arriba.
    }

    this.procesando.set(false);
    this.compraTemporal.limpiar();
    this.compraConfirmada = true;
    await this.router.navigate(['/recibo', compraId]);
  }

  async cancelar() {
    const r = this.resumen();
    if (r) {
      // Si el usuario abandona el pago, las butacas se liberan ya.
      await this.reserva.liberar(r.funcion_id).catch(() => undefined);
    }
    this.compraTemporal.limpiar();
    this.router.navigate(['/main']);
  }

  async volverAElegir() {
    const r = this.resumen();
    if (!r) {
      this.router.navigate(['/main']);
      return;
    }

    // No liberamos: Compra va a restaurar los bloqueos de esta pestana.
    this.compraTemporal.limpiar();
    await this.router.navigate(['/compra', r.funcion_id], {
      queryParams: r.combo ? { combo: r.combo.id } : undefined,
    });
  }

  ngOnDestroy() {
    if (this.compraConfirmada) return;

    // Salir del pago por cualquier medio libera las butacas de inmediato.
    const r = this.resumen();
    if (r) {
      void this.reserva.liberar(r.funcion_id).catch(() => undefined);
    }
  }

  formatearFecha(fecha: string): string {
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
}
