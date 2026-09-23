import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-recibo',
  standalone: true,
  imports: [],
  templateUrl: './recibo.html',
  styleUrl: './recibo.css',
})
export class Recibo implements OnInit {
  private route = inject(ActivatedRoute);
  private supabase = inject(SupabaseService);

  compra = signal<any>(null);
  cargando = signal(true);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    const { data } = await this.supabase
      .from('compras')
      .select(`
        *,
        funciones (fecha, hora, peliculas (nombre), salas (nombre))
      `)
      .eq('id', id)
      .single();

    this.compra.set(data);
    this.cargando.set(false);
  }
}