"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Upload, ArrowRight, UserCheck, Scale, Building2, BadgeCheck, Loader2, ChevronLeft } from "lucide-react";
import { DetailBackButton } from "@/components/transitions/DetailPageTransition";
import Link from "next/link";
import { Label } from "@/components/ui/label";

// Enhanced seller application form with premium Glassmorphism UI
export default function SellerApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);

  // Fields
  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState("cedula");
  const [idNumber, setIdNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [nationality, setNationality] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [roleChoice, setRoleChoice] = useState<"agente_inmobiliario" | "vendedor_particular">("vendedor_particular");

  const [companyName, setCompanyName] = useState("");
  const [companyTaxId, setCompanyTaxId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [ownerRelation, setOwnerRelation] = useState("");
  const [ownershipProofUrl, setOwnershipProofUrl] = useState("");

  const [docFrontUrl, setDocFrontUrl] = useState("");
  const [docBackUrl, setDocBackUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [confirmTruth, setConfirmTruth] = useState(false);

  const requiresAgentData = useMemo(() => roleChoice === "agente_inmobiliario", [roleChoice]);

  useEffect(() => {
    // Prefill email/name and load existing draft if any
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) return;
      const metaEmail = session.session?.user?.email ?? "";
      setEmail((e) => e || metaEmail);
      const name = (session.session?.user?.user_metadata as Record<string, unknown>)?.name as string ?? "";
      setFullName((n) => n || name);

      const { data: existing } = await supabase
        .from("seller_applications")
        .select("*")
        .eq("user_id", uid)
        .in("status", ["draft", "submitted", "needs_more_info"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setAppId(existing.id);
        setFullName(existing.full_name ?? "");
        setIdType(existing.id_document_type ?? "cedula");
        setIdNumber(existing.id_document_number ?? "");
        setBirthDate(existing.birth_date ?? "");
        setNationality(existing.nationality ?? "");
        setPhone(existing.phone ?? "");
        setEmail(existing.email ?? metaEmail);
        setAddress(existing.address ?? "");
        setRoleChoice((existing.role_choice ?? "vendedor_particular") as "vendedor_particular" | "agente_inmobiliario");
        setCompanyName(existing.company_name ?? "");
        setCompanyTaxId(existing.company_tax_id ?? "");
        setLicenseNumber(existing.license_number ?? "");
        setJobTitle(existing.job_title ?? "");
        setOwnerRelation(existing.owner_relation ?? "");
        setOwnershipProofUrl(existing.ownership_proof_url ?? "");
        setDocFrontUrl(existing.doc_front_url ?? "");
        setDocBackUrl(existing.doc_back_url ?? "");
        setSelfieUrl(existing.selfie_url ?? "");
        setTermsAccepted(!!existing.terms_accepted);
        setConfirmTruth(!!existing.confirm_truth);
      }
    })();
  }, []);

  const uploadToBucket = async (file: File): Promise<string> => {
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user?.id;
    if (!uid) throw new Error("No autenticado");
    const path = `${uid}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("kyc-docs").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data: pub } = supabase.storage.from("kyc-docs").getPublicUrl(path);
    return pub.publicUrl;
  };

  const onFilePick = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    setLoading(true);
    try {
      const url = await uploadToBucket(f);
      setter(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error subiendo archivo");
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) throw new Error("No autenticado");
      const payload: Record<string, unknown> = {
        user_id: uid,
        full_name: fullName,
        id_document_type: idType,
        id_document_number: idNumber,
        birth_date: birthDate || null,
        nationality,
        phone,
        email,
        address,
        role_choice: roleChoice,
        company_name: requiresAgentData ? companyName : null,
        company_tax_id: requiresAgentData ? companyTaxId : null,
        license_number: requiresAgentData ? licenseNumber : null,
        job_title: requiresAgentData ? jobTitle : null,
        owner_relation: !requiresAgentData ? ownerRelation : null,
        ownership_proof_url: !requiresAgentData ? ownershipProofUrl : null,
        doc_front_url: docFrontUrl || null,
        doc_back_url: docBackUrl || null,
        selfie_url: selfieUrl || null,
        terms_accepted: termsAccepted,
        confirm_truth: confirmTruth,
        status: "draft",
      };
      const { data, error } = await supabase.from("seller_applications").upsert(payload, { onConflict: "id" }).select("id").single();
      if (error) throw error;
      setAppId(data.id);
      setSuccess("Borrador guardado exitosamente");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error guardando borrador");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (!termsAccepted || !confirmTruth) throw new Error("Debes aceptar los términos y confirmar veracidad para continuar.");
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) throw new Error("No autenticado");

      const payload: Record<string, unknown> = {
        user_id: uid,
        full_name: fullName,
        id_document_type: idType,
        id_document_number: idNumber,
        birth_date: birthDate || null,
        nationality,
        phone,
        email,
        address,
        role_choice: roleChoice,
        company_name: requiresAgentData ? companyName : null,
        company_tax_id: requiresAgentData ? companyTaxId : null,
        license_number: requiresAgentData ? licenseNumber : null,
        job_title: requiresAgentData ? jobTitle : null,
        owner_relation: !requiresAgentData ? ownerRelation : null,
        ownership_proof_url: !requiresAgentData ? ownershipProofUrl : null,
        doc_front_url: docFrontUrl || null,
        doc_back_url: docBackUrl || null,
        selfie_url: selfieUrl || null,
        terms_accepted: termsAccepted,
        confirm_truth: confirmTruth,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from("seller_applications").upsert(payload, { onConflict: "id" }).select("id").single();
      if (error) throw error;
      setAppId(data.id);

      // Update user role from comprador to vendedor_agente
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", uid)
        .single();

      if (userError) throw userError;

      if (userData.role === "comprador") {
        const { error: updateError } = await supabase
          .from("users")
          .update({ role: "vendedor_agente" })
          .eq("id", uid);

        if (updateError) throw updateError;

        // Also update auth metadata
        try {
          await supabase.auth.updateUser({ data: { role: "vendedor_agente" } });
        } catch { }
      }

      setSuccess("¡Solicitud enviada con éxito! Redirigiendo...");

      // Short delay for user to see success message
      setTimeout(() => {
        router.push("/properties/new");
      }, 1500);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error enviando solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-4 sm:px-6 py-8 sm:py-12 mobile-bottom-safe mobile-horizontal-safe font-sans">
      <DetailBackButton className="mb-6 max-w-4xl mx-auto mobile-top-safe">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/">
            <ChevronLeft className="w-4 h-4" /> Volver al Inicio
          </Link>
        </Button>
      </DetailBackButton>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mb-3">
            Verificación <span className="text-primary italic">Profesional</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto sm:mx-0">
            Completa tu perfil profesional para desbloquear las herramientas de venta y conectar con miles de compradores.
          </p>
        </div>

        <div className="grid gap-8">
          {/* Status Messages */}
          {(error || success) && (
            <div className={`p-4 rounded-2xl border backdrop-blur-sm animate-in fade-in slide-in-from-top-4 ${error
              ? 'bg-destructive/5 border-destructive/20 text-destructive'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
              }`}>
              <div className="flex items-center gap-3">
                {error ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                <p className="font-medium">{error || success}</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-[1fr_300px] gap-8">
            {/* Main Form */}
            <div className="space-y-6">

              {/* Sección 1: Datos Personales */}
              <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/60 dark:bg-white/5 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold">1. Datos Personales</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nombre completo</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de documento</Label>
                    <Select value={idType} onChange={(e) => setIdType(e.target.value)} className="bg-background/50">
                      <option value="cedula">Cédula de Identidad</option>
                      <option value="pasaporte">Pasaporte</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Número de documento</Label>
                    <Input
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="000-0000000-0"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de nacimiento</Label>
                    <Input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nacionalidad</Label>
                    <Input
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      placeholder="Ej. Dominicana"
                      className="bg-background/50"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Contacto */}
              <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/60 dark:bg-white/5 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold">2. Información de Contacto</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Teléfono móvil</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="809-000-0000"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Correo electrónico</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Dirección residencial</Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Calle, número, sector, ciudad"
                      className="bg-background/50"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Perfil Profesional */}
              <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/60 dark:bg-white/5 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <BadgeCheck className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold">3. Perfil Profesional</h2>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRoleChoice('vendedor_particular')}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md ${roleChoice === 'vendedor_particular'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                        : 'border-border bg-background/50 hover:border-emerald-200'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-lg">Vendedor Particular</span>
                        {roleChoice === 'vendedor_particular' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Soy propietario y deseo vender o alquilar mis propias propiedades.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRoleChoice('agente_inmobiliario')}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md ${roleChoice === 'agente_inmobiliario'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                        : 'border-border bg-background/50 hover:border-emerald-200'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-lg">Agente Inmobiliario</span>
                        {roleChoice === 'agente_inmobiliario' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Represento a clientes o trabajo para una agencia inmobiliaria.
                      </p>
                    </button>
                  </div>

                  {requiresAgentData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Label>Agencia / Empresa</Label>
                        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nombre de la agencia" className="bg-background/50" />
                      </div>
                      <div className="space-y-2">
                        <Label>RNC / Registro Fiscal</Label>
                        <Input value={companyTaxId} onChange={(e) => setCompanyTaxId(e.target.value)} placeholder="0-00-00000-0" className="bg-background/50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Número de Licencia</Label>
                        <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="Opcional" className="bg-background/50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Cargo / Título</Label>
                        <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Ej. Agente Senior" className="bg-background/50" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Label>Relación con la propiedad</Label>
                        <Input value={ownerRelation} onChange={(e) => setOwnerRelation(e.target.value)} placeholder="Ej. Propietario único" className="bg-background/50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Prueba de propiedad (Link)</Label>
                        <Input value={ownershipProofUrl} onChange={(e) => setOwnershipProofUrl(e.target.value)} placeholder="URL a documento (opcional)" className="bg-background/50" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sección 4: Documentación */}
              <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/60 dark:bg-white/5 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold">4. Documentación</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { label: "Frontal Cédula", state: docFrontUrl, setter: setDocFrontUrl },
                    { label: "Trasera Cédula", state: docBackUrl, setter: setDocBackUrl },
                    { label: "Selfie con Cédula", state: selfieUrl, setter: setSelfieUrl },
                  ].map((doc, idx) => (
                    <div key={idx} className="space-y-3">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{doc.label}</Label>
                      <div className={`relative aspect-[3/2] rounded-xl border-2 border-dashed transition-all ${doc.state ? 'border-emerald-500/50 bg-emerald-50/30' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onFilePick(e, doc.setter)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                          {doc.state ? (
                            <>
                              <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                              <span className="text-xs text-emerald-600 font-medium truncate w-full px-2">Archivo subido</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                              <span className="text-xs text-muted-foreground">Click para subir</span>
                            </>
                          )}
                        </div>
                      </div>
                      {doc.state && (
                        <a href={doc.state} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-primary hover:underline">
                          Ver archivo actual
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Sticky Actions */}
            <div className="md:sticky md:top-24 h-fit space-y-6">
              <div className="rounded-3xl border border-white/20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 shadow-xl">
                <h3 className="font-serif font-bold text-lg mb-4">Resumen</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Rol solicitado</span>
                    <span className="font-medium text-right">{roleChoice === 'vendedor_particular' ? 'Vendedor' : 'Agente'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Documentos</span>
                    <span className={`font-medium ${docFrontUrl && docBackUrl && selfieUrl ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {[docFrontUrl, docBackUrl, selfieUrl].filter(Boolean).length}/3
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <label className="flex items-start gap-3 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors">
                    <div className="pt-0.5">
                      <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="rounded border-border text-primary focus:ring-primary" />
                    </div>
                    <span className="text-muted-foreground text-xs">
                      He leído y acepto los <Link href="/terms" className="text-primary hover:underline">Términos y Condiciones</Link>.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors">
                    <div className="pt-0.5">
                      <input type="checkbox" checked={confirmTruth} onChange={(e) => setConfirmTruth(e.target.checked)} className="rounded border-border text-primary focus:ring-primary" />
                    </div>
                    <span className="text-muted-foreground text-xs">
                      Declaro que la información es verídica.
                    </span>
                  </label>
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    onClick={submit}
                    disabled={loading || !termsAccepted || !confirmTruth}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base shadow-lg hover:shadow-primary/25 transition-all"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Solicitud"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={saveDraft}
                    disabled={loading}
                    className="w-full h-10 border-border/50 hover:bg-muted/50"
                  >
                    Guardar Borrador
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-xs text-blue-600/80 leading-relaxed text-center">
                <p>
                  Tu información está protegida y será revisada por nuestro equipo de cumplimiento en 24-48 horas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}