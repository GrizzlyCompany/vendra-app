import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Sobre nosotros | Vendra",
};

export default function AboutPage() {
  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-4 py-12 mobile-bottom-safe">
      <div className="container mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl md:text-4xl text-foreground">Sobre Vendra</h1>
          <p className="text-muted-foreground">Conectamos personas con propiedades extraordinarias en toda la región.</p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-[hsl(var(--border))]">
            <CardHeader>
              <CardTitle className="text-xl">Nuestra misión</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/90 leading-6">
              Hacer que publicar y encontrar propiedades sea simple, transparente y humano. 
              Creamos herramientas para que agentes, constructores y particulares puedan gestionar sus listados de forma eficiente.
            </CardContent>
          </Card>
          <Card className="border-[hsl(var(--border))]">
            <CardHeader>
              <CardTitle className="text-xl">Lo que ofrecemos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/90 leading-6 space-y-2">
              <ul className="list-disc pl-5 space-y-1">
                <li>Publicación rápida de propiedades con carga de imágenes.</li>
                <li>Panel para gestionar tus listados y proyectos.</li>
                <li>Experiencia de búsqueda fluida para compradores.</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-[hsl(var(--border))]">
            <CardHeader>
              <CardTitle className="text-xl">¿Eres nuevo en Vendra?</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/signup">Crear cuenta</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/main">Explorar propiedades</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
