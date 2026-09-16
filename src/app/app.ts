import { Component, OnInit, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionService } from './services/session';
import { Sidebar } from './components/sidebar/sidebar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private session = inject(SessionService);
  rol = computed(() => this.session.usuario()?.role ?? 'anonimo');

  async ngOnInit() {
    await this.session.cargarSesion();
  }
}