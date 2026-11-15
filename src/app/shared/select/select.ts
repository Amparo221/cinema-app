import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  forwardRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Una opción de la lista: lo que se guarda (`valor`) y lo que se muestra. */
export interface OpcionSelect {
  readonly valor: string | number | null;
  readonly etiqueta: string;
  readonly deshabilitada?: boolean;
}

/** Para que cada lista tenga ids únicos cuando no se pasa un `id`. */
let siguienteId = 0;

/**
 * Select propio con la estética de la app.
 *
 * Reemplaza al `<select>` nativo: la lista se dibuja con el mismo borde
 * violeta y el chevron animado, y se maneja con mouse o teclado
 * (flechas, Home/End, Enter, Espacio, Escape y búsqueda por letra).
 *
 * Funciona con `formControlName`, `[formControl]` y `[(ngModel)]` porque
 * implementa `ControlValueAccessor`; también acepta `[(valor)]` para usarlo
 * sin formularios.
 *
 * El `id` del host se mueve al `<button>` interno en el constructor, así el
 * `<label for="...">` de toda la app sigue enfocando el control.
 */
@Component({
  selector: 'app-select',
  templateUrl: './select.html',
  styleUrl: './select.css',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select), multi: true },
  ],
  host: {
    '[class.abierto]': 'abierto()',
    '[class.deshabilitado]': 'deshabilitado()',
    '(document:click)': 'alClickFuera($event)',
  },
})
export class Select implements ControlValueAccessor {
  private readonly host: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  /** Opciones de la lista, en el orden en que se muestran. */
  readonly opciones = input<readonly OpcionSelect[]>([]);
  /** Texto que se ve mientras no hay una opción elegida. */
  readonly placeholder = input('Elegí una opción');
  /** `true` pinta el borde en rojo, como `aria-invalid` en un control nativo. */
  readonly invalido = input(false);
  /** Id del texto de ayuda o de error para `aria-describedby`. */
  readonly ayudaId = input<string | null>(null);
  /** Nombre accesible cuando el campo no tiene un `<label>` asociado. */
  readonly etiquetaAria = input<string | null>(null);

  /** Valor elegido: sirve para `[(valor)]` además de los formularios. */
  readonly valor = model<string | number | null>(null);

  /** Id explícito para los casos con `[id]` dinámico (por ejemplo, un select por combo). */
  readonly idControl = input<string | null>(null);

  readonly abierto = signal(false);
  readonly deshabilitado = signal(false);
  /** Índice resaltado con las flechas del teclado. */
  readonly activo = signal(0);

  /** Id del botón (el que tenía el host) y de la lista que controla. */
  private readonly idInicial: string;
  readonly idBoton = computed(() => this.idControl() ?? this.idInicial);
  readonly idLista = computed(() => `${this.idBoton()}-lista`);

  private alCambiarValor: (valor: string | number | null) => void = () => {};
  private alTocar: () => void = () => {};

  /** Letras tipeadas seguidas para saltar a una opción. */
  private bufferTeclado = '';
  private temporizadorTeclado: ReturnType<typeof setTimeout> | undefined;

  readonly seleccionada = computed(
    () => this.opciones().find((opcion) => opcion.valor === this.valor()) ?? null,
  );
  readonly texto = computed(() => this.seleccionada()?.etiqueta ?? this.placeholder());
  readonly sinSeleccion = computed(() => this.seleccionada() === null);

  constructor() {
    const idHost = this.host.id;
    this.idInicial = idHost || `app-select-${++siguienteId}`;

    // El control accesible es el botón: el id tiene que estar ahí para que
    // los `<label for="...">` lo encuentren.
    if (idHost) this.host.removeAttribute('id');

    this.destroyRef.onDestroy(() => clearTimeout(this.temporizadorTeclado));
  }

  writeValue(valor: string | number | null): void {
    this.valor.set(valor ?? null);
    this.sincronizarActivo();
  }

  registerOnChange(fn: (valor: string | number | null) => void): void {
    this.alCambiarValor = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocar = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
    if (deshabilitado) this.cerrar();
  }

  opcionId(indice: number): string {
    return `${this.idLista()}-opcion-${indice}`;
  }

  alternar(): void {
    if (this.abierto()) this.cerrar();
    else this.abrir();
  }

