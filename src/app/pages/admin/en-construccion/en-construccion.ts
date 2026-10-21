import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-admin-en-construccion',
  template: `
    <section class="en-construccion" aria-labelledby="titulo-seccion">
      <h1 id="titulo-seccion">{{ titulo }}</h1>
      <p>{{ descripcion }}</p>
      <p class="aviso" role="status">
        En construcción. Esta sección estará disponible próximamente.
      </p>
    </section>
  `,
  styles: `
    .en-construccion {
      max-width: 42rem;
      margin: 2rem auto;
      padding: 2rem;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    h1 {
      margin-top: 0;
    }

    .aviso {
      margin-bottom: 0;
      padding: 0.75rem 1rem;
      border-left: 4px solid #b26a00;
      border-radius: 4px;
      background: #fff8e1;
      color: #5c3a00;
    }
  `,
})
export class AdminEnConstruccion {
  private route = inject(ActivatedRoute);

  readonly titulo = String(this.route.snapshot.data['titulo'] ?? 'En construcción');
  readonly descripcion = String(this.route.snapshot.data['descripcion'] ?? '');
}
