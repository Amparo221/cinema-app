import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MapaButacas } from '../../components/mapa-butacas/mapa-butacas';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import { ProductoCandy, ItemCarrito } from '../../models/producto-candy.model';

type Tab = 'butacas' | 'candy';

@Component({
  selector: 'app-compra',
  standalone: true,
  imports: [CommonModule, MapaButacas],
  templateUrl: './compra.html',
  styleUrl: './compra.css',
})
export class Compra implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);

  funcionId = signal(Number(this.route.snapshot.paramMap.get('id')));
  tabActual = signal<Tab>('butacas');

  // Función y película
  funcion = signal<any>(null);
  pelicula = signal<any>(null);
  cargandoFuncion = signal(true);

  // Butacas
  butacasSeleccionadas = signal<string[]>([]);
  butacasOcupadas = signal<string[]>([]);

  // Candy
  productos = signal<ProductoCandy[]>([]);
  cargandoProductos = signal(true);
  carrito = signal<Map<number, ItemCarrito>>(new Map());

  // Configuración
  config = signal<Record<string, number>>({});
  configCargada = signal(false);

  // Descuentos y créditos
  usarCreditos = signal(false);

  // Estado de la compra
  procesando = signal(false);
  errorCompra = signal<string | null>(null);

  usuario = this.session.usuario;

  // Cálculo de precios de butacas
  precioButacas = computed(() => {
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
      total += item.producto.precio * item.cantidad;
    }
    return total;
  });

  // Descuento primera compra (solo sobre butacas)
  descuentoPrimera = computed(() => {
    const u = this.usuario();
    const cfg = this.config();
    if (!u || !u.primera_compra) return 0;
    const pct = cfg['descuento_primera_compra'] ?? 20;
    return Math.round(this.precioButacas() * pct / 100);
  });

  // Descuento 50+ (solo sobre butacas)
  descuentoCincuenta = computed(() => {
    const u = this.usuario();
    const cfg = this.config();
    if (!u) return 0;
    const edad = this.calcularEdad(u.fecha_nacimiento);
    if (edad < 50) return 0;
    const pct = cfg['descuento_cincuenta'] ?? 15;
    return Math.round(this.precioButacas() * pct / 100);
  });

  // Total antes de créditos
  subtotalConDescuentos = computed(() => {
    return this.precioButacas() - this.descuentoPrimera() - this.descuentoCincuenta() + this.totalCandy();
  });

  // Créditos aplicables
  creditosDisponibles = computed(() => {
    return this.usuario()?.creditos ?? 0;
  });

  creditosAplicados = computed(() => {
    if (!this.usarCreditos()) return 0;
    return Math.min(this.creditosDisponibles(), this.subtotalConDescuentos());
  });

  total = computed(() => {
    return Math.max(0, this.subtotalConDescuentos() - this.creditosAplicados());
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
    const minima = p.restriccion_edad === '18+' ? 18 : 13;
    return edad < minima;
  });

  async ngOnInit() {
    await Promise.all([
      this.cargarFuncionYPelicula(),
      this.cargarProductos(),
      this.cargarConfig(),
    ]);
  }

  async cargarFuncionYPelicula() {
    this.cargandoFuncion.set(true);
    const { data: funcion } = await this.supabase
      .from('funciones')
      .select('*, peliculas (*)')
      .eq('id', this.funcionId())
      .single();

    if (funcion) {
      this.funcion.set(funcion);
      this.pelicula.set((funcion as any).peliculas);
      await this.cargarButacasOcupadas();
    }
    this.cargandoFuncion.set(false);
  }

  async cargarButacasOcupadas() {
    const ocupadas = await this.supabase.getButacasOcupadas(this.funcionId());
    this.butacasOcupadas.set(ocupadas);
  }

  async cargarProductos() {
    this.cargandoProductos.set(true);
    const { data } = await this.supabase.getProductosCandy();
    this.cargandoProductos.set(false);
    if (data) this.productos.set(data as ProductoCandy[]);
  }

  async cargarConfig() {
    const cfg = await this.supabase.getConfiguracion();
    this.config.set(cfg);
    this.configCargada.set(true);
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

  onSeleccionCambiada(codigos: string[]) {
    this.butacasSeleccionadas.set(codigos);
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
    if (item.cantidad <= 1) {
      actual.delete(producto.id);
    } else {
      actual.set(producto.id, { producto, cantidad: item.cantidad - 1 });
    }
    this.carrito.set(actual);
  }

  toggleCreditos() {
    this.usarCreditos.set(!this.usarCreditos());
  }

  async irAPagar() {
    this.errorCompra.set(null);

    if (this.butacasSeleccionadas().length === 0) {
      this.errorCompra.set('Seleccioná al menos una butaca.');
      return;
    }

    this.procesando.set(true);

    const u = this.usuario();
    const totalFinal = this.total();
    const puntosSumados = Math.round(totalFinal);
    const { data: compra, error: errCompra } = await this.supabase.crearCompra({
      usuario_id: u?.id ?? null,
      funcion_id: this.funcionId(),
      cantidad_butacas: this.butacasSeleccionadas().length,
      precio_butacas: this.precioButacas(),
      precio_candy: this.totalCandy(),
      descuento_primera_compra: this.descuentoPrimera(),
      descuento_cincuenta: this.descuentoCincuenta(),
      creditos_usados: this.creditosAplicados(),
      total: totalFinal,
    });

    if (errCompra || !compra) {
      this.procesando.set(false);
      this.errorCompra.set(errCompra?.message ?? 'Error al crear la compra.');
      return;
    }

    const { error: errButacas } = await this.supabase.crearCompraButacas(
      compra.id,
      this.funcionId(),
      this.butacasSeleccionadas()
    );

    if (errButacas) {
      this.procesando.set(false);
      this.errorCompra.set('Alguna butaca ya fue ocupada por otra compra. Volvé a seleccionar.');
      await this.cargarButacasOcupadas();
      return;
    }

    if (u) {
      const nuevosPuntos = u.puntos + puntosSumados;
      const nuevosCreditos = u.creditos - this.creditosAplicados();
      await this.supabase.actualizarPerfilTrasCompra(u.id, nuevosPuntos, nuevosCreditos);
      await this.session.cargarSesion();
    }

    this.procesando.set(false);

    this.router.navigate(['/recibo', compra.id]);
  }
}