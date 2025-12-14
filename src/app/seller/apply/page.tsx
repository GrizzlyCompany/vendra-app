"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Upload } from "lucide-react";

// Enhanced seller application form with improved UI/UX
// Saves draft and allows submission to 'submitted'. Admin must approve.
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

  const onFilePick = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string)=>void) => {
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
      setSuccess("Borrador guardado");
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
      if (!termsAccepted || !confirmTruth) throw new Error("Debes aceptar los términos y confirmar veracidad");
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
        } catch {}
      }
      
      setSuccess("Solicitud enviada. Ya puedes publicar tu propiedad.");
      // Esperar a que la fila sea visible para el guard de /properties/new
      try {
        const { data: session2 } = await supabase.auth.getSession();
        const uid2 = session2.session?.user?.id;
        for (let i = 0; i < 5; i++) {
          const { data: check } = await supabase
            .from("seller_applications")
            .select("id")
            .eq("user_id", uid2)
            .in("status", ["submitted", "approved"])
            .maybeSingle();
          if (check) break;
          await new Promise(r => setTimeout(r, 150));
        }
      } catch {}
      router.push("/properties/new");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error enviando solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-background flex items-center justify-center px-4 py-8 mobile-bottom-safe">
      <Card className="w-full max-w-3xl border-border">
        <CardHeader className="pb-4">
          <CardTitle className="font-serif text-2xl text-foreground">Verificación para Vendedor/Agente</CardTitle>
          <p className="text-sm text-muted-foreground">
            Completa esta verificación para poder publicar tus propiedades en la plataforma.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* 1. Datos Básicos */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium">1. Datos Básicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm text-muted-foreground">Nombre completo</label>
                  <Input 
                    value={fullName} 
                    onChange={(e)=>setFullName(e.target.value)} 
                    placeholder="Tu nombre completo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-muted-foreground">Tipo de documento</label>
                  <Select value={idType} onChange={(e)=>setIdType(e.target.value)}>
                    <option value="cedula">Cédula</option>
                    <option value="pasaporte">Pasaporte</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-muted-foreground">Número de documento</label>
                  <Input 
                    value={idNumber} 
                    onChange={(e)=>setIdNumber(e.target.value)} 
                    placeholder="000-0000000-0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-muted-foreground">Fecha de nacimiento</label>
                  <Input 
                    type="date" 
                    value={birthDate} 
                    onChange={(e)=>setBirthDate(e.target.value)} 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm text-muted-foreground">Nacionalidad</label>
                  <Input 
                    value={nationality} 
                    onChange={(e)=>setNationality(e.target.value)} 
                    placeholder="Dominicana"
                  />
                </div>
              </div>
            </section>

            {/* 2. Contacto */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium">2. Información de Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm text-muted-foreground">Teléfono principal</label>
                  <Input 
                    value={phone} 
                    onChange={(e)=>setPhone(e.target.value)} 
                    placeholder="809-000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-muted-foreground">Correo electrónico</label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e)=>setEmail(e.target.value)} 
                    placeholder="tu@email.com"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm text-muted-foreground">Dirección actual</label>
                  <Input 
                    value={address} 
                    onChange={(e)=>setAddress(e.target.value)} 
                    placeholder="Calle, ciudad"
                  />
                </div>
              </div>
            </section>

            {/* 3. Rol */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium">3. Tipo de Vendedor</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    className={`rounded-md border px-4 py-3 text-sm text-left transition-colors ${
                      roleChoice === 'vendedor_particular' 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                        : 'border-border hover:bg-muted'
                    }`}
                    onClick={()=>setRoleChoice('vendedor_particular')}
                  >
                    <div className="font-medium">Vendedor particular</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Vendo propiedades que me pertenecen
                    </div>
                  </button>
                  <button 
                    type="button" 
                    className={`rounded-md border px-4 py-3 text-sm text-left transition-colors ${
                      roleChoice === 'agente_inmobiliario' 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                        : 'border-border hover:bg-muted'
                    }`}
                    onClick={()=>setRoleChoice('agente_inmobiliario')}
                  >
                    <div className="font-medium">Agente inmobiliario</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Represento a clientes en la venta de propiedades
                    </div>
                  </button>
                </div>
                
                {requiresAgentData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="block text-sm text-muted-foreground">Nombre de la empresa / agencia</label>
                      <Input 
                        value={companyName} 
                        onChange={(e)=>setCompanyName(e.target.value)} 
                        placeholder="Nombre de tu agencia"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm text-muted-foreground">RNC / Registro fiscal</label>
                      <Input 
                        value={companyTaxId} 
                        onChange={(e)=>setCompanyTaxId(e.target.value)} 
                        placeholder="0-00-00000-0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm text-muted-foreground">Número de licencia (opcional)</label>
                      <Input 
                        value={licenseNumber} 
                        onChange={(e)=>setLicenseNumber(e.target.value)} 
                        placeholder="Licencia de agente"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm text-muted-foreground">Cargo en la empresa</label>
                      <Input 
                        value={jobTitle} 
                        onChange={(e)=>setJobTitle(e.target.value)} 
                        placeholder="Agente inmobiliario"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="block text-sm text-muted-foreground">Relación con la propiedad</label>
                      <Input 
                        value={ownerRelation} 
                        onChange={(e)=>setOwnerRelation(e.target.value)} 
                        placeholder="propietario / familiar / apoderado"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm text-muted-foreground">Documento que lo avale (URL opcional)</label>
                      <Input 
                        value={ownershipProofUrl} 
                        onChange={(e)=>setOwnershipProofUrl(e.target.value)} 
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 4. Verificación de identidad */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium">4. Documentos de Verificación</h3>
              <p className="text-xs text-muted-foreground">
                Sube imágenes claras de tus documentos de identidad y una selfie para completar la verificación.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm text-muted-foreground">Documento frontal</label>
                  <div className="relative">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e)=>onFilePick(e,setDocFrontUrl)} 
                      className="file:mr-2 file:py-1 file:px-3 file:text-sm file:rounded file:border file:border-border file:bg-background file:text-foreground hover:file:bg-muted"
                    />
                    {docFrontUrl && (
                      <a 
                        className="text-xs text-emerald-700 mt-1 inline-block" 
                        href={docFrontUrl} 
                        target="_blank"
                      >
                        Ver archivo
                      </a>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-muted-foreground">Documento trasero</label>
                  <div className="relative">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e)=>onFilePick(e,setDocBackUrl)} 
                      className="file:mr-2 file:py-1 file:px-3 file:text-sm file:rounded file:border file:border-border file:bg-background file:text-foreground hover:file:bg-muted"
                    />
                    {docBackUrl && (
                      <a 
                        className="text-xs text-emerald-700 mt-1 inline-block" 
                        href={docBackUrl} 
                        target="_blank"
                      >
                        Ver archivo
                      </a>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-muted-foreground">Selfie en vivo</label>
                  <div className="relative">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e)=>onFilePick(e,setSelfieUrl)} 
                      className="file:mr-2 file:py-1 file:px-3 file:text-sm file:rounded file:border file:border-border file:bg-background file:text-foreground hover:file:bg-muted"
                    />
                    {selfieUrl && (
                      <a 
                        className="text-xs text-emerald-700 mt-1 inline-block" 
                        href={selfieUrl} 
                        target="_blank"
                      >
                        Ver archivo
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* 5. Confirmaciones */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium">5. Confirmaciones</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 text-sm">
                  <input 
                    type="checkbox" 
                    checked={termsAccepted} 
                    onChange={(e)=>setTermsAccepted(e.target.checked)} 
                    className="mt-0.5 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-muted-foreground">
                    Acepto los <a href="#" className="text-emerald-600 hover:underline">términos y condiciones</a> de la plataforma
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input 
                    type="checkbox" 
                    checked={confirmTruth} 
                    onChange={(e)=>setConfirmTruth(e.target.checked)} 
                    className="mt-0.5 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-muted-foreground">
                    Confirmo que la información proporcionada es verdadera y autorizo las verificaciones necesarias
                  </span>
                </label>
              </div>
            </section>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                type="button" 
                disabled={loading} 
                onClick={saveDraft}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {loading ? "Guardando..." : "Guardar borrador"}
              </Button>
              <Button 
                type="button" 
                disabled={loading} 
                onClick={submit}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? "Enviando..." : "Enviar solicitud"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}