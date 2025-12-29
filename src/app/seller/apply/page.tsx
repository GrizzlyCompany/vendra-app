"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Upload, Loader2, Building2, UserCircle2, BadgeCheck, Scale, ChevronLeft, AlertCircle, UserCheck } from "lucide-react";
import Link from "next/link";
import { DetailBackButton } from "@/components/transitions/DetailPageTransition";
import { useLanguage } from "@/components/LanguageProvider";
import { useTranslations } from "next-intl";

// Enhanced seller application form with premium Glassmorphism UI
export default function SellerApplyPage() {
  const { locale } = useLanguage();
  const t = useTranslations("forms.seller");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [appId, setAppId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState("cedula");
  const [idNumber, setIdNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [nationality, setNationality] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

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

  const requiresAgentData = useMemo(() => roleChoice === "agente_inmobiliario", [roleChoice]);
  const requiresCompanyData = useMemo(() => roleChoice === "empresa_constructora", [roleChoice]);

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
        setWebsiteUrl(existing.website_url ?? "");
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
        website_url: websiteUrl || null,
        role_choice: roleChoice,
        company_name: (requiresAgentData || requiresCompanyData) ? companyName : null,
        company_tax_id: (requiresAgentData || requiresCompanyData) ? companyTaxId : null,
        license_number: requiresAgentData ? licenseNumber : null,
        job_title: requiresAgentData ? jobTitle : null,
        owner_relation: (!requiresAgentData && !requiresCompanyData) ? ownerRelation : null,
        ownership_proof_url: (!requiresAgentData && !requiresCompanyData) ? ownershipProofUrl : null,
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
      setSuccess(t("status.draftSaved"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("status.errorTitle"));
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (!termsAccepted || !confirmTruth) throw new Error(t("status.termsError"));
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
        website_url: websiteUrl || null,
        role_choice: roleChoice,
        company_name: (requiresAgentData || requiresCompanyData) ? companyName : null,
        company_tax_id: (requiresAgentData || requiresCompanyData) ? companyTaxId : null,
        license_number: requiresAgentData ? licenseNumber : null,
        job_title: requiresAgentData ? jobTitle : null,
        owner_relation: (!requiresAgentData && !requiresCompanyData) ? ownerRelation : null,
        ownership_proof_url: (!requiresAgentData && !requiresCompanyData) ? ownershipProofUrl : null,
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

      // Update user role based on choice
      const newRole = roleChoice === 'agente_inmobiliario' ? 'agente' : roleChoice === 'empresa_constructora' ? 'empresa_constructora' : 'vendedor';

      if (userData.role === "comprador") {
        const { error: roleError } = await supabase
          .from('users')
          .update({ role: newRole })
          .eq('id', uid);

        if (roleError) {
          console.error("Error updating role:", roleError);
        } else {
          // Force session refresh or update local state if possible
          await supabase.auth.updateUser({ data: { role: newRole } });
        }
      }

      // ... inside component

      // Error handling
      // setError(t("status.errorTitle")) or just text

      // ...

      setSuccess(t("status.success"));

      // Short delay for user to see success message
      setTimeout(() => {
        router.push("/properties/new");
      }, 1500);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("status.errorTitle"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100dvh-64px)] bg-background px-4 sm:px-6 py-8 sm:py-12 mobile-bottom-safe mobile-horizontal-safe font-sans">
      <DetailBackButton className="mb-6 max-w-4xl mx-auto mobile-top-safe">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/">
            <ChevronLeft className="w-4 h-4" /> {t("actions.back")}
          </Link>
        </Button>
      </DetailBackButton>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mb-3">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto sm:mx-0">
            {t("subtitle")}
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

          <div className="grid md:grid-cols-[1fr_350px] gap-8 items-start">
            {/* Left Column: Form Sections */}
            <div className="space-y-6 sm:space-y-8">
              {/* Sección 1: Datos Personales */}
              <Card className="rounded-2xl border-border/40 shadow-sm bg-card/50 backdrop-blur-sm group overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                  <CardTitle className="text-xl font-serif flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                    1. Datos Personales
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.fullName")}</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t("placeholders.name")}
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.idType")}</Label>
                      <div className="relative">
                        <select
                          value={idType}
                          onChange={(e) => setIdType(e.target.value)}
                          className="w-full h-11 rounded-xl border border-input bg-background/50 px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer transition-all hover:bg-white/10"
                        >
                          <option value="cedula">Cédula de Identidad</option>
                          <option value="pasaporte">Pasaporte</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.idNumber")}</Label>
                      <Input
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        placeholder={t("placeholders.id")}
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.birthDate")}</Label>
                      <Input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.nationality")}</Label>
                      <Input
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        placeholder={t("placeholders.nationality")}
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sección 2: Contacto */}
              <Card className="rounded-2xl border-border/40 shadow-sm bg-card/50 backdrop-blur-sm group overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                  <CardTitle className="text-xl font-serif flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                    {t("sections.contact")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.phone")}</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t("placeholders.phone")}
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.email")}</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("placeholders.email")}
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.address")}</Label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={t("placeholders.address")}
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Sitio Web (Opcional)</Label>
                      <Input
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://tuempresa.com"
                        className="bg-background/50 h-11 rounded-xl transition-all"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sección 3: Perfil Profesional */}
              <Card className="rounded-2xl border-border/40 shadow-sm bg-card/50 backdrop-blur-sm group overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                  <CardTitle className="text-xl font-serif flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                    {t("sections.professional")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <button
                        type="button"
                        onClick={() => setRoleChoice('vendedor_particular')}
                        className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 shadow-sm group active:scale-[0.98] ${roleChoice === 'vendedor_particular'
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                          : 'border-border/40 bg-background/50 hover:border-primary/30 hover:bg-background/80'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-3 rounded-xl transition-all ${roleChoice === 'vendedor_particular' ? 'bg-primary text-white shadow-lg' : 'bg-primary/10 text-primary'}`}>
                            <UserCircle2 className="w-5 h-5" />
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${roleChoice === 'vendedor_particular' ? 'bg-primary border-primary scale-110' : 'border-muted-foreground/30'}`}>
                            {roleChoice === 'vendedor_particular' && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                        <span className="font-bold text-lg block mb-1">{t("roles.seller")}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t("roles.sellerDesc")}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoleChoice('agente_inmobiliario')}
                        className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 shadow-sm group active:scale-[0.98] ${roleChoice === 'agente_inmobiliario'
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                          : 'border-border/40 bg-background/50 hover:border-primary/30 hover:bg-background/80'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-3 rounded-xl transition-all ${roleChoice === 'agente_inmobiliario' ? 'bg-primary text-white shadow-lg' : 'bg-primary/10 text-primary'}`}>
                            <BadgeCheck className="w-5 h-5" />
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${roleChoice === 'agente_inmobiliario' ? 'bg-primary border-primary scale-110' : 'border-muted-foreground/30'}`}>
                            {roleChoice === 'agente_inmobiliario' && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                        <span className="font-bold text-lg block mb-1">{t("roles.agent")}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t("roles.agentDesc")}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoleChoice('empresa_constructora')}
                        className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 shadow-sm group active:scale-[0.98] sm:col-span-2 ${roleChoice === 'empresa_constructora'
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                          : 'border-border/40 bg-background/50 hover:border-primary/30 hover:bg-background/80'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-3 rounded-xl transition-all ${roleChoice === 'empresa_constructora' ? 'bg-primary text-white shadow-lg' : 'bg-primary/10 text-primary'}`}>
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${roleChoice === 'empresa_constructora' ? 'bg-primary border-primary scale-110' : 'border-muted-foreground/30'}`}>
                            {roleChoice === 'empresa_constructora' && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                        <span className="font-bold text-lg block mb-1">Empresa Constructora</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Si representas a una constructora o desarrolladora de proyectos inmobiliarios.
                        </p>
                      </button>
                    </div>

                    {(requiresAgentData || requiresCompanyData) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/40 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                            {requiresCompanyData ? "Nombre de la Empresa" : t("labels.agencyName")}
                          </Label>
                          <Input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder={requiresCompanyData ? "Ej. Constructora Ejemplo SRL" : t("placeholders.agency")}
                            className="bg-background/50 h-11 rounded-xl transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                            {requiresCompanyData ? "RNC" : t("labels.taxId")}
                          </Label>
                          <Input
                            value={companyTaxId}
                            onChange={(e) => setCompanyTaxId(e.target.value)}
                            placeholder={requiresCompanyData ? "Ej. 101-12345-6" : t("placeholders.taxId")}
                            className="bg-background/50 h-11 rounded-xl transition-all"
                          />
                        </div>
                        {requiresAgentData && (
                          <>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.license")}</Label>
                              <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder={t("placeholders.license")} className="bg-background/50 h-11 rounded-xl transition-all" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.jobTitle")}</Label>
                              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder={t("placeholders.jobTitle")} className="bg-background/50 h-11 rounded-xl transition-all" />
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/40 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.ownerRelation")}</Label>
                          <Input value={ownerRelation} onChange={(e) => setOwnerRelation(e.target.value)} placeholder={t("placeholders.relation")} className="bg-background/50 h-11 rounded-xl transition-all" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{t("labels.ownershipProof")}</Label>
                          <Input value={ownershipProofUrl} onChange={(e) => setOwnershipProofUrl(e.target.value)} placeholder={t("placeholders.proof")} className="bg-background/50 h-11 rounded-xl transition-all" />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sección 4: Documentación */}
              <Card className="rounded-2xl border-border/40 shadow-sm bg-card/50 backdrop-blur-sm group overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                  <CardTitle className="text-xl font-serif flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
                    {t("sections.docs")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                    {[
                      { label: t("labels.docFront"), state: docFrontUrl, setter: setDocFrontUrl },
                      { label: t("labels.docBack"), state: docBackUrl, setter: setDocBackUrl },
                      { label: t("labels.docSelfie"), state: selfieUrl, setter: setSelfieUrl },
                    ].map((doc, idx) => (
                      <div key={idx} className="space-y-4">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{doc.label}</Label>
                        <div className={`relative aspect-[4/3] rounded-2xl border-2 border-dashed transition-all duration-300 ${doc.state ? 'border-primary/50 bg-primary/5' : 'border-border/60 hover:border-primary/50 hover:bg-background/80'
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
                                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center mb-2 shadow-lg shadow-primary/20">
                                  <CheckCircle className="w-6 h-6" />
                                </div>
                                <span className="text-xs text-primary font-bold">{t("docs.uploaded")}</span>
                              </>
                            ) : (
                              <>
                                <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center mb-2">
                                  <Upload className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">{t("docs.clickToUpload")}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {doc.state && (
                          <a href={doc.state} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] text-primary font-bold hover:underline">
                            <BadgeCheck className="w-3 h-3" /> {t("docs.viewCurrent")}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Sticky Actions */}
            <div className="md:sticky md:top-24 h-fit space-y-6">
              <Card className="rounded-2xl border-border/40 shadow-lg bg-card/60 backdrop-blur-xl relative overflow-hidden group">
                <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                  <CardTitle className="font-serif font-black text-xl tracking-tight text-foreground/90">
                    {t("summary.title")}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs pb-3 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">{t("summary.requestedRole")}</span>
                      <Badge variant="outline" className="font-bold border-primary/20 bg-primary/10 text-primary rounded-lg">
                        {roleChoice === 'vendedor_particular' ? t("summary.seller") : roleChoice === 'agente_inmobiliario' ? t("summary.agent") : "Empresa Constructora"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">{t("summary.documents")}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1">
                          {[docFrontUrl, docBackUrl, selfieUrl].map((url, i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 border-white transition-all shadow-sm ${url ? 'bg-primary' : 'bg-muted/40'}`} />
                          ))}
                        </div>
                        <span className={`font-black ${docFrontUrl && docBackUrl && selfieUrl ? 'text-primary' : 'text-amber-500'}`}>
                          {[docFrontUrl, docBackUrl, selfieUrl].filter(Boolean).length}/3
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border/40">
                    <label className="flex items-start gap-3 text-[10px] cursor-pointer group/label">
                      <div className="pt-0.5">
                        <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${termsAccepted ? 'bg-primary border-primary' : 'border-border/60 bg-background/50'}`}>
                          <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className="absolute w-4 h-4 opacity-0 cursor-pointer"
                          />
                          {termsAccepted && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <span className="text-muted-foreground font-semibold leading-relaxed">
                        {t.rich("summary.terms", {
                          terms: (chunks) => <Link href="/terms" className="text-primary hover:underline font-bold">{chunks}</Link>,
                          privacy: (chunks) => <Link href="/privacy" className="text-primary hover:underline font-bold">{chunks}</Link>
                        })}
                      </span>
                    </label>

                    <label className="flex items-start gap-3 text-[10px] cursor-pointer group/label">
                      <div className="pt-0.5">
                        <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${confirmTruth ? 'bg-primary border-primary' : 'border-border/60 bg-background/50'}`}>
                          <input
                            type="checkbox"
                            checked={confirmTruth}
                            onChange={(e) => setConfirmTruth(e.target.checked)}
                            className="absolute w-4 h-4 opacity-0 cursor-pointer"
                          />
                          {confirmTruth && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <span className="text-muted-foreground font-semibold leading-relaxed">
                        {t("summary.truth")}
                      </span>
                    </label>
                  </div>

                  <div className="space-y-3 pt-6">
                    <Button
                      onClick={submit}
                      disabled={loading || !termsAccepted || !confirmTruth}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("actions.submit")}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={saveDraft}
                      disabled={loading}
                      className="w-full h-11 rounded-xl text-muted-foreground hover:text-primary transition-all text-xs font-bold hover:bg-primary/5"
                    >
                      {t("actions.saveDraft")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-[10px] text-blue-600/80 leading-relaxed text-center font-bold">
                <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                </div>
                <p>
                  {t("summary.protection")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}