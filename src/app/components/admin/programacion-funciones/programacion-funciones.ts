import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { fechaHoy } from '../../../models/preventa.model';
import {
  DIAS_SEMANA,
  FORMATOS_FUNCION,
  IDIOMAS_FUNCION,
  MAXIMO_FUNCIONES_AUTOMATICAS,
  MAXIMO_FUNCIONES_MANUALES,
  FormatoFuncion,
  FuncionOcupada,
  FuncionProgramada,
  IdiomaFuncion,
  ModoProgramacion,
  SolicitudFunciones,
  claveFuncion,
  combinarFuncionesManuales,
  combinarTipos,
  detectarConflictos,
  etiquetaIdioma,
  etiquetaTipo,
  fechasEnRango,
  horariosDelDia,
  sumarDias,
} from '../../../models/programacion.model';
import { FechaInput } from '../../../shared/fecha-input';
import { SupabaseService } from '../../../services/supabase';

/** “20/11” para listas y avisos. */
function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return anio && mes && dia ? `${dia}/${mes}` : fecha;
}

@Component({
  selector: 'app-programacion-funciones',
  imports: [ReactiveFormsModule, FechaInput],
  templateUrl: './programacion-funciones.html',
  styleUrl: './programacion-funciones.css',
})
export class ProgramacionFunciones {
  private fb = inject(NonNullableFormBuilder);
  private supabase = inject(SupabaseService);

  /** Para que los ids del formulario no se repitan si hay dos instancias. */
  private static instancia = 0;
  readonly idBase = `programacion-${ProgramacionFunciones.instancia++}`;

  /** Duración de la película en minutos. */
  duracion = input(90);
  /** Primera fecha programable: hoy o la fecha de estreno. */
  fechaMinima = input(fechaHoy());
  /** En el alta de película el botón lo pone el formulario padre. */
  mostrarBoton = input(true);
  guardando = input(false);

  generar = output<SolicitudFunciones>();

  readonly dias = DIAS_SEMANA;
  readonly formatos = FORMATOS_FUNCION;
  readonly idiomas = IDIOMAS_FUNCION;
  readonly etiquetaTipo = etiquetaTipo;
  readonly etiquetaIdioma = etiquetaIdioma;
  readonly fechaCorta = fechaCorta;
  readonly claveFuncion = claveFuncion;

  modo = signal<ModoProgramacion>('automatica');

  private readonly hoy = fechaHoy();

  formAuto = this.fb.group({
    desde: [this.hoy, Validators.required],
    hasta: [sumarDias(this.hoy, 30), Validators.required],
    porDia: [3, [Validators.required, Validators.min(1), Validators.max(12)]],
    horaInicio: ['14:00', Validators.required],
    horaFin: ['23:30', Validators.required],
  });

  formManual = this.fb.group({
    fechaNueva: [''],
    horaNueva: [''],
  });

  diasSemana = signal<number[]>([5, 6, 0]);
  idiomasAuto = signal<IdiomaFuncion[]>(['castellano']);
  formatosAuto = signal<FormatoFuncion[]>(['2D']);

  fechas = signal<string[]>([]);
  horas = signal<string[]>([]);
  idiomasManual = signal<IdiomaFuncion[]>(['castellano']);
  formatosManual = signal<FormatoFuncion[]>(['2D']);

  errorFecha = signal<string | null>(null);
  errorHora = signal<string | null>(null);

  funcionesOcupadas = signal<FuncionOcupada[]>([]);
  cargandoOcupadas = signal(false);
  private pedidoOcupadas = 0;

  private readonly valorDesde = toSignal(this.formAuto.controls.desde.valueChanges, {
    initialValue: this.formAuto.controls.desde.value,
  });

  private readonly valorHasta = toSignal(this.formAuto.controls.hasta.valueChanges, {
    initialValue: this.formAuto.controls.hasta.value,
  });

  private readonly valorPorDia = toSignal(this.formAuto.controls.porDia.valueChanges, {
    initialValue: this.formAuto.controls.porDia.value,
  });

  private readonly valorHoraInicio = toSignal(this.formAuto.controls.horaInicio.valueChanges, {
    initialValue: this.formAuto.controls.horaInicio.value,
  });

  private readonly valorHoraFin = toSignal(this.formAuto.controls.horaFin.valueChanges, {
    initialValue: this.formAuto.controls.horaFin.value,
  });

  readonly fechasAuto = computed(() =>
    fechasEnRango(this.valorDesde(), this.valorHasta(), this.diasSemana())
  );

