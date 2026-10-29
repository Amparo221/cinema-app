import { Component, OnInit, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionService } from './services/session';
import { Sidebar } from './components/sidebar/sidebar';
import { Campanita } from './components/campanita/campanita';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar, Campanita],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private session = inject(SessionService);
  usuario = this.session.usuario;
  rol = computed(() => this.session.usuario()?.role ?? 'anonimo');

  async ngOnInit() {
    await this.session.cargarSesion();
  }
}