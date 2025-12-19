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
  const [role, setRole] = useState<"comprador" | "vendedor_agente" | "empresa_constructora">("comprador");

  // Fields from seller_applications (enhanced to match seller/apply)
  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState("cedula");
  const [idNumber, setIdNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [nationality, setNationality] = useState("");

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [roleChoice, setRoleChoice] = useState<"agente_inmobiliario" | "vendedor_particular" | "empresa_constructora">("vendedor_particular");

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
          setRoleChoice((existing.role_choice ?? "vendedor_particular") as any);

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
    <div className="container mx-auto max-w-3xl p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Editar información del perfil</CardTitle>
          <p className="text-sm text-muted-foreground">Actualiza tus datos básicos y tu información de vendedor. Este formulario mantiene el mismo estilo y estructura que el de verificación de vendedor.</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando…</div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">
                  {success}
                </div>
              )}

              {/* 1) Datos básicos */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium">1) Datos básicos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Nombre completo</label>
                    <Input value={fullName || name} onChange={(e) => {
                      setFullName(e.target.value);
                      // Also update name to keep them in sync
                      setName(e.target.value);
                    }} placeholder="Tu nombre" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Email</label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="tu@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Tipo de documento</label>
                    <select value={idType} onChange={(e) => setIdType(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                      <option value="cedula">Cédula</option>
                      <option value="pasaporte">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Número de documento</label>
                    <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Nacionalidad</label>
                    <Input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Dominicana" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Fecha de nacimiento</label>
                    <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-muted-foreground mb-1">Biografía</label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Escribe una breve introducción sobre ti..."
                      maxLength={500}
                      rows={3}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{bio.length}/500 caracteres</p>
                  </div>
                </div>
              </section>

              {/* 2) Foto de perfil */}
              <section className="space-y-2">
                <h3 className="text-sm font-medium">2) Foto de perfil</h3>
                <p className="text-xs text-muted-foreground">La edición de la foto se realiza desde el menú de tu perfil usando la opción “Editar foto de perfil”.</p>
              </section>

              {/* 3) Contacto */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium">3) Información de contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Teléfono</label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="809-000-0000" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Dirección</label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, ciudad" />
                  </div>
                </div>
              </section>

              {/* 4) Rol en la plataforma (solo lectura) */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium">4) Rol en la plataforma</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Rol actual</label>
                    <Input
                      readOnly
                      value={
                        role === "empresa_constructora" ? "Empresa constructora" :
                          (role === "vendedor_agente" && (appId || roleChoice !== 'vendedor_particular')) ? "Vendedor/Agente" :
                            "Comprador"
                      }
                    />
                    <p className="mt-1 text-xs text-muted-foreground">El rol es administrado por el sistema según tu aplicación como vendedor.</p>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Tipo de vendedor</label>
                    <Input
                      readOnly
                      value={roleChoice === "vendedor_particular" ? "Vendedor particular" : roleChoice === "agente_inmobiliario" ? "Agente inmobiliario" : "Empresa constructora"}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Seleccionado en tu aplicación como vendedor.</p>
                  </div>
                </div>

                {/* Conditional fields based on role choice */}
                {requiresAgentData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">Nombre de la empresa / agencia</label>
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">RNC / Registro fiscal</label>
                      <Input value={companyTaxId} onChange={(e) => setCompanyTaxId(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">Número de licencia (opcional)</label>
                      <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">Cargo en la empresa</label>
                      <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                    </div>
                  </div>
                ) : roleChoice !== "empresa_constructora" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">Relación con la propiedad</label>
                      <Input value={ownerRelation} onChange={(e) => setOwnerRelation(e.target.value)} placeholder="propietario / familiar / apoderado" />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">Documento que lo avale (URL opcional)</label>
                      <Input value={ownershipProofUrl} onChange={(e) => setOwnershipProofUrl(e.target.value)} placeholder="URL de documento" />
                    </div>
                  </div>
                ) : null}
              </section>

              {/* 5) Redes sociales */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium">5) Redes sociales y contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">LinkedIn (URL)</label>
                    <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/tu-perfil" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Sitio web (URL)</label>
                    <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://tusitio.com" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-muted-foreground mb-1">Otras redes sociales (separadas por coma)</label>
                    <Input value={socialUrls} onChange={(e) => setSocialUrls(e.target.value)} placeholder="https://facebook.com/tu-perfil, https://instagram.com/tu-perfil" />
                  </div>
                </div>
              </section>

              {/* 6) Verificación de identidad */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium">6) Documentos de verificación</h3>
                <p className="text-xs text-muted-foreground">Para actualizar tus documentos de identidad, por favor contacta al soporte o vuelve a aplicar como vendedor.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Documento frontal</label>
                    {docFrontUrl ? (
                      <a className="text-xs text-emerald-700" href={docFrontUrl} target="_blank">Ver archivo actual</a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No proporcionado</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Documento trasero</label>
                    {docBackUrl ? (
                      <a className="text-xs text-emerald-700" href={docBackUrl} target="_blank">Ver archivo actual</a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No proporcionado</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Selfie en vivo</label>
                    {selfieUrl ? (
                      <a className="text-xs text-emerald-700" href={selfieUrl} target="_blank">Ver archivo actual</a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No proporcionado</span>
                    )}
                  </div>
                </div>
              </section>

              {/* 7) Confirmaciones */}
              <section className="space-y-2">
                <h3 className="text-sm font-medium">7) Confirmaciones</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                  Acepto términos y condiciones
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={confirmTruth} onChange={(e) => setConfirmTruth(e.target.checked)} />
                  Confirmo que la información es verdadera y autorizo verificaciones necesarias
                </label>
              </section>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="button" onClick={onSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {saving ? "Guardando…" : "Guardar cambios"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
