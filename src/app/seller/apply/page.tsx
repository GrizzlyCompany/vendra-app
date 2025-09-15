"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Minimal seller application form matching DB schema
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
      const name = (session.session?.user?.user_metadata as any)?.name ?? "";
      setFullName((n) => n || name);

      const { data: existing } = await supabase
        .from("seller_applications")
        .select("*")
        .eq("user_id", uid)
        .in("status", ["draft", "submitted", "needs_more_info"] as any)
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
        setRoleChoice((existing.role_choice ?? "vendedor_particular") as any);
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
    } catch (err: any) {
      setError(err?.message ?? "Error subiendo archivo");
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
      const payload: any = {
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
    } catch (err: any) {
      setError(err?.message ?? "Error guardando borrador");
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
      const payload: any = {
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
            .in("status", ["submitted", "approved"] as any)
            .maybeSingle();
          if (check) break;
          await new Promise(r => setTimeout(r, 150));
        }
      } catch {}
      router.push("/properties/new");
    } catch (err: any) {
      setError(err?.message ?? "Error enviando solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-background flex items-center justify-center px-4 py-10 mobile-bottom-safe">
      <Card className="w-full max-w-2xl border-[hsl(var(--border))]">
        <CardHeader>
          <CardTitle className="font-serif text-2xl text-foreground">Verificación para Vendedor/Agente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
            {success && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">{success}</div>}

            {/* 1. Datos Básicos */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Nombre completo</label>
                <Input value={fullName} onChange={(e)=>setFullName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Tipo de documento</label>
                <select value={idType} onChange={(e)=>setIdType(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="cedula">Cédula</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Número de documento</label>
                <Input value={idNumber} onChange={(e)=>setIdNumber(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Fecha de nacimiento</label>
                <Input type="date" value={birthDate} onChange={(e)=>setBirthDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Nacionalidad</label>
                <Input value={nationality} onChange={(e)=>setNationality(e.target.value)} />
              </div>
            </section>

            {/* 2. Contacto */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Teléfono principal</label>
                <Input value={phone} onChange={(e)=>setPhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Correo electrónico</label>
                <Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-muted-foreground mb-1">Dirección actual</label>
                <Input value={address} onChange={(e)=>setAddress(e.target.value)} />
              </div>
            </section>

            {/* 3. Rol */}
            <section className="space-y-2">
              <label className="block text-sm text-muted-foreground">Soy</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button type="button" className={`border rounded-md px-3 py-2 text-sm ${roleChoice==='vendedor_particular'?'border-emerald-500':'border-border'}`} onClick={()=>setRoleChoice('vendedor_particular')}>Vendedor particular</button>
                <button type="button" className={`border rounded-md px-3 py-2 text-sm ${roleChoice==='agente_inmobiliario'?'border-emerald-500':'border-border'}`} onClick={()=>setRoleChoice('agente_inmobiliario')}>Agente inmobiliario</button>
              </div>
              {requiresAgentData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Nombre de la empresa / agencia</label>
                    <Input value={companyName} onChange={(e)=>setCompanyName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">RNC / Registro fiscal</label>
                    <Input value={companyTaxId} onChange={(e)=>setCompanyTaxId(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Número de licencia (opcional)</label>
                    <Input value={licenseNumber} onChange={(e)=>setLicenseNumber(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Cargo en la empresa</label>
                    <Input value={jobTitle} onChange={(e)=>setJobTitle(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Relación con la propiedad</label>
                    <Input value={ownerRelation} onChange={(e)=>setOwnerRelation(e.target.value)} placeholder="propietario / familiar / apoderado" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Documento que lo avale (URL opcional)</label>
                    <Input value={ownershipProofUrl} onChange={(e)=>setOwnershipProofUrl(e.target.value)} placeholder="URL de documento" />
                  </div>
                </div>
              )}
            </section>

            {/* 4. Verificación de identidad */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Documento frontal</label>
                <Input type="file" accept="image/*" onChange={(e)=>onFilePick(e,setDocFrontUrl)} />
                {docFrontUrl && <a className="text-xs text-emerald-700" href={docFrontUrl} target="_blank">Ver archivo</a>}
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Documento trasera</label>
                <Input type="file" accept="image/*" onChange={(e)=>onFilePick(e,setDocBackUrl)} />
                {docBackUrl && <a className="text-xs text-emerald-700" href={docBackUrl} target="_blank">Ver archivo</a>}
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Selfie en vivo</label>
                <Input type="file" accept="image/*" onChange={(e)=>onFilePick(e,setSelfieUrl)} />
                {selfieUrl && <a className="text-xs text-emerald-700" href={selfieUrl} target="_blank">Ver archivo</a>}
              </div>
            </section>

            {/* 6. Confirmaciones */}
            <section className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={termsAccepted} onChange={(e)=>setTermsAccepted(e.target.checked)} />
                Acepto términos y condiciones
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={confirmTruth} onChange={(e)=>setConfirmTruth(e.target.checked)} />
                Confirmo que la información es verdadera y autorizo verificaciones necesarias
              </label>
            </section>

            <div className="flex gap-3">
              <Button type="button" disabled={loading} onClick={saveDraft}>Guardar borrador</Button>
              <Button type="button" disabled={loading} onClick={submit} className="bg-emerald-600 hover:bg-emerald-700 text-white">Enviar solicitud</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
