"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Enhanced edit form for public.users that includes all seller application fields
export default function ProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);

  // Fields present in public.users
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState<"comprador" | "vendedor" | "agente" | "empresa_constructora">("comprador");

  // Fields from seller_applications (enhanced to match seller/apply)
  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState("cedula");
  const [idNumber, setIdNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [nationality, setNationality] = useState("");

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [roleChoice, setRoleChoice] = useState<"agente_inmobiliario" | "vendedor_particular" | "empresa_constructora" | null>(null);

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

  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialUrls, setSocialUrls] = useState("");

  const requiresAgentData = useMemo(() => roleChoice === "agente_inmobiliario", [roleChoice]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: session } = await supabase.auth.getSession();
        const uid = session.session?.user?.id;
        if (!uid) {
          router.replace("/login");
          return;
        }
        const { data, error } = await supabase
          .from("users")
          .select("name, email, bio, role")
          .eq("id", uid)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setName(data.name ?? "");
          setEmail(data.email ?? session.session?.user?.email ?? "");
          setBio(data.bio ?? "");
          setRole((data.role as any) ?? "comprador");
        } else {
          // If row missing, prefill from auth
          setEmail(session.session?.user?.email ?? "");
          setRole("comprador");
        }

        // Load latest seller_applications to prefill all fields
        const { data: existing } = await supabase
          .from("seller_applications")
          .select("*")
          .eq("user_id", uid)
          .in("status", ["draft", "submitted", "needs_more_info", "approved"] as any)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) {
          setAppId(existing.id);
          // Basic fields
          setFullName(existing.full_name ?? "");
          setIdType(existing.id_document_type ?? "cedula");
          setIdNumber(existing.id_document_number ?? "");
          setBirthDate(existing.birth_date ?? "");
          setNationality(existing.nationality ?? "");

          // Contact fields
          setPhone(existing.phone ?? "");
          setEmail(existing.email ?? "");
          setAddress(existing.address ?? "");

          // Role choice
          // Only set if we actually found a record with a choice
          if (existing.role_choice) {
            setRoleChoice(existing.role_choice as any);
          }

          // Agent data
          setCompanyName(existing.company_name ?? "");
          setCompanyTaxId(existing.company_tax_id ?? "");
          setLicenseNumber(existing.license_number ?? "");
          setJobTitle(existing.job_title ?? "");

          // Owner data
          setOwnerRelation(existing.owner_relation ?? "");
          setOwnershipProofUrl(existing.ownership_proof_url ?? "");

          // Documents
          setDocFrontUrl(existing.doc_front_url ?? "");
          setDocBackUrl(existing.doc_back_url ?? "");
          setSelfieUrl(existing.selfie_url ?? "");

          // Confirmations
          setTermsAccepted(!!existing.terms_accepted);
          setConfirmTruth(!!existing.confirm_truth);

          // Social fields
          setLinkedinUrl(existing.linkedin_url ?? "");
          setWebsiteUrl(existing.website_url ?? "");
          setSocialUrls(existing.social_urls?.join(", ") ?? "");
        }
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

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
    // Note: In edit mode, we're not handling file uploads to keep it simple
    // Users would need to re-upload if they want to change documents
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) {
        router.replace("/login");
        return;
      }

      // Use fullName as the primary name field, fallback to name if fullName is empty
      const displayName = fullName || name;

      // Upsert the users row (without changing role)
      const { error } = await supabase
        .from("users")
        .upsert({ id: uid, name: displayName, email, bio })
        .eq("id", uid);
      if (error) throw error;

      // Upsert/merge seller_applications with all fields
      const payload: Record<string, unknown> = {
        user_id: uid,
        full_name: displayName, // Use the display name as full_name
        id_document_type: idType,
        id_document_number: idNumber,
        birth_date: birthDate || null,
        nationality,
        phone,
        email: email,
        address,
        role_choice: roleChoice || "vendedor_particular", // Fallback only on save if somehow null
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
        linkedin_url: linkedinUrl || null,
        website_url: websiteUrl || null,
        social_urls: socialUrls ? socialUrls.split(",").map(url => url.trim()) : null,
        status: "draft", // Always save as draft in profile edit
      };

      if (appId) {
        const { error: e2 } = await supabase
          .from("seller_applications")
          .update(payload)
          .eq("id", appId);
        if (e2) throw e2;
      } else {
        const { data: ins, error: e3 } = await supabase
          .from("seller_applications")
          .insert(payload)
          .select("id")
          .single();
        if (e3) throw e3;
        setAppId(ins.id);
      }

      // Sync into auth metadata for convenience
      try {
        await supabase.auth.updateUser({ data: { name: displayName } });
      } catch { }

      // Also update the public_profiles table to ensure consistency
      try {
        const publicProfileData: Record<string, unknown> = {
          id: uid,
          name: displayName,
          email: email,
          bio: bio || null,
        };

        await supabase
          .from('public_profiles')
          .upsert(publicProfileData)
          .eq('id', uid);
      } catch (e) {
        console.debug("Error updating public_profiles", e);
      }

      setSuccess("Perfil actualizado correctamente");
      // Navigate back to profile after a brief delay
      setTimeout(() => router.push("/profile"), 600);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  // Sin edición de avatar aquí; eso se maneja desde el menú del perfil.

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 space-y-8">
      <div className="flex flex-col gap-2 mb-4">
        <h1 className="text-3xl font-serif font-bold text-foreground">Editar Perfil</h1>
        <p className="text-muted-foreground">Actualiza tu información personal y profesional.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8 items-start">
        {/* Left Column: Form Sections */}
        <div className="space-y-6 sm:space-y-8">
          {loading ? (
            <div className="text-sm text-muted-foreground p-8 text-center bg-card/50 rounded-2xl animate-pulse">Cargando información...</div>
          ) : (
            <>
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  {success}
                </div>
              )}

              {/* 1) Datos Personales */}
              <Card className="rounded-2xl border-border/40 shadow-sm bg-card/50 backdrop-blur-sm group overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                  <CardTitle className="text-xl font-serif flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                    Datos Personales
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Nombre completo</label>
                      <Input
                        value={fullName || name}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          setName(e.target.value);
                        }}
                        placeholder="Tu nombre"
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Email</label>
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="tu@email.com"
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Tipo de documento</label>
                      <div className="relative">
                        <select
                          value={idType}
                          onChange={(e) => setIdType(e.target.value)}
                          className="w-full h-11 rounded-xl border border-input bg-background/50 px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer transition-all hover:bg-muted/50"
                        >
                          <option value="cedula">Cédula</option>
                          <option value="pasaporte">Pasaporte</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Número de documento</label>
                      <Input
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Nacionalidad</label>
                      <Input
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        placeholder="Dominicana"
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Fecha de nacimiento</label>
                      <Input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Biografía</label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Escribe una breve introducción sobre ti..."
                        maxLength={500}
                        rows={3}
                      />
                      <p className="mt-1 text-xs text-muted-foreground text-right">{bio.length}/500</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2) Contacto y Redes */}
              <Card className="rounded-2xl border-border/40 shadow-sm bg-card/50 backdrop-blur-sm group overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                  <CardTitle className="text-xl font-serif flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                    Contacto y Redes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Teléfono</label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="809-000-0000"
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Dirección</label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Calle, ciudad"
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">LinkedIn (URL)</label>
                      <Input
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/tu-perfil"
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Sitio web (URL)</label>
                      <Input
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://tusitio.com"
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Otras redes sociales (separadas por coma)</label>
                      <Input
                        value={socialUrls}
                        onChange={(e) => setSocialUrls(e.target.value)}
                        placeholder="https://facebook.com/tu-perfil, https://instagram.com/tu-perfil"
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3) Perfil Profesional */}
              <Card className="rounded-2xl border-border/40 shadow-sm bg-card/50 backdrop-blur-sm group overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                  <CardTitle className="text-xl font-serif flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                    Perfil Profesional
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Rol actual</label>
                      <Input
                        readOnly
                        value={
                          role === "empresa_constructora"
                            ? "Empresa constructora"
                            : (role === "agente" && appId)
                              ? "Agente Inmobiliario (Verificado)"
                              : (role === "vendedor" && appId)
                                ? "Vendedor (Verificado)"
                                : appId
                                  ? "Comprador (Verificación pendiente)"
                                  : "Comprador"
                        }
                        className="bg-muted/20 h-11 rounded-xl border-dashed"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Tipo de vendedor</label>
                      <Input
                        readOnly
                        value={
                          !roleChoice
                            ? "No seleccionado"
                            : roleChoice === "vendedor_particular"
                              ? "Vendedor particular"
                              : roleChoice === "agente_inmobiliario"
                                ? "Agente inmobiliario"
                                : "Empresa constructora"
                        }
                        className="bg-muted/20 h-11 rounded-xl border-dashed"
                      />
                    </div>
                  </div>

                  {requiresAgentData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-border/40">
                      <div>
                        <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Nombre de la empresa / agencia</label>
                        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="bg-background/50 h-11 rounded-xl transition-all" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">RNC / Registro fiscal</label>
                        <Input value={companyTaxId} onChange={(e) => setCompanyTaxId(e.target.value)} className="bg-background/50 h-11 rounded-xl transition-all" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Número de licencia (opcional)</label>
                        <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="bg-background/50 h-11 rounded-xl transition-all" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Cargo en la empresa</label>
                        <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="bg-background/50 h-11 rounded-xl transition-all" />
                      </div>
                    </div>
                  ) : roleChoice !== "empresa_constructora" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-border/40">
                      <div>
                        <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Relación con la propiedad</label>
                        <Input value={ownerRelation} onChange={(e) => setOwnerRelation(e.target.value)} placeholder="propietario / familiar / apoderado" className="bg-background/50 h-11 rounded-xl transition-all" />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1.5 block">Documento que lo avale</label>
                        <Input value={ownershipProofUrl} onChange={(e) => setOwnershipProofUrl(e.target.value)} placeholder="URL de documento" className="bg-background/50 h-11 rounded-xl transition-all" />
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* 4) Documentación */}
              <Card className="rounded-2xl border-border/40 shadow-sm bg-card/50 backdrop-blur-sm group overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                  <CardTitle className="text-xl font-serif flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
                    Documentación
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                      { label: "Documento frontal", url: docFrontUrl },
                      { label: "Documento trasero", url: docBackUrl },
                      { label: "Selfie en vivo", url: selfieUrl },
                    ].map((doc, idx) => (
                      <div key={idx} className="space-y-3">
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">{doc.label}</label>
                        <div className={`relative aspect-[4/3] rounded-2xl border-2 border-dashed flex items-center justify-center p-4 text-center transition-all ${doc.url ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-muted/20'}`}>
                          {doc.url ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                              </div>
                              <span className="text-xs text-primary font-bold">Cargado</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No archivo</span>
                          )}
                        </div>
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-[10px] text-primary font-bold hover:underline">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            Ver documento
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border/40 text-center">
                    Para actualizar documentos sensibles de identidad, por favor contacta a soporte o inicia una nueva verificación.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Right Column: Actions */}
        <div className="md:sticky md:top-24 h-fit space-y-6">
          <Card className="rounded-2xl border-border/40 shadow-lg bg-card/60 backdrop-blur-xl">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
              <CardTitle className="font-serif font-black text-xl tracking-tight">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <label className="flex items-start gap-3 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-muted-foreground">Acepto términos y condiciones</span>
                </label>
                <label className="flex items-start gap-3 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmTruth}
                    onChange={(e) => setConfirmTruth(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-muted-foreground">Confirmo que la información es verídica</span>
                </label>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/40">
                <Button
                  onClick={onSave}
                  disabled={saving || loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  disabled={saving}
                  className="w-full h-11 rounded-xl text-muted-foreground hover:text-primary transition-all text-xs font-bold hover:bg-primary/5"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
