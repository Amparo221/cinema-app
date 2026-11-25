import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase';
import { SessionService } from '../../../services/session';
import { RolForm } from '../../../components/admin/rol-form/rol-form';
import { OpcionSelect, Select } from '../../../shared/select/select';
import { ETIQUETAS_SECCION, SeccionAdmin } from '../../../models/rol.model';
import {
  DatosRol,
  RolAdmin,
  USUARIOS_POR_PAGINA,
  UsuarioRol,
  mensajeErrorRol,
  nombreCompleto,
  puedeAsignarRolA,
  puedeEditarRol,
  puedeEliminarRol,
} from '../../../models/rol-admin.model';

/**
 * Administración de roles (solo dueño).
 *
 * Arriba los roles: `dueño` y `registrado` se muestran en solo lectura,
 * mientras que `empleado`, `admin` y los roles propios se pueden editar.
 * Solo los roles propios se pueden borrar (y siempre que no tengan
 * usuarios). Abajo el buscador de usuarios para cambiarles el rol.
 */
@Component({
  selector: 'app-admin-roles',
  imports: [FormsModule, RolForm, Select],
  templateUrl: './roles.html',
  styleUrl: './roles.css',
})
export class AdminRoles implements OnInit {
  private supabase = inject(SupabaseService);
  private session = inject(SessionService);

