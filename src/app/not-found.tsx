import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <p className="text-sm font-semibold text-muted-foreground">Error 404</p>
      <h1 className="max-w-md text-2xl font-bold text-balance">
        No encontramos esta página
      </h1>
      <p className="max-w-md text-muted-foreground">
        Puede que el enlace esté roto o que la página ya no exista. Volvé al
        inicio y empezá de nuevo.
      </p>
      <Button render={<Link href="/">Ir al inicio</Link>} />
    </main>
  );
}
