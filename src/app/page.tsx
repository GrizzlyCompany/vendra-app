import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, Users, LayoutDashboard, ArrowRight, Shield, Search, MessageCircle, Star, Clock, MapPin, Home, UserPlus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import RedirectIfAuthenticated from "@/features/auth/components/RedirectIfAuthenticated";
import { MobileHeader } from "@/components/MobileHeader";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { Property } from "@/types";

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
            El mercado principal para descubrir, comprar y vender propiedades extraordinarias.
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

// Propiedades destacadas para la landing page
const featuredProperties: Property[] = [
  {
    id: "featured-1",
    title: "Casa Moderna en Las Condes",
    description: "Hermosa casa de 3 dormitorios con jardín y vista panorámica",
    price: 450000,
    location: "Las Condes, Santiago",
    type: "Casa",
    images: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1600&auto=format&fit=crop"],
    owner_id: "demo",
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    inserted_at: new Date().toISOString()
  },
  {
    id: "featured-2",
    title: "Apartamento Ejecutivo Providencia",
    description: "Moderno apartamento de 2 dormitorios en el corazón de Providencia",
    price: 280000,
    location: "Providencia, Santiago",
    type: "Apartamento",
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1600&auto=format&fit=crop"],
    owner_id: "demo",
    bedrooms: 2,
    bathrooms: 2,
    area: 85,
    inserted_at: new Date().toISOString()
  },
  {
    id: "featured-3",
    title: "Penthouse con Terraza Vitacura",
    description: "Exclusivo penthouse con amplia terraza y vista a la cordillera",
    price: 850000,
    location: "Vitacura, Santiago",
    type: "Penthouse",
    images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1600&auto=format&fit=crop"],
    owner_id: "demo",
    bedrooms: 4,
    bathrooms: 4,
    area: 250,
    inserted_at: new Date().toISOString()
  }
];

const FeaturedPropertiesSection = () => (
  <section className="bg-background py-20 sm:py-24">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-green-900 font-serif mb-4">
          Propiedades Destacadas
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Descubre algunas de las mejores propiedades disponibles en nuestra plataforma
        </p>
        <div className="w-24 h-1 bg-gradient-to-r from-[#2F6D48] to-[#3BB273] mx-auto mt-6 rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {featuredProperties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            href="/signup"
          />
        ))}
      </div>

      <div className="text-center">
        <Button asChild size="lg" className="bg-gradient-to-r from-[#2F6D48] to-[#3BB273] text-white hover:from-[#3BB273] hover:to-[#2F6D48] rounded-full px-10 py-4 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <Link href="/signup">
            Ver Todas las Propiedades
            <ArrowRight className="ml-3 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  </section>
);