  readonly tiposAuto = computed(() => combinarTipos(this.idiomasAuto(), this.formatosAuto()));

  readonly horariosAuto = computed(() =>
    horariosDelDia({
      duracion: this.duracion(),
      porDia: this.valorPorDia(),
      horaInicio: this.valorHoraInicio(),
      horaFin: this.valorHoraFin(),
    })
  );

  readonly totalAuto = computed(() => {
    const porDia = this.valorPorDia();
    if (!Number.isFinite(porDia) || porDia < 1) return 0;
    return this.fechasAuto().length * porDia;
  });

  readonly diasTexto = computed(() => {
    const nombres = DIAS_SEMANA.filter(dia => this.diasSemana().includes(dia.valor)).map(
      dia => dia.largo
    );
    if (nombres.length === 0) return '';
    if (nombres.length === 1) return nombres[0] ?? '';
    return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  });

  readonly errorAuto = computed<string | null>(() => {
    const desde = this.valorDesde();
    const hasta = this.valorHasta();

    if (!desde || !hasta) return 'Elegí el rango de fechas.';
    if (hasta < desde) return 'La fecha "hasta" no puede ser anterior a "desde".';
    if (desde < this.fechaMinima()) {
      return `No se puede programar antes del ${fechaCorta(this.fechaMinima())}.`;
    }

    const porDia = this.valorPorDia();
    if (!Number.isFinite(porDia) || porDia < 1 || porDia > 12) {
      return 'La cantidad de funciones por día tiene que estar entre 1 y 12.';
    }

    if (this.diasSemana().length === 0) return 'Elegí al menos un día de la semana.';
    if (this.tiposAuto().length === 0) return 'Elegí al menos un idioma y un formato.';

    const fechas = this.fechasAuto();
    if (fechas.length === 0) return 'El rango no tiene ningún día de los seleccionados.';

    if (fechas.length * porDia > MAXIMO_FUNCIONES_AUTOMATICAS) {
      return `El lote supera las ${MAXIMO_FUNCIONES_AUTOMATICAS} funciones. Achicá el rango o la cantidad por día.`;
    }

    if (this.horariosAuto().length === 0) {
      return `La ventana horaria no alcanza para ${this.duracion()} minutos de película más 30 de limpieza.`;
    }

    return null;
  });

  readonly tiposManual = computed(() => combinarTipos(this.idiomasManual(), this.formatosManual()));

  readonly funcionesManuales = computed(() =>
    combinarFuncionesManuales(this.fechas(), this.horas(), this.tiposManual())
  );

  private readonly listaConflictos = computed(() =>
    detectarConflictos(this.funcionesManuales(), this.funcionesOcupadas(), this.duracion())
  );

  /** Mensaje de choque por cada función propuesta. */
  readonly conflictosPorSlot = computed(() => {
    const mapa = new Map<string, string>();
    for (const conflicto of this.listaConflictos()) {
      mapa.set(claveFuncion(conflicto.funcion), conflicto.mensaje);
    }
    return mapa;
  });

  readonly tieneConflictos = computed(() => this.conflictosPorSlot().size > 0);

  readonly errorManual = computed<string | null>(() => {
    if (this.fechas().length === 0) return 'Agregá al menos una fecha.';
    if (this.horas().length === 0) return 'Agregá al menos un horario.';
    if (this.tiposManual().length === 0) return 'Elegí al menos un idioma y un formato.';

    const pasada = this.fechas().find(fecha => fecha < this.fechaMinima());
    if (pasada) return `La fecha ${fechaCorta(pasada)} es anterior al mínimo permitido.`;

    if (this.funcionesManuales().length > MAXIMO_FUNCIONES_MANUALES) {
      return `El lote supera las ${MAXIMO_FUNCIONES_MANUALES} funciones. Sacá alguna fecha u horario.`;
    }

    if (this.tieneConflictos()) {
      return 'Hay horarios que se superponen con funciones existentes.';
    }

    return null;
  });

  readonly puedeGenerar = computed(() => {
    if (this.guardando()) return false;
    if (this.modo() === 'automatica') return this.errorAuto() === null;

    return this.errorManual() === null && !this.cargandoOcupadas();
  });

  readonly solicitud = computed<SolicitudFunciones | null>(() => {
    if (this.modo() === 'automatica') {
      if (this.errorAuto() !== null) return null;

      return {
        modo: 'automatica',
        desde: this.valorDesde(),
        hasta: this.valorHasta(),
        diasSemana: [...this.diasSemana()].sort((a, b) => a - b),
        porDia: this.valorPorDia(),
        horaInicio: this.valorHoraInicio(),
        horaFin: this.valorHoraFin(),
        tipos: this.tiposAuto(),
      };
    }

    if (this.errorManual() !== null) return null;
    return { modo: 'manual', funciones: this.funcionesManuales() };
  });

