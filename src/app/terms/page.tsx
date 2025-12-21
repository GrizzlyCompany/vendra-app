"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function TermsPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-background px-4 py-8 mobile-top-safe mobile-bottom-safe">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        onClick={() => router.back()}
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-serif font-bold text-primary">Términos y Condiciones</h1>
                </div>

                {/* Content */}
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-6">
                    <p className="text-muted-foreground">Última actualización: 20 de diciembre de 2025</p>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">1. Aceptación de los Términos</h2>
                        <p>
                            Al descargar, instalar o utilizar la aplicación móvil Vendra ("la Aplicación"), usted acepta
                            estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte de estos
                            términos, no podrá acceder a la Aplicación.
                        </p>
                        <p>
                            La Aplicación es operada por <strong>VENDRA APP SRL</strong>, una empresa constituida bajo las
                            leyes de la República Dominicana.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">2. Descripción del Servicio</h2>
                        <p>
                            Vendra es una plataforma digital que conecta compradores y vendedores de propiedades inmobiliarias.
                            La Aplicación permite a los usuarios:
                        </p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Publicar propiedades para venta o alquiler</li>
                            <li>Buscar y filtrar propiedades disponibles</li>
                            <li>Contactar directamente a vendedores y agentes</li>
                            <li>Gestionar su perfil y listados</li>
                            <li>Acceder a funcionalidades premium mediante suscripción</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">3. Registro y Cuenta de Usuario</h2>
                        <p>
                            Para utilizar ciertas funciones de la Aplicación, debe crear una cuenta proporcionando
                            información precisa y completa. Usted es responsable de:
                        </p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Mantener la confidencialidad de sus credenciales de acceso</li>
                            <li>Todas las actividades que ocurran bajo su cuenta</li>
                            <li>Notificarnos inmediatamente sobre cualquier uso no autorizado</li>
                        </ul>
                        <p>
                            Nos reservamos el derecho de suspender o terminar cuentas que violen estos términos.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">4. Suscripciones y Pagos</h2>
                        <p>
                            Vendra ofrece planes de suscripción que desbloquean funcionalidades premium. Al suscribirse:
                        </p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Los pagos se procesarán a través de la tienda de aplicaciones correspondiente (Google Play o App Store)</li>
                            <li>Las suscripciones se renuevan automáticamente a menos que se cancelen antes del período de facturación</li>
                            <li>Puede cancelar su suscripción en cualquier momento desde la configuración de su tienda de aplicaciones</li>
                            <li>No se otorgan reembolsos por períodos parciales de suscripción</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">5. Autenticación Biométrica</h2>
                        <p>
                            La Aplicación ofrece la opción de utilizar autenticación biométrica (huella digital o
                            reconocimiento facial) para acceder a su cuenta. Al habilitar esta función:
                        </p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Los datos biométricos se almacenan exclusivamente en su dispositivo</li>
                            <li>VENDRA APP SRL no tiene acceso a sus datos biométricos</li>
                            <li>Puede desactivar esta función en cualquier momento desde la configuración de la Aplicación</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">6. Contenido del Usuario</h2>
                        <p>
                            Al publicar contenido (fotos, descripciones, información de propiedades) en la Aplicación, usted:
                        </p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Garantiza que tiene los derechos necesarios sobre dicho contenido</li>
                            <li>Otorga a VENDRA APP SRL una licencia no exclusiva para mostrar y distribuir dicho contenido</li>
                            <li>Acepta que el contenido debe ser veraz y no engañoso</li>
                            <li>Se compromete a no publicar contenido ilegal, ofensivo o fraudulento</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">7. Limitación de Responsabilidad</h2>
                        <p>
                            VENDRA APP SRL actúa únicamente como intermediario entre compradores y vendedores. No somos
                            responsables de:
                        </p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>La veracidad de la información publicada por los usuarios</li>
                            <li>El resultado de las transacciones realizadas entre usuarios</li>
                            <li>Daños directos o indirectos derivados del uso de la Aplicación</li>
                            <li>La disponibilidad ininterrumpida del servicio</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">8. Propiedad Intelectual</h2>
                        <p>
                            Todos los derechos de propiedad intelectual sobre la Aplicación, incluyendo pero no limitado
                            a diseño, código, marcas y logos, son propiedad exclusiva de VENDRA APP SRL.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">9. Modificaciones</h2>
                        <p>
                            Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento.
                            Las modificaciones entrarán en vigor inmediatamente después de su publicación en la Aplicación.
                            El uso continuado de la Aplicación constituye la aceptación de los términos modificados.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">10. Ley Aplicable</h2>
                        <p>
                            Estos Términos y Condiciones se regirán e interpretarán de acuerdo con las leyes de la
                            República Dominicana. Cualquier disputa será sometida a la jurisdicción exclusiva de los
                            tribunales dominicanos.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">11. Contacto</h2>
                        <p>
                            Para cualquier pregunta sobre estos Términos y Condiciones, puede contactarnos en:
                        </p>
                        <p className="font-medium">
                            VENDRA APP SRL<br />
                            Email: <a href="mailto:solutionsvendra@gmail.com" className="text-primary hover:underline">solutionsvendra@gmail.com</a>
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
