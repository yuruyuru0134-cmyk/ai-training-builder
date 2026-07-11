import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  {
    title: "章構成を自動生成",
    description:
      "テーマと所要時間を入力するだけで、60分教材なら5〜8章の構成案をAIが提案します。",
  },
  {
    title: "台本を自動作成",
    description:
      "章ごとに、です・ます調・800字以内の読み上げ用台本を生成。文字数は自動でチェックされます。",
  },
  {
    title: "スライド画像も自動生成",
    description:
      "章の内容とトーンに合わせて、Geminiが1章あたり30秒以内にスライド画像を生成します。",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="text-sm font-semibold tracking-wide">
            AI研修教材オートビルダー
          </span>
          <Button render={<Link href="/login" />} size="sm">
            ログイン
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-24 text-center">
          <p className="text-sm font-medium tracking-wide text-primary uppercase">
            AI研修講師のための教材作成ツール
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            テーマを入力するだけで、
            <br />
            研修教材の下書きが完成します
          </h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            章構成・台本・スライド画像までを一気通貫で自動生成。
            <br />
            ゼロから教材を作るコストを、AIに任せましょう。
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button render={<Link href="/login" />} size="lg">
              無料で始める
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-24">
          <div className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {feature.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        AI研修教材オートビルダー
      </footer>
    </div>
  );
}
