"use client";

import { useMutation } from "@tanstack/react-query";
import { LogIn, ShieldCheck, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { LocaleToggle } from "@/components/layout/locale-toggle";
import { useSession } from "@/components/providers/session-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { signUp } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

/** Aligné sur `UserCreate.password` côté backend (`backend/app/schemas/user.py`). */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Création de compte (v1.4 du contrat). Le rôle du compte créé est fixé par le
 * serveur — voir `docs/known-limitations.md` : il n'y a pas d'écran pour le choisir
 * tant que le backend n'expose pas de route pour le changer après coup.
 */
export function SignupForm() {
  const t = useTranslations("signup");
  const { user, signIn } = useSession();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const mutation = useMutation({
    mutationFn: () => signUp({ email, password, full_name: fullName.trim() || undefined }),
    onSuccess: (result) => {
      signIn(result.user, result.token);
      router.replace("/dashboard");
    },
  });

  const isEmailTaken =
    mutation.error instanceof ApiError &&
    (mutation.error.code === "EMAIL_TAKEN" ||
      (mutation.error.code === "BACKEND_ERROR" && mutation.error.status === 409));

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5" aria-hidden />
            <span className="text-sm font-semibold">{t("productName")}</span>
          </div>
          <LocaleToggle />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="full-name">{t("fullName")}</Label>
                <Input
                  id="full-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
              </div>

              {mutation.isError ? (
                <Alert variant="destructive">
                  <TriangleAlert aria-hidden />
                  <AlertDescription>
                    {isEmailTaken ? t("emailTaken") : t("failed")}
                  </AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                <LogIn aria-hidden />
                {mutation.isPending ? t("submitting") : t("submit")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