  constructor() {
    // El chequeo de choques necesita las funciones ya programadas del
    // rango elegido. Se refresca al cambiar de pestaña o las fechas.
    effect(() => {
      const modo = this.modo();
      const fechas = this.fechas();

      if (modo !== 'manual' || fechas.length === 0) {
        untracked(() => {
          this.funcionesOcupadas.set([]);
          this.cargandoOcupadas.set(false);
        });
        return;
      }

      const ordenadas = [...fechas].sort();
      const desde = ordenadas[0];
      const hasta = ordenadas[ordenadas.length - 1];
      if (!desde || !hasta) return;

      untracked(() => void this.cargarOcupadas(desde, hasta));
    });
  }

  cambiarModo(modo: ModoProgramacion) {
    this.modo.set(modo);
  }

  /** Flechas izquierda/derecha para mover el foco entre las pestañas. */
  onTabKeydown(evento: KeyboardEvent) {
    if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;

    evento.preventDefault();
    const siguiente: ModoProgramacion = this.modo() === 'automatica' ? 'manual' : 'automatica';
    this.cambiarModo(siguiente);

    const id = `${this.idBase}-tab-${siguiente === 'automatica' ? 'auto' : 'manual'}`;
    document.getElementById(id)?.focus();
  }

  alternarDia(valor: number) {
    this.diasSemana.update(dias =>
      dias.includes(valor) ? dias.filter(dia => dia !== valor) : [...dias, valor]
    );
  }

  alternarIdioma(ambito: ModoProgramacion, idioma: IdiomaFuncion) {
    const objetivo = ambito === 'automatica' ? this.idiomasAuto : this.idiomasManual;
    objetivo.update(idiomas =>
      idiomas.includes(idioma) ? idiomas.filter(item => item !== idioma) : [...idiomas, idioma]
    );
  }

  alternarFormato(ambito: ModoProgramacion, formato: FormatoFuncion) {
    const objetivo = ambito === 'automatica' ? this.formatosAuto : this.formatosManual;
    objetivo.update(formatos =>
      formatos.includes(formato)
        ? formatos.filter(item => item !== formato)
        : [...formatos, formato]
    );
  }

  agregarFecha() {
    const valor = this.formManual.controls.fechaNueva.value.trim();
    if (!valor) return;

    if (valor < this.fechaMinima()) {
      this.errorFecha.set(`No se puede programar antes del ${fechaCorta(this.fechaMinima())}.`);
      return;
    }

    this.errorFecha.set(null);
    this.fechas.update(fechas => [...new Set([...fechas, valor])].sort());
    this.formManual.controls.fechaNueva.setValue('');
  }

  quitarFecha(fecha: string) {
    this.fechas.update(fechas => fechas.filter(item => item !== fecha));
  }

  agregarHora() {
    const valor = this.formManual.controls.horaNueva.value.trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(valor)) {
      this.errorHora.set('Usá el formato HH:mm (por ejemplo 18:30).');
      return;
    }

    this.errorHora.set(null);
    this.horas.update(horas => [...new Set([...horas, valor])].sort());
    this.formManual.controls.horaNueva.setValue('');
  }

  quitarHora(hora: string) {
    this.horas.update(horas => horas.filter(item => item !== hora));
  }

  conflictoDe(funcion: FuncionProgramada): string | null {
    return this.conflictosPorSlot().get(claveFuncion(funcion)) ?? null;
  }

  onGenerar() {
    if (!this.puedeGenerar()) return;

    const solicitud = this.solicitud();
    if (!solicitud) return;

    this.generar.emit(solicitud);
  }

  private async cargarOcupadas(desde: string, hasta: string) {
    const pedido = ++this.pedidoOcupadas;
    this.cargandoOcupadas.set(true);

    try {
      const { data, error } = await this.supabase.getFuncionesEnRango(desde, hasta);
      if (pedido !== this.pedidoOcupadas) return;

      if (error) {
        this.funcionesOcupadas.set([]);
        return;
      }

      this.funcionesOcupadas.set((data ?? []) as unknown as FuncionOcupada[]);
    } catch {
      if (pedido === this.pedidoOcupadas) this.funcionesOcupadas.set([]);
    } finally {
      if (pedido === this.pedidoOcupadas) this.cargandoOcupadas.set(false);
    }
  }
}
