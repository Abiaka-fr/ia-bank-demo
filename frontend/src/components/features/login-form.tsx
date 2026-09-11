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
import { landingRouteForUser } from "@/lib/access-profile";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export function LoginForm() {
  const t = useTranslations("login");
  const { user, signIn } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Déjà connecté (retour arrière depuis l'app) : on ne réaffiche pas le formulaire.
  useEffect(() => {
    if (user) router.replace(landingRouteForUser(user));
  }, [user, router]);

  const mutation = useMutation({
    mutationFn: () => login({ email, password }),
    onSuccess: (result) => {
      signIn(result.user, result.token);
      router.replace(landingRouteForUser(result.user));
    },
  });

  const isInvalidCredentials =
    mutation.error instanceof ApiError &&
    mutation.error.code === "INVALID_CREDENTIALS";

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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              {mutation.isError ? (
                <Alert variant="destructive">
                  <TriangleAlert aria-hidden />
                  <AlertDescription>
                    {isInvalidCredentials ? t("invalidCredentials") : t("failed")}
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
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("createAccount")}
          </Link>
        </p>
      </div>
    </div>
  );
}
