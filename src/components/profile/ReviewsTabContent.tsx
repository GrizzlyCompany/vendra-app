"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { UserRating } from "@/features/properties/hooks/useUserRatings";

interface ReviewsTabContentProps {
  userId: string;
  ratings: UserRating[];
  myRating: number | null;
  myComment: string;
  showRateForm: boolean;
  isSubmitting: boolean;
  ratingCount: number;
  onSetMyRating: (rating: number) => void;
  onSetMyComment: (comment: string) => void;
  onSubmitRating: () => Promise<void>;
  onShowRateForm: (show: boolean) => void;
}

export function ReviewsTabContent({
  userId,
  ratings,
  myRating,
  myComment,
  showRateForm,
  isSubmitting,
  ratingCount,
  onSetMyRating,
  onSetMyComment,
  onSubmitRating,
  onShowRateForm,
}: ReviewsTabContentProps) {
  const router = useRouter();

  const handleRateClick = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const reviewer = sess.session?.user?.id ?? null;

    if (!reviewer) {
      router.push(`/login?redirect_url=/profile/${userId}`);
      return;
    }

    if (reviewer === userId) {
      alert('No puedes calificar tu propio perfil.');
      return;
    }

    onShowRateForm(true);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Valoraciones</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Rate form (toggle) */}
        {showRateForm && (
          <div className="mb-4 rounded-md border p-4">
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`p-1 rounded ${(myRating ?? 0) >= n ? 'text-amber-400' : 'text-muted-foreground'}`}
                  onClick={() => onSetMyRating(n)}
                  aria-label={`Calificar ${n}`}
                >
                  <Star className={`size-6 ${(myRating ?? 0) >= n ? 'fill-amber-400' : ''}`} />
                </button>
              ))}
            </div>
            <textarea
              className="w-full rounded-md border bg-background p-2 text-sm"
              placeholder="Escribe un comentario (opcional)"
              value={myComment}
              onChange={(e) => onSetMyComment(e.target.value)}
              rows={3}
            />
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="outline" onClick={() => onShowRateForm(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="button" onClick={onSubmitRating} disabled={isSubmitting || !myRating}>
                {isSubmitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        )}

        {!showRateForm && ratingCount === 0 && (
          <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
            Aún no hay valoraciones.
          </div>
        )}

        {/* Anonymous ratings list */}
        {!showRateForm && ratingCount > 0 && (
          <div className="space-y-3">
            {ratings.map((r, idx) => (
              <div key={idx} className="rounded-md border p-3">
                <div className="flex items-center gap-2 text-amber-500">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`size-4 ${n <= (Number(r.rating) || 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                  ))}
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{r.comment}</p>
                )}
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                  <span>Anónimo</span>
                  <span>•</span>
                  <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleDateString('es-ES')}</time>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show rate button if not showing form */}
        {!showRateForm && ratingCount > 0 && (
          <div className="mt-4">
            <Button type="button" variant="outline" onClick={handleRateClick}>
              <Star className="mr-2" /> Agregar calificación
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
