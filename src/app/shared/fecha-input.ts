import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  DIGITOS_FECHA,
  LARGO_FECHA,
  PLACEHOLDER_FECHA,
  enmascararFecha,
  fechaAIso,
  isoAFecha,
  posicionDelCursor,
  soloDigitos,
} from './fecha-mascara';

/**
 * Input de fecha con máscara `dd/mm/aaaa`.
 *
 * El usuario escribe solo dígitos y las barras se insertan solas; lo que se
 * guarda en el formulario sigue siendo ISO (`aaaa-mm-dd`), así los RPC y las
 * consultas no cambian. Funciona con `formControlName`, `[formControl]` y
 * `[(ngModel)]` porque implementa `ControlValueAccessor`.
 *
 * Si la fecha queda incompleta o no existe (por ejemplo `31/02/2006`),
 * el control vale `''` y el formulario la marca como requerida.
 */
@Directive({
  selector: 'input[appFecha]',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FechaInput), multi: true },
  ],
  host: {
    type: 'text',
    inputmode: 'numeric',
    autocomplete: 'off',
    maxlength: String(LARGO_FECHA),
    placeholder: PLACEHOLDER_FECHA,
    '(input)': 'alEscribir($event)',
    '(blur)': 'alSalir()',
  },
})
export class FechaInput implements ControlValueAccessor {
  private readonly host: ElementRef<HTMLInputElement> = inject(ElementRef);

  /** Último valor ISO avisado al formulario. */
  private iso = '';

  /** `true` mientras el usuario escribe: evita pisar un texto parcial. */
  private escribiendo = false;

  private alCambiarValor: (valor: string) => void = () => {};
  private alTocar: () => void = () => {};

  writeValue(valor: string | null): void {
    this.iso = valor ?? '';

    const texto = isoAFecha(this.iso);
    const input = this.host.nativeElement;

    // Si el texto ya coincide no se reescribe: así el caret no salta al final.
    if (input.value === texto) return;

    // Mientras escribe, un valor vacío no borra lo que va tipeando.
    if (this.escribiendo && texto === '' && soloDigitos(input.value).length < DIGITOS_FECHA) {
      return;
    }

    input.value = texto;
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.alCambiarValor = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocar = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.host.nativeElement.disabled = deshabilitado;
  }

  /** Enmascara lo escrito y avisa el ISO cuando la fecha está completa. */
  protected alEscribir(evento: Event): void {
    const input = evento.target as HTMLInputElement;

    const hastaCursor = input.value.slice(0, input.selectionStart ?? input.value.length);
    const digitosAntes = soloDigitos(hastaCursor).length;

    this.escribiendo = true;

    const texto = enmascararFecha(input.value);
    input.value = texto;

    const posicion = posicionDelCursor(texto, digitosAntes);
    input.setSelectionRange(posicion, posicion);

    const iso = fechaAIso(texto);
    if (iso === this.iso) return;

    this.iso = iso;
    this.alCambiarValor(iso);
  }

  protected alSalir(): void {
    this.escribiendo = false;
    this.alTocar();
  }
}
