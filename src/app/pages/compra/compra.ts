import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MapaButacas } from '../../components/mapa-butacas/mapa-butacas';

@Component({
  selector: 'app-compra',
  standalone: true,
  imports: [MapaButacas],
  templateUrl: './compra.html',
  styleUrl: './compra.css',
})
export class Compra {
  private route = inject(ActivatedRoute);
  funcionId = signal(Number(this.route.snapshot.paramMap.get('id')));
  butacasSeleccionadas = signal<string[]>([]);

  onSeleccionCambiada(codigos: string[]) {
    this.butacasSeleccionadas.set(codigos);
  }
}