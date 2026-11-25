Actúa como un desarrollador experto en Angular 18+ y Supabase. Estás auditando mi Trabajo Práctico Final. A continuación, te presento el contexto de lo que exige la cátedra. Necesito que analices mi código y me digas qué estoy aplicando, qué me falta y qué estoy haciendo mal según estos criterios:

explicame cada una de estas cosas, punto a punto, donde estan en mi codigo, y como es la logica de dicho codigo

Contexto de la cátedra (Requisitos a evaluar):

    Arquitectura: Debe ser una SPA con componentes standalone. Se debe usar ngOnInit para cargar datos y ngOnDestroy para desuscribirse de Observables.

    Estado Reactivo: Se espera el uso de Signals para el estado local (ej. listas, carrito, estado de UI) y Observables para las llamadas HTTP/Supabase.

    Comunicación: Uso correcto de input() / @Input para pasar datos a componentes hijos, y output() / @Output para emitir eventos al padre. Los servicios deben ser la única forma de comunicación entre componentes hermanos o sin jerarquía directa.

    Rutas y Seguridad:

        Uso de Lazy Loading (loadComponent).

        Uso obligatorio de Guards: canActivate (para login) y canMatch (para roles de usuario, ej: cliente vs administrador vs empleado).

        Inyección de dependencias dentro de los guards usando inject() (nunca constructores).

        Ruta comodín ** al final apuntando a un componente de error.

    Formularios: Uso de Reactive Forms para los formularios complejos (ej. alta de películas, login). Validaciones síncronas y, si aplica, asíncronas.

    Backend (Supabase): Centralización de la lógica en servicios. Uso correcto del cliente de Supabase. Manejo de errores.

    UI/UX: Uso de Pipes nativos (fechas, monedas) y directivas de Angular (o bloques @if / @for). No debe parecer un diseño genérico de IA.

Tareas que debés realizar:

    Auditoría de Arquitectura: Decime si mis servicios están bien inyectados, si uso Signals o propiedades comunes, y si estoy limpiando las suscripciones correctamente.

    Auditoría de Rutas: Revisá mi app.routes.ts y decime si los guards están bien aplicados, si usé lazy loading y si protegí las rutas por roles.

    Auditoría de Formularios: Decime si los formularios están bien estructurados (Reactive Forms) y si las validaciones están correctamente implementadas.

    Preguntas de defensa: Hacéme 5 preguntas técnicas que el profesor podría hacerme basándose en la estructura de mi proyecto.

    analiza todas las pipes y directivas que hay en mi codigo, decime donde estan y como funcionan

    explicame la logica de como se generan las funciones para las peliculas
