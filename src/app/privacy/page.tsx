"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
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
                    <h1 className="text-2xl font-serif font-bold text-primary">Política de Privacidad</h1>
                </div>

                {/* Content */}
                <div className="prose prose-sm max-w-none text-foreground/80 space-y-6">
                    <p className="text-muted-foreground">Última actualización: 20 de diciembre de 2025</p>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">1. Introducción</h2>
                        <p>
                            <strong>VENDRA APP SRL</strong> ("nosotros", "nuestro" o "la Empresa"), con domicilio en la
                            República Dominicana, se compromete a proteger la privacidad de los usuarios de la aplicación
                            móvil Vendra ("la Aplicación"). Esta Política de Privacidad describe cómo recopilamos, usamos,
                            almacenamos y protegemos su información personal.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">2. Información que Recopilamos</h2>

                        <h3 className="text-base font-medium mt-4">2.1 Información proporcionada por el usuario</h3>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>Datos de registro:</strong> Nombre, correo electrónico, número de teléfono</li>
                            <li><strong>Información de perfil:</strong> Foto de perfil, biografía, ubicación</li>
                            <li><strong>Publicaciones:</strong> Fotos, descripciones y detalles de propiedades</li>
                            <li><strong>Comunicaciones:</strong> Mensajes enviados a través de la Aplicación</li>
                        </ul>

                        <h3 className="text-base font-medium mt-4">2.2 Información recopilada automáticamente</h3>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>Datos del dispositivo:</strong> Modelo, sistema operativo, identificadores únicos</li>
                            <li><strong>Datos de uso:</strong> Páginas visitadas, tiempo de uso, acciones realizadas</li>
                            <li><strong>Datos de ubicación:</strong> Ubicación aproximada (con su consentimiento)</li>
                        </ul>

                        <h3 className="text-base font-medium mt-4">2.3 Datos biométricos</h3>
                        <p>
                            Si habilita la autenticación biométrica (huella digital o reconocimiento facial):
                        </p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Los datos biométricos se almacenan <strong>exclusivamente en su dispositivo</strong></li>
                            <li>VENDRA APP SRL <strong>no tiene acceso</strong> a sus datos biométricos</li>
                            <li>Utilizamos las APIs nativas del sistema operativo (Android/iOS) para la verificación</li>
                            <li>Puede desactivar esta función en cualquier momento</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">3. Uso de la Información</h2>
                        <p>Utilizamos su información para:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Proporcionar y mantener nuestros servicios</li>
                            <li>Procesar su registro y gestionar su cuenta</li>
                            <li>Facilitar la comunicación entre usuarios</li>
                            <li>Enviar notificaciones importantes sobre su cuenta</li>
                            <li>Mejorar y personalizar la experiencia del usuario</li>
                            <li>Procesar pagos de suscripciones</li>
                            <li>Cumplir con obligaciones legales</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">4. Compartir Información</h2>
                        <p>Podemos compartir su información con:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>Otros usuarios:</strong> Información de perfil y listados públicos</li>
                            <li><strong>Proveedores de servicios:</strong> Para procesamiento de pagos, almacenamiento en la nube y análisis</li>
                            <li><strong>Autoridades legales:</strong> Cuando sea requerido por ley</li>
                        </ul>
                        <p className="font-medium">
                            No vendemos ni alquilamos su información personal a terceros.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">5. Almacenamiento y Seguridad</h2>
                        <p>
                            Su información se almacena en servidores seguros proporcionados por Supabase, con cifrado
                            en tránsito y en reposo. Implementamos medidas de seguridad técnicas y organizativas para
                            proteger sus datos contra acceso no autorizado, alteración, divulgación o destrucción.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">6. Retención de Datos</h2>
                        <p>
                            Conservamos su información mientras su cuenta esté activa o según sea necesario para
                            proporcionarle servicios. Si solicita la eliminación de su cuenta, eliminaremos su
                            información personal en un plazo de 30 días, excepto cuando sea necesario retenerla
                            por obligaciones legales.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">7. Sus Derechos</h2>
                        <p>Usted tiene derecho a:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>Acceso:</strong> Solicitar una copia de sus datos personales</li>
                            <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
                            <li><strong>Eliminación:</strong> Solicitar la eliminación de sus datos</li>
                            <li><strong>Portabilidad:</strong> Recibir sus datos en un formato estructurado</li>
                            <li><strong>Oposición:</strong> Oponerse al procesamiento de sus datos</li>
                        </ul>
                        <p>
                            Para ejercer estos derechos, contáctenos a{" "}
                            <a href="mailto:solutionsvendra@gmail.com" className="text-primary hover:underline">
                                solutionsvendra@gmail.com
                            </a>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">8. Notificaciones Push</h2>
                        <p>
                            Si acepta recibir notificaciones push, almacenaremos un token de dispositivo para enviarle:
                        </p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Mensajes de otros usuarios</li>
                            <li>Actualizaciones sobre sus propiedades</li>
                            <li>Información importante de su cuenta</li>
                        </ul>
                        <p>
                            Puede desactivar las notificaciones push en la configuración de su dispositivo.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">9. Servicios de Terceros</h2>
                        <p>Utilizamos los siguientes servicios de terceros:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>Supabase:</strong> Base de datos y autenticación</li>
                            <li><strong>Google Play / App Store:</strong> Procesamiento de pagos de suscripciones</li>
                            <li><strong>Firebase:</strong> Notificaciones push</li>
                        </ul>
                        <p>
                            Cada servicio tiene su propia política de privacidad que le recomendamos revisar.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">10. Menores de Edad</h2>
                        <p>
                            La Aplicación no está dirigida a menores de 18 años. No recopilamos conscientemente
                            información de menores. Si descubrimos que hemos recopilado información de un menor,
                            la eliminaremos inmediatamente.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">11. Cambios a esta Política</h2>
                        <p>
                            Podemos actualizar esta Política de Privacidad ocasionalmente. Le notificaremos sobre
                            cambios significativos a través de la Aplicación o por correo electrónico. El uso
                            continuado de la Aplicación después de los cambios constituye su aceptación de la
                            política actualizada.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-primary">12. Contacto</h2>
                        <p>
                            Para preguntas sobre esta Política de Privacidad o el tratamiento de sus datos:
                        </p>
                        <p className="font-medium">
                            VENDRA APP SRL<br />
                            República Dominicana<br />
                            Email: <a href="mailto:solutionsvendra@gmail.com" className="text-primary hover:underline">solutionsvendra@gmail.com</a>
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