  abrir(): void {
    if (this.deshabilitado()) return;
    this.sincronizarActivo();
    this.abierto.set(true);
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  /** El mouse solo resalta; la opción se elige con el clic. */
  activar(indice: number): void {
    if (this.opciones()[indice]?.deshabilitada) return;
    this.activo.set(indice);
  }

  /** Evita que el botón pierda el foco antes del clic. */
  prevenir(evento: MouseEvent): void {
    evento.preventDefault();
  }

  elegir(opcion: OpcionSelect): void {
    if (opcion.deshabilitada) return;

    this.valor.set(opcion.valor);
    this.alCambiarValor(opcion.valor);
    this.alTocar();
    this.cerrar();
    this.host.querySelector('button')?.focus();
  }

  alSalir(): void {
    this.alTocar();
    this.cerrar();
  }

  alClickFuera(evento: MouseEvent): void {
    if (!this.abierto()) return;

    const objetivo = evento.target as Node | null;
    if (objetivo && this.host.contains(objetivo)) return;

    this.cerrar();
  }

  alTeclear(evento: KeyboardEvent): void {
    if (this.deshabilitado()) return;

    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        if (this.abierto()) this.mover(1);
        else this.abrir();
        return;
      case 'ArrowUp':
        evento.preventDefault();
        if (this.abierto()) this.mover(-1);
        else this.abrir();
        return;
      case 'Home':
        evento.preventDefault();
        this.moverA(0);
        return;
      case 'End':
        evento.preventDefault();
        this.moverA(this.opciones().length - 1);
        return;
      case 'Enter':
      case ' ':
        // Espacio y Enter no deben enviar el formulario ni disparar un clic
        // extra: el select los maneja como "abrir" y "elegir".
        evento.preventDefault();
        if (this.abierto()) this.confirmarActivo();
        else this.abrir();
        return;
      case 'Escape':
        if (this.abierto()) {
          evento.preventDefault();
          this.cerrar();
        }
        return;
      case 'Tab':
        this.cerrar();
        return;
      default:
        this.buscarPorLetra(evento);
    }
  }

  private confirmarActivo(): void {
    const opcion = this.opciones()[this.activo()];
    if (opcion) this.elegir(opcion);
  }

  private mover(paso: number): void {
    const opciones = this.opciones();
    if (opciones.length === 0) return;

    let indice = this.activo();
    for (let intento = 0; intento < opciones.length; intento++) {
      indice = (indice + paso + opciones.length) % opciones.length;
      if (!opciones[indice].deshabilitada) break;
    }

    this.activo.set(indice);
    this.desplazarActivo();
  }

  private moverA(indice: number): void {
    const opciones = this.opciones();
    if (opciones.length === 0) return;

    const destino = indice < 0 ? 0 : Math.min(indice, opciones.length - 1);
    this.activo.set(destino);
    this.desplazarActivo();
  }

  /** Mantiene visible la opción resaltada dentro de la lista. */
  private desplazarActivo(): void {
    const id = this.opcionId(this.activo());
    const elemento = this.host.querySelector<HTMLElement>(`[id="${id}"]`);
    elemento?.scrollIntoView?.({ block: 'nearest' });
  }

  /** Salta a la primera opción que empieza con lo tipeado. */
  private buscarPorLetra(evento: KeyboardEvent): void {
    if (evento.key.length !== 1 || evento.ctrlKey || evento.altKey || evento.metaKey) return;

    clearTimeout(this.temporizadorTeclado);
    this.temporizadorTeclado = setTimeout(() => (this.bufferTeclado = ''), 500);
    this.bufferTeclado += evento.key.toLocaleLowerCase();

    const opciones = this.opciones();
    const indice = opciones.findIndex(
      (opcion) =>
        !opcion.deshabilitada &&
        opcion.etiqueta.toLocaleLowerCase().startsWith(this.bufferTeclado),
    );
    if (indice < 0) return;

    evento.preventDefault();
    if (!this.abierto()) this.abrir();
    this.activo.set(indice);
    this.desplazarActivo();
  }

  private sincronizarActivo(): void {
    const indice = this.opciones().findIndex((opcion) => opcion.valor === this.valor());
    this.activo.set(indice >= 0 ? indice : this.primerHabilitado());
  }

  private primerHabilitado(): number {
    const indice = this.opciones().findIndex((opcion) => !opcion.deshabilitada);
    return indice >= 0 ? indice : 0;
  }
}

