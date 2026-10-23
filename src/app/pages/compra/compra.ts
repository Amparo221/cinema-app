import { Component, inject, signal, computed, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MapaButacas } from '../../components/mapa-butacas/mapa-butacas';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import {
  ProductoCandy,
  ItemCarrito,
  cantidadPagada,
  productoEstaEnCombo,
} from '../../models/producto-candy.model';
import {
  Combo,
  motivoNoCanjeCombo,
  nombreCombo,
  puntosCombo,
} from '../../models/combo.model';
import { esButacaVip } from '../../models/butaca.model';
import { CompraTemporalService } from '../../services/compra-temporal';
import { ReservaButacasService } from '../../services/reserva-butacas';

type Tab = 'butacas' | 'candy';

@Component({
  selector: 'app-compra',
  imports: [MapaButacas],
  templateUrl: './compra.html',
  styleUrl: './compra.css',
})
export class Compra implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);
  private compraTemporal = inject(CompraTemporalService);
  private reserva = inject(ReservaButacasService);
  private platformId = inject(PLATFORM_ID);

  funcionId = signal(Number(this.route.snapshot.paramMap.get('id')));
  tabActual = signal<Tab>('butacas');

  // Datos de la funcion
  funcion = signal<any>(null);
  pelicula = signal<any>(null);
  cargandoFuncion = signal(true);

  // Estado de butacas
  butacasSeleccionadas = signal<string[]>([]);
  butacasVendidas = signal<string[]>([]);
  butacasReservadas = signal<string[]>([]);
  butacasPropias = signal<string[]>([]);
  reservando = signal(false);
  avisoButacas = signal<string | null>(null);

  // Candy
  productos = signal<ProductoCandy[]>([]);
  cargandoProductos = signal(true);
  carrito = signal<Map<number, ItemCarrito>>(new Map());

  // Combo especial
  combo = signal<Combo | null>(null);
  motivoCombo = signal<string | null>(null);
  readonly nombreCombo = nombreCombo;
  readonly puntosCombo = puntosCombo;

  config = signal<Record<string, number>>({});
  errorCompra = signal<string | null>(null);

  usuario = this.session.usuario;

  // Control interno: evita reservas viejas y libera al salir.
  private yendoAPagar = false;
  private destruido = false;
  private temporizadorReserva: ReturnType<typeof setTimeout> | null = null;
  private temporizadorRefresco: ReturnType<typeof setTimeout> | null = null;
  private intervaloRefresco: ReturnType<typeof setInterval> | null = null;
  private intervaloRenovacion: ReturnType<typeof setInterval> | null = null;
  private seleccionPendiente: string[] | null = null;
  private colaReserva: Promise<void> = Promise.resolve();
  private desuscribirRealtime: (() => void) | null = null;

  // Calculo de precios de butacas
  precioButacas = computed(() => {
    if (this.combo()) return 0;
    const butacas = this.butacasSeleccionadas();
    const cfg = this.config();
    let total = 0;
    for (const codigo of butacas) {
      const fila = codigo.charAt(0);
      if (['R', 'S', 'T'].includes(fila)) {
        total += cfg['precio_butaca_vip'] ?? 15000;
      } else if (['J', 'K'].includes(fila)) {
        total += cfg['precio_butaca_accesible'] ?? 10000;
      } else {
        total += cfg['precio_butaca_normal'] ?? 10000;
      }
    }
    return total;
  });

  totalCandy = computed(() => {
    let total = 0;
    for (const item of this.carrito().values()) {
      total += item.producto.precio * cantidadPagada(item, this.combo());
    }
    return total;
  });

  // Descuento primera compra (solo sobre butacas)
  descuentoPrimera = computed(() => {
    const u = this.usuario();
    const cfg = this.config();
    if (this.combo() || !u || !u.primera_compra) return 0;
    const pct = cfg['descuento_primera_compra'] ?? 20;
    return Math.round(this.precioButacas() * pct / 100);
  });

  // Descuento 50+ (solo sobre butacas)
  descuentoCincuenta = computed(() => {
    const u = this.usuario();
    const cfg = this.config();
    if (this.combo() || !u) return 0;
    const edad = this.calcularEdad(u.fecha_nacimiento);
    if (edad < 50) return 0;
    const pct = cfg['descuento_cincuenta'] ?? 15;
    return Math.round(this.precioButacas() * pct / 100);
  });

  // Total antes de creditos
  subtotalConDescuentos = computed(() => {
    return this.precioButacas() - this.descuentoPrimera() - this.descuentoCincuenta() + this.totalCandy();
  });

  total = computed(() => this.subtotalConDescuentos());

  comboPlus = computed(() => {
    const combo = this.combo();
    const butacas = this.butacasSeleccionadas();
    return !!combo && butacas.length === 1 && esButacaVip(butacas[0]);
  });

  costoCombo = computed(() => {
    const combo = this.combo();
    return combo ? puntosCombo(combo, this.comboPlus()) : 0;
  });

  cantidadItemsCandy = computed(() => {
    let total = 0;
    for (const item of this.carrito().values()) total += item.cantidad;
    return total;
  });

  // Cartel de restricción de edad
  mostrarCartelEdad = computed(() => {
    const p = this.pelicula();
    const u = this.usuario();
    if (!p || !p.restriccion_edad) return false;
    if (p.restriccion_edad === 'sin_restriccion') return false;
    if (!u) return true;

    const edad = this.calcularEdad(u.fecha_nacimiento);
    const minima =
      p.restriccion_edad === '18+' ? 18 : p.restriccion_edad === '16+' ? 16 : 13;
    return edad < minima;
  });

  async ngOnInit() {
    await this.session.cargarSesion();
    await Promise.all([
      this.cargarFuncionYPelicula(),
      this.cargarProductos(),
      this.cargarConfiguracion(),
    ]);

    await this.cargarCombo();

    if (!isPlatformBrowser(this.platformId) || this.destruido) return;
    if (!Number.isFinite(this.funcionId())) return;

    // Trae la foto actual y, si esta pestana ya tenia bloqueos, los restaura.
    await this.refrescarButacas(true);

    // Realtime solo avisa; el estado real siempre se vuelve a consultar.
    this.desuscribirRealtime = this.reserva.suscribir(this.funcionId(), () => this.programarRefresco());

    // Respaldo si Realtime se cae o el navegador esta en segundo plano.
    this.intervaloRefresco = setInterval(() => void this.refrescarButacas(), 15000);

    // Renueva el TTL de 10 minutos mientras haya butacas seleccionadas.
    this.intervaloRenovacion = setInterval(() => {
      if (this.butacasSeleccionadas().length > 0 && !this.destruido) {
        this.programarReserva(this.butacasSeleccionadas());
      }
    }, 60000);
  }

  ngOnDestroy() {
    this.destruido = true;

    if (this.temporizadorReserva) clearTimeout(this.temporizadorReserva);
    if (this.temporizadorRefresco) clearTimeout(this.temporizadorRefresco);
    if (this.intervaloRefresco) clearInterval(this.intervaloRefresco);
    if (this.intervaloRenovacion) clearInterval(this.intervaloRenovacion);

    this.desuscribirRealtime?.();
    this.desuscribirRealtime = null;
    this.reserva.desuscribir();

    // Al ir a pagar conservamos el bloqueo. En cualquier otra salida se libera.
    const funcionId = this.funcionId();
    if (!this.yendoAPagar && Number.isFinite(funcionId)) {
      void this.colaReserva
        .catch(() => undefined)
        .then(() => this.reserva.liberar(funcionId))
        .catch(() => undefined);
    }
  }

  /** Consulta la ocupacion y quita de la seleccion lo que ya no este libre. */
  private async refrescarButacas(restaurarPropias = false) {
    if (!Number.isFinite(this.funcionId())) return;

    try {
      const { vendidas, reservadas, propias } = await this.reserva.estado(this.funcionId());
      if (this.destruido) return;

      this.butacasVendidas.set(vendidas);
      this.butacasReservadas.set(reservadas);
      this.butacasPropias.set(propias);

      if (restaurarPropias && this.butacasSeleccionadas().length === 0 && propias.length > 0) {
        this.butacasSeleccionadas.set(propias);
      }

      this.quitarSeleccionNoDisponible();
    } catch {
      if (!this.destruido) {
        this.avisoButacas.set('No pudimos actualizar la ocupación. Revisá tu conexión.');
      }
    }
  }

  private quitarSeleccionNoDisponible() {
    const noDisponibles = new Set([...this.butacasVendidas(), ...this.butacasReservadas()]);
    const seleccion = this.butacasSeleccionadas();
    const disponibles = seleccion.filter(codigo => !noDisponibles.has(codigo));

    if (disponibles.length === seleccion.length) return;

    const quitadas = seleccion.filter(codigo => noDisponibles.has(codigo));
    this.butacasSeleccionadas.set(disponibles);
    this.avisoButacas.set(`Las butacas ${quitadas.join(', ')} ya no están disponibles.`);
  }

  private programarRefresco() {
    if (this.destruido) return;
    if (this.temporizadorRefresco) clearTimeout(this.temporizadorRefresco);

    this.temporizadorRefresco = setTimeout(() => {
      this.temporizadorRefresco = null;
      void this.refrescarButacas();
    }, 200);
  }

  /** El mapa cambio la seleccion: se envia al servidor con un pequeno debounce. */
  onSeleccionCambiada(codigos: string[]) {
    if (this.combo() && codigos.length > 1) {
      const ultima = codigos[codigos.length - 1];
      this.butacasSeleccionadas.set([ultima]);
      this.avisoButacas.set(
        'El combo incluye una sola butaca. Si querés más, comprá butacas por separado.'
      );
      this.programarReserva([ultima]);
      return;
    }

    this.butacasSeleccionadas.set(codigos);
    this.avisoButacas.set(null);
    this.programarReserva(codigos);
  }

  private programarReserva(codigos: string[]) {
    this.seleccionPendiente = [...codigos];
    if (this.temporizadorReserva) clearTimeout(this.temporizadorReserva);

    this.temporizadorReserva = setTimeout(() => {
      this.temporizadorReserva = null;
      this.procesarSeleccionPendiente();
    }, 150);
  }

  /**
   * Cola serial: si el usuario toca varias butacas rapido, se envia una sola
   * peticion con la ultima seleccion y nunca se pisan las respuestas.
   */
  private procesarSeleccionPendiente() {
    if (this.seleccionPendiente === null || this.destruido) return;

    const codigos = this.seleccionPendiente;
    this.seleccionPendiente = null;

    this.colaReserva = this.colaReserva
      .then(async () => { await this.ejecutarBloqueo(codigos); })
      .catch(() => undefined);
  }

  private async ejecutarBloqueo(codigos: string[], mostrarError = true): Promise<boolean> {
    if (this.destruido) return false;

    this.reservando.set(true);
    try {
      const resultado = await this.reserva.bloquear(this.funcionId(), codigos);
      if (this.destruido) return false;

      if (!resultado.ok) {
        const conflictos = resultado.conflictos;
        const detalle = conflictos.length > 0
          ? `Las butacas ${conflictos.join(', ')} ya fueron reservadas por otra persona.`
          : 'Otra persona tomó una de las butacas seleccionadas.';

        const restantes = this.butacasSeleccionadas().filter(codigo => !conflictos.includes(codigo));
        this.butacasSeleccionadas.set(restantes);
        await this.refrescarButacas();

        if (mostrarError) this.avisoButacas.set(`${detalle} Elegí otras butacas.`);
        if (restantes.length > 0) this.programarReserva(restantes);
        return false;
      }

      this.avisoButacas.set(null);
      return true;
    } catch {
      if (mostrarError && !this.destruido) {
        this.avisoButacas.set('No pudimos reservar las butacas. Revisá tu conexión e intentá de nuevo.');
      }
      return false;
    } finally {
      if (!this.destruido) this.reservando.set(false);
    }
  }

  /** Fuerza la ultima seleccion antes de salir a pagar. */
  private async asegurarReserva(): Promise<boolean> {
    if (this.temporizadorReserva) {
      clearTimeout(this.temporizadorReserva);
      this.temporizadorReserva = null;
    }
    this.seleccionPendiente = null;

    await this.colaReserva.catch(() => undefined);
    return this.ejecutarBloqueo(this.butacasSeleccionadas(), true);
  }

  async cargarFuncionYPelicula() {
    this.cargandoFuncion.set(true);
    const { data: funcion } = await this.supabase
      .from('funciones')
      .select('*, peliculas (*), salas (nombre)')
      .eq('id', this.funcionId())
      .single();

    if (funcion) {
      this.funcion.set(funcion);
      this.pelicula.set((funcion as any).peliculas);
    }
    this.cargandoFuncion.set(false);
  }

  async cargarProductos() {
    this.cargandoProductos.set(true);
    const { data } = await this.supabase.getProductosCandy();
    this.cargandoProductos.set(false);
    if (data) this.productos.set(data as ProductoCandy[]);
  }

  async cargarConfiguracion() {
    const cfg = await this.supabase.getConfiguracion();
    this.config.set(cfg);
  }

  private async cargarCombo() {
    const comboId = Number(this.route.snapshot.queryParamMap.get('combo'));
    if (!comboId) return;

    const { data, error } = await this.supabase.getCombo(comboId);
    if (error || !data) {
      this.motivoCombo.set('El combo seleccionado ya no está disponible.');
      return;
    }

    const combo = data as unknown as Combo;
    const motivo = motivoNoCanjeCombo(this.usuario(), combo);
    this.combo.set(combo);

    if (motivo) {
      this.motivoCombo.set(motivo);
      return;
    }

    this.aplicarProductosCombo(combo);
  }

  private aplicarProductosCombo(combo: Combo) {
    const actual = new Map(this.carrito());
    for (const producto of [combo.producto_1, combo.producto_2]) {
      if (!producto) continue;
      const item = actual.get(producto.id);
      actual.set(producto.id, {
        producto,
        cantidad: Math.max(1, item?.cantidad ?? 0),
      });
    }
    this.carrito.set(actual);
  }

  esProductoCombo(productoId: number): boolean {
    return productoEstaEnCombo(productoId, this.combo());
  }

  async quitarCombo() {
    const combo = this.combo();
    if (combo) {
      const actual = new Map(this.carrito());
      for (const productoId of [combo.producto_1_id, combo.producto_2_id]) {
        const item = actual.get(productoId);
        if (!item) continue;
        if (item.cantidad <= 1) {
          actual.delete(productoId);
        } else {
          actual.set(productoId, { ...item, cantidad: item.cantidad - 1 });
        }
      }
      this.carrito.set(actual);
    }

    this.combo.set(null);
    this.motivoCombo.set(null);
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { combo: null },
      queryParamsHandling: 'merge',
    });
  }

  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  cambiarTab(tab: Tab) {
    this.tabActual.set(tab);
  }

  async irAPagar() {
    this.errorCompra.set(null);

    if (this.butacasSeleccionadas().length === 0) {
      this.errorCompra.set('Seleccioná al menos una butaca.');
      return;
    }

    const combo = this.combo();
    if (combo) {
      if (this.butacasSeleccionadas().length !== 1) {
        this.errorCompra.set('El combo incluye exactamente una butaca.');
        return;
      }

      const motivo = motivoNoCanjeCombo(this.usuario(), combo, this.comboPlus());
      if (motivo) {
        this.errorCompra.set(motivo);
        return;
      }
    }

    const pel = this.pelicula();
    const func = this.funcion();
    if (!pel || !func) {
      this.errorCompra.set('No pudimos cargar la función. Recargá la página.');
      return;
    }

    // Ultima red de seguridad: confirma en Postgres antes de navegar.
    const reservadas = await this.asegurarReserva();
    if (!reservadas) {
      this.errorCompra.set('No pudimos confirmar tus butacas. Elegí otras e intentá de nuevo.');
      return;
    }

    const u = this.usuario();
    this.compraTemporal.set({
      funcion_id: this.funcionId(),
      pelicula_nombre: pel.nombre,
      funcion_fecha: func.fecha,
      funcion_hora: func.hora,
      sala_nombre: func.salas?.nombre ?? '',
      butacas: this.butacasSeleccionadas(),
      combo: this.combo(),
      combo_plus: this.comboPlus(),
      puntos_combo: this.costoCombo(),
      precio_butacas: this.precioButacas(),
      descuento_primera_compra: this.descuentoPrimera(),
      descuento_cincuenta: this.descuentoCincuenta(),
      carrito_candy: Array.from(this.carrito().values()),
      total_candy: this.totalCandy(),
      subtotal_con_descuentos: this.subtotalConDescuentos(),
      creditos_disponibles: u?.creditos ?? 0,
      creditos_usados: 0,
      total: this.total(),
    });

    // A partir de aca Pago es duenio de los bloqueos; no se liberan al destruir.
    this.yendoAPagar = true;
    const navego = await this.router.navigate(['/pago']);
    if (!navego) {
      this.yendoAPagar = false;
      this.errorCompra.set('No pudimos ir a la pantalla de pago. Intentá de nuevo.');
    }
  }

  getImagenProducto(nombreArchivo: string | null): string {
    return this.supabase.getCandyImageUrl(nombreArchivo);
  }

  cantidadDe(productoId: number): number {
    return this.carrito().get(productoId)?.cantidad ?? 0;
  }

  agregarProducto(producto: ProductoCandy) {
    const actual = new Map(this.carrito());
    const item = actual.get(producto.id);
    if (item) {
      actual.set(producto.id, { producto, cantidad: item.cantidad + 1 });
    } else {
      actual.set(producto.id, { producto, cantidad: 1 });
    }
    this.carrito.set(actual);
  }

  quitarProducto(producto: ProductoCandy) {
    const actual = new Map(this.carrito());
    const item = actual.get(producto.id);
    if (!item) return;

    if (this.esProductoCombo(producto.id) && item.cantidad <= 1) return;

    if (item.cantidad <= 1) {
      actual.delete(producto.id);
    } else {
      actual.set(producto.id, { producto, cantidad: item.cantidad - 1 });
    }
    this.carrito.set(actual);
  }
}
