import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MobileHeader } from "@/components/MobileHeader";
import { Search, Shield, Users, LayoutDashboard, Star, Clock, ArrowRight, CheckCircle, Target, Heart } from 'lucide-react';
import Image from 'next/image';

export const metadata = {
  title: "Sobre nosotros | Vendra",
};

export default function AboutPage() {
  return (
    <div className="bg-background text-[#333333]">
      <MobileHeader />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-background py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-green-900 font-serif mb-6">
                Sobre VENDRA
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                Conectamos personas con propiedades extraordinarias, creando un mercado transparente y eficiente para todos.
              </p>
              <div className="w-24 h-1 bg-gradient-to-r from-[#2F6D48] to-[#3BB273] mx-auto rounded-full"></div>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="bg-background py-20 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-green-900 font-serif mb-6">
                  Nuestra Misión
                </h2>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Transformar la experiencia inmobiliaria en Chile, haciendo que publicar y encontrar propiedades sea simple, transparente y accesible para todos.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                    <p className="text-gray-600">Democratizar el acceso al mercado inmobiliario</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                    <p className="text-gray-600">Crear herramientas intuitivas para agentes y particulares</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                    <p className="text-gray-600">Facilitar conexiones genuinas entre compradores y vendedores</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-xl">
                  <Image
                    src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1600&auto=format&fit=crop"
                    alt="Equipo VENDRA trabajando"
                    width={600}
                    height={400}
                    className="w-full h-[400px] object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="bg-background py-20 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-green-900 font-serif mb-4">
                Nuestros Valores
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Los principios que guían cada decisión y cada línea de código en VENDRA
              </p>
              <div className="w-24 h-1 bg-gradient-to-r from-[#2F6D48] to-[#3BB273] mx-auto mt-6 rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Transparencia */}
              <div className="bg-background rounded-2xl p-8 text-center group shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-green-200">
                <div className="mx-auto bg-gradient-to-br from-green-100 to-green-200 rounded-full p-6 w-fit mb-6 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 transform group-hover:scale-110">
                  <Shield className="h-8 w-8 text-green-700" />
                </div>
                <h3 className="text-xl font-bold text-green-900 mb-4 font-serif">Transparencia</h3>
                <p className="text-gray-600 leading-relaxed">
                  Información clara y honesta en cada transacción, sin sorpresas ni costos ocultos.
                </p>
              </div>

              {/* Innovación */}
              <div className="bg-background rounded-2xl p-8 text-center group shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-green-200">
                <div className="mx-auto bg-gradient-to-br from-green-100 to-green-200 rounded-full p-6 w-fit mb-6 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 transform group-hover:scale-110">
                  <Star className="h-8 w-8 text-green-700" />
                </div>
                <h3 className="text-xl font-bold text-green-900 mb-4 font-serif">Innovación</h3>
                <p className="text-gray-600 leading-relaxed">
                  Tecnología de vanguardia para simplificar procesos complejos del mercado inmobiliario.
                </p>
              </div>

              {/* Comunidad */}
              <div className="bg-background rounded-2xl p-8 text-center group shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-green-200">
                <div className="mx-auto bg-gradient-to-br from-green-100 to-green-200 rounded-full p-6 w-fit mb-6 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 transform group-hover:scale-110">
                  <Heart className="h-8 w-8 text-green-700" />
                </div>
                <h3 className="text-xl font-bold text-green-900 mb-4 font-serif">Comunidad</h3>
                <p className="text-gray-600 leading-relaxed">
                  Construimos relaciones duraderas, no solo transacciones. Tu éxito es nuestro éxito.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What We Offer */}
        <section className="bg-background py-20 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-green-900 font-serif mb-4">
                  Lo Que Ofrecemos
                </h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  Una plataforma completa diseñada para cada tipo de usuario del mercado inmobiliario
                </p>
                <div className="w-24 h-1 bg-gradient-to-r from-[#2F6D48] to-[#3BB273] mx-auto mt-6 rounded-full"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Para Vendedores */}
                <Card className="bg-background border-2 border-gray-100 hover:border-green-200 transition-all duration-300 hover:shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-green-100 rounded-lg p-2">
                        <Users className="h-6 w-6 text-green-700" />
                      </div>
                      <CardTitle className="text-xl font-bold text-green-900 font-serif">Para Vendedores</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">Publicación rápida con galería de imágenes</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">Dashboard completo para gestionar listados</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">Sistema de mensajería integrado</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">Estadísticas y analytics de rendimiento</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Para Compradores */}
                <Card className="bg-background border-2 border-gray-100 hover:border-green-200 transition-all duration-300 hover:shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-green-100 rounded-lg p-2">
                        <Search className="h-6 w-6 text-green-700" />
                      </div>
                      <CardTitle className="text-xl font-bold text-green-900 font-serif">Para Compradores</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">Búsqueda avanzada con filtros inteligentes</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">Exploración por ubicación y mapa</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">Sistema de favoritos y alertas</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">Contacto directo con vendedores</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-gradient-to-br from-[#2F6D48] to-[#3BB273] py-20 sm:py-24">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-white font-serif mb-6">
                ¿Listo para unirte a VENDRA?
              </h2>
              <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
                Comienza tu viaje inmobiliario con nosotros. Ya sea que busques vender o comprar, tenemos las herramientas perfectas para ti.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button asChild size="lg" className="bg-white text-[#2F6D48] hover:bg-gray-100 rounded-full px-8 py-3 font-semibold min-w-[200px]">
                  <Link href="/signup">
                    <Users className="mr-2 h-5 w-5" />
                    Crear Cuenta
                  </Link>
                </Button>
                
                <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-[#2F6D48] rounded-full px-8 py-3 font-semibold min-w-[200px] bg-transparent">
                  <Link href="/search">
                    <Search className="mr-2 h-5 w-5" />
                    Explorar Propiedades
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
