import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">確認リンクが無効です</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        リンクの有効期限が切れているか、既に使用されている可能性があります。もう一度ログイン画面からお試しください。
      </p>
      <Button render={<Link href="/login" />}>ログイン画面に戻る</Button>
    </main>
  );
}
