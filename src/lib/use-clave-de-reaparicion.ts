/**
 * `useClaveDeReaparicion` (`lib/use-clave-de-reaparicion.ts`) — devuelve una clave que cambia
 * cada vez que la pantalla vuelve a mostrarse después de haber estado oculta.
 *
 * Por qué existe: con `cacheComponents: true` Next.js no desmonta la pantalla anterior al
 * navegar, la deja oculta dentro de un `<Activity>` de React y CONSERVA su estado (los
 * `useState`, los valores de TanStack Form, etc.). Al volver a `/modelo/asistente` o
 * `/modelo/editor` desde Inicio aparecía entonces el formulario tal como se había dejado,
 * con los datos del ejercicio anterior. Mientras una pantalla está oculta React destruye sus
 * efectos y los vuelve a crear al mostrarla de nuevo; este hook usa ese ciclo para
 * detectar el regreso y devolver una clave nueva. Usada como `key` del componente de la
 * pantalla, lo remonta desde cero: lo que debe sobrevivir (un borrador sin terminar) se
 * relee de `localStorage`, y lo demás (un ejercicio ya resuelto) arranca vacío.
 *
 * En desarrollo, React Strict Mode simula un ocultar/mostrar al montar: se ignora (ver el
 * cleanup), si no remontaría la pantalla recién cargada.
 */

"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function useClaveDeReaparicion(): number {
  const [clave, setClave] = useState(0);
  const seOculto = useRef(false);

  useLayoutEffect(() => {
    if (seOculto.current) {
      seOculto.current = false;
      // Cambio de clave en el mismo ciclo de commit, antes de pintar: no hay parpadeo
      // con los datos viejos. Es sincronizar con el ciclo de vida de `<Activity>`.
      setClave((anterior) => anterior + 1);
    }
    return () => {
      // En una microtarea: el ciclo simulado de Strict Mode (desarrollo) vuelve a ejecutar
      // el efecto de forma síncrona, antes de que corra, y no cuenta como "se ocultó".
      queueMicrotask(() => {
        seOculto.current = true;
      });
    };
  }, []);

  return clave;
}