  roles = signal<RolAdmin[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  mostrarForm = signal(false);
  rolEnEdicion = signal<RolAdmin | null>(null);
  guardando = signal(false);
  errorForm = signal<string | null>(null);

  /** Rol cuyo borrado se está confirmando. */
  eliminando = signal<string | null>(null);
  borrando = signal<string | null>(null);

  usuarios = signal<UsuarioRol[]>([]);
  cargandoUsuarios = signal(true);
  errorUsuarios = signal<string | null>(null);
  textoUsuarios = signal('');
  paginaUsuarios = signal(1);
  totalUsuarios = signal(0);
  readonly porPagina = USUARIOS_POR_PAGINA;

  /** Usuario al que se le está eligiendo un rol nuevo. */
  cambiandoId = signal<string | null>(null);
  rolElegido = signal('');
  asignando = signal<string | null>(null);

  readonly usuarioActualId = computed(() => this.session.usuario()?.id);
  readonly totalPaginasUsuarios = computed(() =>
    Math.max(1, Math.ceil(this.totalUsuarios() / this.porPagina)),
  );
  readonly vacioUsuarios = computed(
    () => !this.cargandoUsuarios() && this.usuarios().length === 0,
  );
  readonly opcionesRoles = computed<readonly OpcionSelect[]>(() =>
    this.roles().map((rol) => ({
      valor: rol.nombre,
      etiqueta: rol.nombre === rol.etiqueta ? rol.etiqueta : `${rol.etiqueta} (${rol.nombre})`,
    })),
  );

  readonly nombreCompleto = nombreCompleto;
  readonly etiquetaSeccion = (seccion: SeccionAdmin): string => ETIQUETAS_SECCION[seccion];

  async ngOnInit(): Promise<void> {
    await this.cargarRoles();
    await this.cargarUsuarios();
  }

  abrirFormNuevo(): void {
    this.error.set(null);
    this.mensaje.set(null);
    this.errorForm.set(null);
    this.rolEnEdicion.set(null);
    this.mostrarForm.set(true);
  }

  editarRol(rol: RolAdmin): void {
    this.error.set(null);
    this.mensaje.set(null);
    this.errorForm.set(null);
    this.rolEnEdicion.set(rol);
    this.mostrarForm.set(true);
  }

  cerrarForm(): void {
    this.mostrarForm.set(false);
    this.rolEnEdicion.set(null);
    this.errorForm.set(null);
  }

  async guardarRol(datos: DatosRol): Promise<void> {
    if (this.guardando()) return;

    const enEdicion = this.rolEnEdicion();
    this.guardando.set(true);
    this.errorForm.set(null);

    const { error } = enEdicion
      ? await this.supabase.actualizarRol(enEdicion.nombre, datos.etiqueta, datos.secciones)
      : await this.supabase.crearRol(datos.nombre, datos.etiqueta, datos.secciones);

    this.guardando.set(false);

    if (error) {
      this.errorForm.set(mensajeErrorRol(error.message));
      return;
    }

    this.mostrarForm.set(false);
    this.rolEnEdicion.set(null);
    this.mensaje.set(
      enEdicion ? `Rol «${datos.etiqueta}» actualizado.` : `Rol «${datos.etiqueta}» creado.`,
    );
    await Promise.all([this.cargarRoles(), this.cargarUsuarios()]);
  }

  /** Roles del sistema editables: `empleado`, `admin` y los propios. */
  puedeEditar(rol: RolAdmin): boolean {
    return puedeEditarRol(rol);
  }

  /** Borrar queda reservado a los roles creados desde este panel. */
  puedeEliminar(rol: RolAdmin): boolean {
    return puedeEliminarRol(rol);
  }

  pedirEliminar(nombre: string): void {
    this.eliminando.set(nombre);
    this.error.set(null);
    this.mensaje.set(null);
  }

  cancelarEliminar(): void {
    this.eliminando.set(null);
  }

  async eliminarRol(rol: RolAdmin): Promise<void> {
    if (this.borrando()) return;

    this.borrando.set(rol.nombre);
    this.error.set(null);

    const { error } = await this.supabase.eliminarRol(rol.nombre);

    this.borrando.set(null);

    if (error) {
      this.error.set(mensajeErrorRol(error.message));
      return;
    }

    this.eliminando.set(null);
    this.mensaje.set(`Rol «${rol.etiqueta}» eliminado.`);
    await this.cargarRoles();
  }

  /** Un dueño no puede cambiarse el rol a sí mismo. */
  puedeCambiar(usuario: UsuarioRol): boolean {
    return puedeAsignarRolA(usuario.id, this.usuarioActualId());
  }

  abrirCambio(usuario: UsuarioRol): void {
    this.cambiandoId.set(usuario.id);
    this.rolElegido.set(usuario.rol);
    this.errorUsuarios.set(null);
    this.mensaje.set(null);
  }

  cancelarCambio(): void {
    this.cambiandoId.set(null);
    this.rolElegido.set('');
  }

  cambiarRolElegido(valor: string | number | null): void {
    this.rolElegido.set(valor === null ? '' : String(valor));
  }

  async asignar(usuario: UsuarioRol): Promise<void> {
    const rol = this.rolElegido();
    if (!rol || this.asignando()) return;

    this.asignando.set(usuario.id);
    this.errorUsuarios.set(null);

    const { error } = await this.supabase.asignarRol(usuario.id, rol);

    this.asignando.set(null);

    if (error) {
      this.errorUsuarios.set(mensajeErrorRol(error.message));
      return;
    }

    this.cancelarCambio();
    this.mensaje.set(`Rol de ${nombreCompleto(usuario)} actualizado.`);
    await Promise.all([this.cargarUsuarios(), this.cargarRoles()]);
  }

  cambiarTextoUsuarios(evento: Event): void {
    const objetivo = evento.target as HTMLInputElement | null;
    this.textoUsuarios.set(objetivo?.value ?? '');
  }

  buscarUsuarios(evento: Event): void {
    evento.preventDefault();
    this.paginaUsuarios.set(1);
    void this.cargarUsuarios();
  }

  limpiarBusqueda(): void {
    this.textoUsuarios.set('');
    this.paginaUsuarios.set(1);
    void this.cargarUsuarios();
  }

  irAnteriorUsuarios(): void {
    if (this.paginaUsuarios() <= 1) return;
    this.paginaUsuarios.update((valor) => valor - 1);
    void this.cargarUsuarios();
  }

  irSiguienteUsuarios(): void {
    if (this.paginaUsuarios() >= this.totalPaginasUsuarios()) return;
    this.paginaUsuarios.update((valor) => valor + 1);
    void this.cargarUsuarios();
  }

  private async cargarRoles(): Promise<void> {
    this.cargando.set(true);

    const { data, error } = await this.supabase.getRoles();

    this.cargando.set(false);

    if (error) {
      this.error.set(mensajeErrorRol(error.message));
      this.roles.set([]);
      return;
    }

    this.roles.set((data ?? []) as RolAdmin[]);
  }

  private async cargarUsuarios(): Promise<void> {
    this.cargandoUsuarios.set(true);
    this.errorUsuarios.set(null);

    const { data, error } = await this.supabase.getUsuariosDeRol(
      this.textoUsuarios(),
      this.porPagina,
      (this.paginaUsuarios() - 1) * this.porPagina,
    );

    this.cargandoUsuarios.set(false);

    if (error) {
      this.errorUsuarios.set(mensajeErrorRol(error.message));
      this.usuarios.set([]);
      this.totalUsuarios.set(0);
      return;
    }

    const filas = (data ?? []) as UsuarioRol[];

    // Si la búsqueda dejó la página vacía, se vuelve a la primera.
    if (filas.length === 0 && this.paginaUsuarios() > 1) {
      this.paginaUsuarios.set(1);
      await this.cargarUsuarios();
      return;
    }

    this.usuarios.set(filas);
    this.totalUsuarios.set(filas.length > 0 ? Number(filas[0].total) : 0);
  }
}
