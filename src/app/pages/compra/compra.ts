import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MapaButacas } from '../../components/mapa-butacas/mapa-butacas';
import { SupabaseService } from '../../services/supabase';
import { SessionService } from '../../services/session';
import { ProductoCandy, ItemCarrito } from '../../models/producto-candy.model';
import { CompraTemporalService } from '../../services/compra-temporal';

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
  private compraTemporal = inject(CompraTemporalService);

  funcionId = signal(Number(this.route.snapshot.paramMap.get('id')));
  tabActual = signal<Tab>('butacas');

  //SIGNALS
  funcion = signal<any>(null);
  pelicula = signal<any>(null);
  cargandoFuncion = signal(true);

  butacasSeleccionadas = signal<string[]>([]);
  butacasOcupadas = signal<string[]>([]);

  productos = signal<ProductoCandy[]>([]);
  cargandoProductos = signal(true);
  carrito = signal<Map<number, ItemCarrito>>(new Map());

  config = signal<Record<string, number>>({});

  errorCompra = signal<string | null>(null);

  usuario = this.session.usuario;

  // Calculo de precios de butacas
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

  // Total antes de creditos
  subtotalConDescuentos = computed(() => {
    return this.precioButacas() - this.descuentoPrimera() - this.descuentoCincuenta() + this.totalCandy();
  });

  total = computed(() => this.subtotalConDescuentos());

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

    irAPagar() {
    this.errorCompra.set(null);

    if (this.butacasSeleccionadas().length === 0) {
      this.errorCompra.set('Seleccioná al menos una butaca.');
      return;
    }

    const u = this.usuario();
    const pel = this.pelicula();
    const func = this.funcion();


      this.compraTemporal.set({
      funcion_id: this.funcionId(),
      pelicula_nombre: pel.nombre,
      funcion_fecha: func.fecha,
      funcion_hora: func.hora,
      sala_nombre: func.salas?.nombre ?? '',
      butacas: this.butacasSeleccionadas(),
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

    this.router.navigate(['/pago']);
  }
}