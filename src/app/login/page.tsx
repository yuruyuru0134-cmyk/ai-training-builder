import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 px-4 py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <Link
            href="/"
            className="text-sm font-medium tracking-wide text-primary uppercase"
          >
            AI研修教材オートビルダー
          </Link>
          <p className="text-sm text-muted-foreground">
            テーマを入力するだけで、教材の下書きが完成します
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>アカウント</CardTitle>
            <CardDescription>
              ログイン、または新規アカウントを作成してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">ログイン</TabsTrigger>
                <TabsTrigger value="signup">新規登録</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="pt-5">
                <LoginForm next={next} />
              </TabsContent>
              <TabsContent value="signup" className="pt-5">
                <SignupForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
