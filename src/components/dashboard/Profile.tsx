"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Upload, FileText, Download, Trash2, Plus, CheckCircle } from "lucide-react";
import { validateCompanyProfileForm, type CompanyProfileFormData } from "@/lib/validation";
import { useToastContext } from "@/components/ToastProvider";
import { fetchUserProfile, updateUserProfile, fetchUserRole } from "@/lib/database";

export function ProfileSection() {
  const [uid, setUid] = useState<string | null>(null);
  const { error: showError, success: showSuccess } = useToastContext();

  // Company profile form state
  const [form, setForm] = useState<CompanyProfileFormData>({
    name: "",
    email: "",
    bio: "",
    phone: "",
    logo_url: "",
    rnc: "",
    website: "",
    headquarters_address: "",
    operational_areas: "",
    contact_person: "",
    primary_phone: "",
    secondary_phone: "",
    legal_documents: [],
    facebook_url: "",
    instagram_url: "",
    linkedin_url: "",
    legal_documents: [],
    facebook_url: "",
    instagram_url: "",
    linkedin_url: "",
    terms_accepted: false,
    banner_url: "",
  });

  const PREDEFINED_BANNERS = [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2670&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1554469384-e58fac16e23a?q=80&w=2574&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2669&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2670&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1449824913929-7b77f555872a?q=80&w=2574&auto=format&fit=crop"
  ];

  const [saving, setSaving] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const legalDocsInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const id = session?.session?.user?.id ?? null;
        if (!mounted || !id) return;

        setUid(id);

        // Use safe profile fetcher which handles missing columns gracefully
        const user = await fetchUserProfile(id);

        if (user && mounted) {
          const operationalAreasString = Array.isArray(user.operational_areas)
            ? user.operational_areas.join(", ")
            : "";

          setForm({
            name: user.name,
            email: user.email,
            bio: (user as any).bio ?? "",
            phone: user.phone,
            logo_url: user.avatar_url ?? "",
            rnc: user.rnc,
            website: user.website,
            headquarters_address: user.headquarters_address,
            operational_areas: operationalAreasString,
            contact_person: user.contact_person,
            primary_phone: user.primary_phone,
            secondary_phone: user.secondary_phone,
            legal_documents: user.legal_documents,
            facebook_url: user.facebook_url,
            instagram_url: user.instagram_url,
            linkedin_url: user.linkedin_url,
            linkedin_url: user.linkedin_url,
            terms_accepted: user.terms_accepted,
            banner_url: (user as any).banner_url ?? "",
          });

          setAvatarPreview(user.avatar_url);
          setUserRole(user.role);
        }
      } catch (err: any) {
        if (mounted) {
          console.error("Error loading profile:", err.message || err);
          showError("Error al cargar el perfil", "No se pudieron cargar los datos del perfil");
        }
      }
    };

    loadProfile();
    return () => { mounted = false; };
  }, [showError]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const onTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const onSave = async () => {
    if (!uid) return;

    // Validate form
    const validation = validateCompanyProfileForm(form);
    if (!validation.success) {
      const errorMessage = validation.error.issues
        ?.map((issue: any) => issue.message)
        .join(', ') || 'Errores de validación encontrados';
      showError("Error de validación", errorMessage);
      return;
    }

    setSaving(true);
    try {
      // Process operational areas (convert string to array, filter empty values)
      const operationalAreasArray = (form.operational_areas || "")
        .split(',')
        .map(area => area.trim())
        .filter(area => area.length > 0);

      const updateData = {
        name: form.name,
        email: form.email,
        bio: form.bio || null,
        avatar_url: form.logo_url,
        rnc: form.rnc,
        website: form.website || null,
        headquarters_address: form.headquarters_address || null,
        operational_areas: operationalAreasArray,
        contact_person: form.contact_person || null,
        primary_phone: form.primary_phone || null,
        secondary_phone: form.secondary_phone || null,
        legal_documents: form.legal_documents,
        facebook_url: form.facebook_url || null,
        instagram_url: form.instagram_url || null,
        linkedin_url: form.linkedin_url || null,
        terms_accepted: form.terms_accepted,
      };

      await updateUserProfile(uid, updateData);

      // Sync public-facing data to public_profiles for visibility to other users
      try {
        await supabase
          .from("public_profiles")
          .update({
            name: form.name,
            bio: form.bio || null,
            avatar_url: form.logo_url,
            website: form.website || null,
            phone: form.primary_phone || null,
            headquarters_address: form.headquarters_address || null,
            operational_areas: operationalAreasArray,
            facebook_url: form.facebook_url || null,
            instagram_url: form.instagram_url || null,
            linkedin_url: form.linkedin_url || null,
            banner_url: form.banner_url || null,
          })
          .eq("id", uid);
      } catch (syncError) {
        console.warn("Could not sync to public_profiles:", syncError);
        // Don't fail the save if sync fails
      }

      showSuccess("Perfil actualizado", "Los cambios en tu perfil han sido guardados exitosamente");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      showError("Error al guardar", err.message || "No se pudieron guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  // Legal documents handlers
  const onPickLegalDocs = () => {
    if (legalDocsInputRef.current) legalDocsInputRef.current.value = "";
    legalDocsInputRef.current?.click();
  };

  const onLegalDocsFile = async (files?: FileList | null) => {
    if (!files || files.length === 0 || !uid) return;

    setUploadingDocs(true);
    try {
      const newDocUrls: string[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.includes('pdf')) {
          showError("Tipo de archivo no válido", "Solo se permiten archivos PDF");
          continue;
        }

        const fileName = `legal_${Date.now()}_${file.name}`;
        const path = `${uid}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("legal-docs")
          .upload(path, file, { upsert: true, cacheControl: "3600", contentType: "application/pdf" });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: publicUrl } = supabase.storage
          .from("legal-docs")
          .getPublicUrl(uploadData.path);

        if (publicUrl?.publicUrl) {
          newDocUrls.push(publicUrl.publicUrl);
        }
      }

      if (newDocUrls.length > 0) {
        const updatedDocs = [...(form.legal_documents || []), ...newDocUrls];
        setForm(prev => ({ ...prev, legal_documents: updatedDocs }));

        // Update database immediately using safe utility
        await updateUserProfile(uid, { legal_documents: updatedDocs });

        showSuccess("Documentos subidos", `Se subieron ${newDocUrls.length} documento(s) legal(es)`);
      }
    } catch (err: any) {
      console.error("Error uploading legal docs:", err);
      showError("Error al subir documentos", "No se pudieron subir los documentos legales");
    } finally {
      setUploadingDocs(false);
    }
  };

  const downloadDocument = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const removeDocument = async (urlToRemove: string) => {
    if (!uid) return;
    try {
      const updatedDocs = (form.legal_documents || []).filter(url => url !== urlToRemove);
      setForm(prev => ({ ...prev, legal_documents: updatedDocs }));

      await updateUserProfile(uid, { legal_documents: updatedDocs });

      showSuccess("Documento eliminado", "El documento legal ha sido eliminado");
    } catch (err) {
      console.error("Error removing document:", err);
      showError("Error al eliminar", "No se pudo eliminar el documento");
    }
  };

  // Avatar: open file picker and upload to Supabase, then update profile
  const onPickAvatar = () => {
    if (fileInputRef.current) fileInputRef.current.value = ""; // permite re-seleccionar el mismo archivo
    fileInputRef.current?.click();
  };

  const onAvatarFile = async (file?: File | null) => {
    if (!file) return;
    // Show instant local preview
    try {
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
      setForm(prev => ({ ...prev, logo_url: objectUrl }));
    } catch { }

    try {
      const uid = (await supabase.auth.getSession()).data.session?.user?.id ?? null;
      if (!uid) {
        alert("No se pudo identificar al usuario. Intenta iniciar sesión nuevamente.");
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${uid}/${Date.now()}.${ext}`;
      const { data: upData, error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type || "image/jpeg" });

      if (upErr) {
        alert(`Error al subir la imagen: ${upErr.message}`);
        return;
      }

      const storedPath = upData?.path ?? path;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(storedPath);
      const publicUrl = pub?.publicUrl ?? null;

      if (!publicUrl) {
        alert("No se pudo obtener la URL pública del avatar.");
        return;
      }

      const { error: updErr } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", uid);

      if (updErr) {
        alert(`La imagen se subió pero no se pudo guardar en el perfil: ${updErr.message}`);
      }

      // Update form with the public URL
      setForm(prev => ({ ...prev, logo_url: publicUrl }));

      // Persist also in auth metadata as fallback source on reload
      try {
        await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      } catch { }
    } catch (e: any) {
      alert(`Error inesperado al subir avatar: ${e?.message ?? e}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="font-serif text-2xl text-[#1C4B2E]">Perfil de Empresa</h2>

      {/* Section 1: Datos de la empresa */}
      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="font-serif text-xl">1. Datos de la empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar section */}
          <div className="flex flex-col items-center gap-4">
            <Avatar
              className="h-24 w-24 border-2 border-primary"
              src={avatarPreview ?? null}
              initials={form.name ? form.name.charAt(0) : "E"}
            />
            <Button
              onClick={onPickAvatar}
              variant="outline"
              className="flex items-center gap-2"
              disabled={saving}
            >
              <Upload className="h-4 w-4" />
              Subir Logo de Empresa
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Subir logo de empresa"
              onChange={(e) => onAvatarFile(e.target.files?.[0])}
            />
          </div>

          {/* Banner Selection for All Roles */}
          <div className="space-y-4 pt-4 border-t">
            <label className="text-sm font-medium">Banner de Perfil</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PREDEFINED_BANNERS.map((banner, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, banner_url: banner }))}
                  className={`relative aspect-[3/1] rounded-lg overflow-hidden border-2 transition-all ${form.banner_url === banner
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-transparent hover:border-primary/50'
                    }`}
                >
                  <img
                    src={banner}
                    alt={`Banner option ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {form.banner_url === banner && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-white rounded-full p-1">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>


          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="name">Nombre de la empresa *</label>
              <Input id="name" name="name" value={form.name} onChange={onChange} disabled={saving} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="email">Correo electrónico *</label>
              <Input id="email" name="email" type="email" value={form.email} onChange={onChange} disabled={saving} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="phone">Teléfono principal</label>
              <Input id="phone" name="phone" value={form.phone} onChange={onChange} disabled={saving} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="rnc">RNC / Registro mercantil *</label>
              <Input id="rnc" name="rnc" value={form.rnc} onChange={onChange} disabled={saving} placeholder="Ej: 123456789" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="website">Sitio web oficial</label>
              <Input id="website" name="website" type="url" value={form.website} onChange={onChange} disabled={saving} placeholder="https://ejemplo.com" />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="headquarters_address">Dirección principal / sede</label>
              <textarea
                id="headquarters_address"
                name="headquarters_address"
                value={form.headquarters_address}
                onChange={onTextareaChange}
                disabled={saving}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Dirección completa de la sede principal"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="bio">Biografía / Descripción de la empresa</label>
              <textarea
                id="bio"
                name="bio"
                value={form.bio}
                onChange={onTextareaChange}
                disabled={saving}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Cuéntanos sobre tu empresa, su misión y experiencia..."
              />
              <p className="text-xs text-muted-foreground text-right">{form.bio?.length || 0}/1000 caracteres</p>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="operational_areas">Áreas de operación</label>
              <Input
                id="operational_areas"
                name="operational_areas"
                value={form.operational_areas}
                onChange={onChange}
                disabled={saving}
                placeholder="Ej: Santo Domingo, Punta Cana, Santiago"
              />
              <p className="text-xs text-muted-foreground">Separe las áreas con comas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Contacto corporativo */}
      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="font-serif text-xl">2. Contacto corporativo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="contact_person">Persona de contacto (nombre completo y cargo)</label>
            <Input
              id="contact_person"
              name="contact_person"
              value={form.contact_person}
              onChange={onChange}
              disabled={saving}
              placeholder="Ej: Juan Pérez, Gerente General"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="primary_phone">Teléfono de contacto principal</label>
            <Input
              id="primary_phone"
              name="primary_phone"
              value={form.primary_phone}
              onChange={onChange}
              disabled={saving}
              placeholder="+1 809 123 4567"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="secondary_phone">Teléfono secundario / WhatsApp</label>
            <Input
              id="secondary_phone"
              name="secondary_phone"
              value={form.secondary_phone}
              onChange={onChange}
              disabled={saving}
              placeholder="+1 809 987 6543"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Información legal */}
      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="font-serif text-xl">3. Información legal</CardTitle>
          <p className="text-sm text-muted-foreground">Documentación legal: licencias de construcción, permisos, etc.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <Button
              onClick={onPickLegalDocs}
              variant="outline"
              className="flex items-center gap-2 self-start"
              disabled={uploadingDocs || saving}
            >
              <Plus className="h-4 w-4" />
              {uploadingDocs ? "Subiendo..." : "Subir documentos legales"}
            </Button>
            <input
              ref={legalDocsInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              aria-label="Subir documentos legales PDF"
              onChange={(e) => onLegalDocsFile(e.target.files)}
            />
            <p className="text-xs text-muted-foreground">Solo archivos PDF. Tamaño máximo: 10MB por archivo.</p>
          </div>

          {/* Display uploaded documents */}
          {form.legal_documents && form.legal_documents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Documentos subidos:</h4>
              <div className="grid gap-2">
                {form.legal_documents.map((url, index) => {
                  const fileName = url.split('/').pop()?.split('_').slice(2).join('_') || `Documento ${index + 1}`;
                  return (
                    <div key={url} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm truncate max-w-[200px]">{fileName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadDocument(url, fileName)}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeDocument(url)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Redes y marketing */}
      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="font-serif text-xl">4. Redes y marketing</CardTitle>
          <p className="text-sm text-muted-foreground">Redes sociales corporativas y presencia digital</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="facebook_url">Facebook</label>
            <Input
              id="facebook_url"
              name="facebook_url"
              type="url"
              value={form.facebook_url}
              onChange={onChange}
              disabled={saving}
              placeholder="https://facebook.com/empresa"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="instagram_url">Instagram</label>
            <Input
              id="instagram_url"
              name="instagram_url"
              type="url"
              value={form.instagram_url}
              onChange={onChange}
              disabled={saving}
              placeholder="https://instagram.com/empresa"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="linkedin_url">LinkedIn</label>
            <Input
              id="linkedin_url"
              name="linkedin_url"
              type="url"
              value={form.linkedin_url}
              onChange={onChange}
              disabled={saving}
              placeholder="https://linkedin.com/company/empresa"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Términos y condiciones */}
      <Card className="rounded-2xl border shadow-md">
        <CardHeader>
          <CardTitle className="font-serif text-xl">5. Términos y condiciones</CardTitle>
          <p className="text-sm text-muted-foreground">Aceptación de términos para el uso de la plataforma</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <input
              id="terms_accepted"
              name="terms_accepted"
              type="checkbox"
              checked={form.terms_accepted}
              onChange={(e) => setForm(prev => ({ ...prev, terms_accepted: e.target.checked }))}
              disabled={saving}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#1C4B2E] focus:ring-[#1C4B2E]"
            />
            <div className="text-sm">
              <label htmlFor="terms_accepted" className="font-medium cursor-pointer">
                ✅ Acepto los términos y condiciones de uso de la plataforma *
              </label>
              <p className="text-muted-foreground mt-1">
                Al marcar esta casilla, acepto que la información proporcionada es veraz y me comprometo
                a mantener actualizada toda la documentación legal requerida para operar en la plataforma.
              </p>
            </div>
          </div>

          {!form.terms_accepted && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
              Debe aceptar los términos y condiciones para guardar los cambios.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-center">
        <Button
          onClick={onSave}
          disabled={saving || uploadingDocs || !form.terms_accepted}
          className="bg-[#1C4B2E] text-white hover:bg-[#163c25] px-8 py-3 text-lg"
        >
          {saving ? "Guardando cambios..." : "Guardar todos los cambios"}
        </Button>
      </div>
    </div>
  );
}
