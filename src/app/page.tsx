import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, Users, LayoutDashboard, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import RedirectIfAuthenticated from "@/components/auth/RedirectIfAuthenticated";
import { MobileHeader } from "@/components/MobileHeader";

const HeroSection = () => (
  <section className="bg-background">
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        {/* Left: copy */}
        <div className="text-left">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-[#2F6D48] font-serif">
            Tu Próximo Hogar
            <br />
            te Espera
          </h1>
          <p className="mt-5 text-base md:text-lg text-[#333333]/80 max-w-xl">
            El mercado principal para descubrir, comprar y vender propiedades extraordinarias. Encontraremos la puerta a tus sueños.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">
              <Link href="/signup">
                Comenzar
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80">
              <Link href="/about">Saber Más</Link>
            </Button>
          </div>
        </div>
        {/* Right: image card */}
        <div className="relative">
          <div className="rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
            <Image
              src="https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop"
              alt="Propiedad moderna"
              width={600}
              height={420}
              className="w-full h-[300px] md:h-[420px] object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  </section>
);

const BenefitsSection = () => (
  <section className="bg-[#F5F5F5] py-20 sm:py-24">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <Card className="bg-white">
          <CardHeader>
            <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
              <UploadCloud className="h-8 w-8 text-[#3BB273]" />
            </div>
            <CardTitle className="pt-4">Publica propiedades fácilmente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Sube tus propiedades en minutos con nuestro formulario simplificado.</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader>
            <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
              <Users className="h-8 w-8 text-[#3BB273]" />
            </div>
            <CardTitle className="pt-4">Conecta con compradores reales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Accede a una red de compradores verificados y listos para la acción.</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader>
            <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
              <LayoutDashboard className="h-8 w-8 text-[#3BB273]" />
            </div>
            <CardTitle className="pt-4">Gestiona todo desde un solo lugar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Administra tus listados, mensajes y ofertas desde un panel intuitivo.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-white py-6">
    <div className="container mx-auto px-4 text-center text-gray-500">
      <p>© Vendra 2025</p>
      <div className="flex justify-center space-x-4 mt-2">
        <Link href="#" className="hover:text-[#3BB273]">Términos</Link>
        <Link href="#" className="hover:text-[#3BB273]">Privacidad</Link>
      </div>
    </div>
  </footer>
);

export default function VendraLandingPage() {
  return (
    <div className="bg-white text-[#333333]">
      <RedirectIfAuthenticated to="/dashboard" />
      <MobileHeader />
      <main>
        <HeroSection />
        <BenefitsSection />
      </main>
      <Footer />
    </div>
  );
}