const WhyVendraSection = () => (
  <section className="bg-background py-20 sm:py-24 relative overflow-hidden">
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-5">
      <div className="absolute top-10 left-10 w-32 h-32 bg-green-600 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-green-400 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-green-500 rounded-full blur-3xl"></div>
    </div>

    <div className="container mx-auto px-4 relative z-10">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-green-900 font-serif mb-4">
          ¿Por qué VENDRA?
        </h2>
        <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
          Descubre las ventajas que hacen de VENDRA la plataforma líder para comprar y vender propiedades
        </p>
        <div className="w-24 h-1 bg-gradient-to-r from-[#2F6D48] to-[#3BB273] mx-auto mt-6 rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Búsqueda Avanzada */}
        <div className="bg-background rounded-2xl p-8 text-center group shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-green-200">
          <div className="mx-auto bg-gradient-to-br from-green-100 to-green-200 rounded-full p-6 w-fit mb-6 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 transform group-hover:scale-110">
            <Search className="h-8 w-8 text-green-700" />
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-4 font-serif">Búsqueda Inteligente</h3>
          <p className="text-gray-600 leading-relaxed">
            Encuentra la propiedad perfecta con nuestros filtros avanzados y búsqueda por ubicación
          </p>
        </div>

        {/* Seguridad */}
        <div className="bg-background rounded-2xl p-8 text-center group shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-green-200">
          <div className="mx-auto bg-gradient-to-br from-green-100 to-green-200 rounded-full p-6 w-fit mb-6 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 transform group-hover:scale-110">
            <Shield className="h-8 w-8 text-green-700" />
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-4 font-serif">Transacciones Seguras</h3>
          <p className="text-gray-600 leading-relaxed">
            Protegemos tus datos y transacciones con los más altos estándares de seguridad
          </p>
        </div>

        {/* Comunicación */}
        <div className="bg-background rounded-2xl p-8 text-center group shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-green-200">
          <div className="mx-auto bg-gradient-to-br from-green-100 to-green-200 rounded-full p-6 w-fit mb-6 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 transform group-hover:scale-110">
            <MessageCircle className="h-8 w-8 text-green-700" />
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-4 font-serif">Comunicación Directa</h3>
          <p className="text-gray-600 leading-relaxed">
            Conecta directamente con vendedores y compradores a través de nuestro sistema de mensajería
          </p>
        </div>

        {/* Gestión Fácil */}
        <div className="bg-background rounded-2xl p-8 text-center group shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-green-200">
          <div className="mx-auto bg-gradient-to-br from-green-100 to-green-200 rounded-full p-6 w-fit mb-6 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 transform group-hover:scale-110">
            <LayoutDashboard className="h-8 w-8 text-green-700" />
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-4 font-serif">Dashboard Intuitivo</h3>
          <p className="text-gray-600 leading-relaxed">
            Gestiona todas tus propiedades, mensajes y estadísticas desde un panel centralizado
          </p>
        </div>

        {/* Calidad */}
        <div className="bg-background rounded-2xl p-8 text-center group shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-green-200">
          <div className="mx-auto bg-gradient-to-br from-green-100 to-green-200 rounded-full p-6 w-fit mb-6 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 transform group-hover:scale-110">
            <Star className="h-8 w-8 text-green-700" />
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-4 font-serif">Propiedades Verificadas</h3>
          <p className="text-gray-600 leading-relaxed">
            Todas las propiedades pasan por un proceso de verificación para garantizar calidad
          </p>
        </div>

        {/* Rapidez */}
        <div className="bg-background rounded-2xl p-8 text-center group shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-green-200">
          <div className="mx-auto bg-gradient-to-br from-green-100 to-green-200 rounded-full p-6 w-fit mb-6 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 transform group-hover:scale-110">
            <Clock className="h-8 w-8 text-green-700" />
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-4 font-serif">Proceso Rápido</h3>
          <p className="text-gray-600 leading-relaxed">
            Publica tu propiedad en minutos y comienza a recibir consultas de inmediato
          </p>
        </div>
      </div>
    </div>
  </section>
);

const CallToActionSection = () => (
  <section className="bg-gradient-to-br from-[#2F6D48] to-[#3BB273] py-20 sm:py-24">
    <div className="container mx-auto px-4 text-center">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-white font-serif mb-6">
          ¿Listo para descubrir tu propiedad ideal?
        </h2>
        <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
          Únete a miles de usuarios que ya encontraron su hogar perfecto con VENDRA
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-[#2F6D48] rounded-full px-8 py-3 font-semibold min-w-[200px] bg-transparent">
            <Link href="/signup">
              <UserPlus className="mr-2 h-5 w-5" />
              Registrarse Gratis
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">10,000+</div>
            <div className="text-white/80">Propiedades Publicadas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">5,000+</div>
            <div className="text-white/80">Usuarios Registrados</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">2,500+</div>
            <div className="text-white/80">Ventas Exitosas</div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-white py-6 border-t border-border/20">
    <div className="container mx-auto px-4 text-center text-gray-500">
      <p>© {new Date().getFullYear()} VENDRA APP SRL</p>
      <div className="flex justify-center space-x-4 mt-2">
        <Link href="/terms" className="hover:text-[#3BB273]">Términos y Condiciones</Link>
        <Link href="/privacy" className="hover:text-[#3BB273]">Política de Privacidad</Link>
        <Link href="/about" className="hover:text-[#3BB273]">Acerca de</Link>
      </div>
    </div>
  </footer>
);

export default function VendraLandingPage() {
  return (
    <div className="bg-white text-[#333333]">
      <RedirectIfAuthenticated to="/main" />
      <MobileHeader />
      <main>
        <HeroSection />
        <FeaturedPropertiesSection />
        <WhyVendraSection />
        <CallToActionSection />
      </main>
      <Footer />
    </div>
  );
}
