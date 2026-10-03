import type { Metadata, Viewport } from "next";
import { DecorStage } from "@/components/decor-stage";
import { InlineScript } from "@/components/inline-script";
import { PageWrap } from "@/components/page-wrap";
import { PendingAttempts } from "@/components/pending-attempts";
import { PrefsProvider } from "@/components/providers/prefs-provider";
import { SceneProvider } from "@/components/providers/scene-provider";
import { SoundProvider } from "@/components/providers/sound-provider";
import { ServiceWorker } from "@/components/service-worker";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";
import { HOME_DECOR } from "@/lib/decors/registry";
import { PREFS_BOOT_SCRIPT } from "@/lib/prefs";
import "./styles/tokens.css";
import "./styles/decors.css";
import "./styles/layout.css";
import "./styles/quiz.css";
import "./styles/forms.css";

export const metadata: Metadata = {
  title: { default: "JuriQuizz", template: "%s · JuriQuizz" },
  description:
    "Quiz de révision pour la L1 de droit : chaque chapitre du cours, en trois niveaux, avec des explications détaillées.",
  applicationName: "JuriQuizz",
  appleWebApp: { capable: true, title: "JuriQuizz", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ece9e2" },
    { media: "(prefers-color-scheme: dark)", color: "#12141b" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  return (
    <html lang="fr" data-scene={HOME_DECOR} suppressHydrationWarning>
      <head>
        <InlineScript html={PREFS_BOOT_SCRIPT} />
      </head>
      <body>
        <a className="skip-link" href="#contenu">
          Aller au contenu
        </a>
        <PrefsProvider signedIn={viewer !== null} profilePrefs={viewer?.profilePrefs ?? null}>
          <SceneProvider>
            <SoundProvider>
              <DecorStage />
              <PageWrap>
                <SiteHeader viewer={viewer} />
                <main id="contenu" tabIndex={-1}>
                  {children}
                </main>
                <SiteFooter />
              </PageWrap>
            </SoundProvider>
          </SceneProvider>
        </PrefsProvider>
        <ServiceWorker />
        {viewer && <PendingAttempts userId={viewer.userId} />}
        <noscript>JuriQuizz a besoin de JavaScript pour les quiz.</noscript>
      </body>
    </html>
  );
}
