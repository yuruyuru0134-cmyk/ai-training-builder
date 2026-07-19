import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MaterialForm } from "./material-form";

// 章構成に加えて全章の台本・スライド画像もこのページのServer Action内で
// 自動生成するため、Next.jsのデフォルトタイムアウトでは足りない場合がある。
export const maxDuration = 300;

export default function NewMaterialPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>新規教材を作成</CardTitle>
          <CardDescription>
            テーマと所要時間を入力すると、AIが章構成・台本・スライド画像までまとめて生成します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaterialForm />
        </CardContent>
      </Card>
    </div>
  );
}
